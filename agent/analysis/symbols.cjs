#!/usr/bin/env node
"use strict";

// This helper deliberately does not load tsconfig files, compiler plugins, or
// repository JavaScript. TypeScript is used only as a parser and type checker.
const fs = require("fs");
const path = require("path");

let ts;
try {
  ts = require("/opt/audit/node_modules/typescript");
} catch (_) {
  try {
    ts = require("typescript");
  } catch (error) {
    process.stderr.write(`TypeScript is unavailable: ${error.message}\n`);
    process.exit(2);
  }
}

const EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]);
const IGNORED = new Set([
  ".git", ".hg", ".svn", ".next", ".nuxt", ".output", ".turbo", ".cache",
  "node_modules", "bower_components", "coverage", "dist", "build", "generated", "vendor",
]);
const MAX_SCAN_FILES = 2500;
const MAX_SCAN_BYTES = 20 * 1024 * 1024;
const MAX_SOURCE_BYTES = 1024 * 1024;

function limitation(code, message, file) {
  const result = { code, message };
  if (file) result.path = file;
  return result;
}

function readRequest() {
  const input = fs.readFileSync(0, "utf8");
  if (input.length > 1_000_000) throw new Error("request is too large");
  return JSON.parse(input);
}

function normalizedRelative(workspace, filename) {
  let relative = path.relative(workspace, filename).split(path.sep).join("/");
  if (!relative || relative === ".." || relative.startsWith("../") || path.isAbsolute(relative)) return null;
  const parts = relative.split("/");
  if (parts.some((part) => IGNORED.has(part.toLowerCase()))) return null;
  return relative;
}

function walkSources(workspace, limitations) {
  const found = [];
  const pending = [workspace];
  let scannedBytes = 0;
  let budgetReached = false;
  while (pending.length && found.length < MAX_SCAN_FILES) {
    const directory = pending.pop();
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      limitations.push(limitation("scan-error", `cannot inspect directory: ${error.message}`, normalizedRelative(workspace, directory) || undefined));
      continue;
    }
    entries.sort((a, b) => b.name.localeCompare(a.name));
    for (const entry of entries) {
      if (IGNORED.has(entry.name.toLowerCase()) || entry.isSymbolicLink()) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        let size;
        try { size = fs.statSync(absolute).size; } catch (error) {
          limitations.push(limitation("scan-error", `cannot inspect source: ${error.message}`, normalizedRelative(workspace, absolute) || undefined));
          continue;
        }
        if (size > MAX_SOURCE_BYTES) {
          if (limitations.length < 200) limitations.push(limitation("large-file-skipped", `semantic analysis skips files larger than ${MAX_SOURCE_BYTES} bytes`, normalizedRelative(workspace, absolute) || undefined));
          continue;
        }
        if (scannedBytes + size > MAX_SCAN_BYTES) {
          budgetReached = true;
          break;
        }
        scannedBytes += size;
        found.push(absolute);
      }
      if (found.length >= MAX_SCAN_FILES) break;
    }
    if (budgetReached) break;
  }
  if (found.length >= MAX_SCAN_FILES || budgetReached) {
    limitations.push(limitation("scan-budget-exceeded", `semantic scan stopped at ${MAX_SCAN_FILES} files or ${MAX_SCAN_BYTES} bytes`));
  }
  return found;
}

function declarationName(node, sourceFile) {
  if (node.name && typeof node.name.getText === "function") return node.name.getText(sourceFile);
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && node.parent && ts.isVariableDeclaration(node.parent)) {
    return node.parent.name.getText(sourceFile);
  }
  if (ts.isConstructorDeclaration(node)) return "constructor";
  return null;
}

function declarationKind(node) {
  if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) return "method";
  if (ts.isConstructorDeclaration(node)) return "constructor";
  if (ts.isClassDeclaration(node)) return "class";
  if (ts.isInterfaceDeclaration(node)) return "interface";
  if (ts.isTypeAliasDeclaration(node)) return "type";
  if (ts.isEnumDeclaration(node)) return "enum";
  return "function";
}

function isSymbolDeclaration(node) {
  return ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isMethodSignature(node) ||
    ts.isConstructorDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) ||
    ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && node.parent && ts.isVariableDeclaration(node.parent));
}

function isCallableDeclaration(node) {
  return ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) ||
    ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

function exported(node) {
  const target = node.parent && ts.isVariableDeclaration(node.parent) ? node.parent.parent.parent : node;
  return Boolean(target.modifiers && target.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function position(sourceFile, node) {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile, false));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return { start_line: start.line + 1, start_column: start.character + 1, end_line: end.line + 1 };
}

function symbolId(relative, node, name, sourceFile) {
  const pos = position(sourceFile, node);
  return `${relative}:${pos.start_line}:${pos.start_column}:${name}`;
}

function enclosingCallable(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (isCallableDeclaration(current)) return current;
  }
  return null;
}

function main() {
  const request = readRequest();
  if (!request || typeof request !== "object" || !Array.isArray(request.changed_files)) throw new Error("invalid request");
  const workspace = fs.realpathSync(String(request.workspace || "/workspace"));
  const maxFiles = Math.max(1, Math.min(Number.isInteger(request.max_files) ? request.max_files : 100, 100));
  const limitations = [];
  const changed = new Set(request.changed_files.filter((item) => typeof item === "string"));
  const candidates = walkSources(workspace, limitations);
  const options = {
    allowJs: true,
    checkJs: false,
    noEmit: true,
    noLib: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    target: ts.ScriptTarget.ES2022,
  };
  const program = ts.createProgram({ rootNames: candidates, options });
  const checker = program.getTypeChecker();
  const records = [];
  const recordByNode = new Map();
  const recordByDeclaration = new Map();
  const sourceByRelative = new Map();

  for (const sourceFile of program.getSourceFiles()) {
    const relative = normalizedRelative(workspace, sourceFile.fileName);
    if (!relative || sourceFile.isDeclarationFile) continue;
    sourceByRelative.set(relative, sourceFile);
    function visit(node) {
      if (isSymbolDeclaration(node)) {
        const name = declarationName(node, sourceFile);
        if (name) {
          const record = {
            id: symbolId(relative, node, name, sourceFile), name, kind: declarationKind(node), path: relative,
            ...position(sourceFile, node), changed: changed.has(relative), exported: exported(node), source: "typescript",
          };
          records.push(record);
          recordByNode.set(node, record);
          let symbol;
          try {
            const nameNode = node.name || (node.parent && ts.isVariableDeclaration(node.parent) ? node.parent.name : undefined);
            symbol = nameNode ? checker.getSymbolAtLocation(nameNode) : undefined;
          } catch (_) {}
          if (symbol) {
            if (symbol.flags & ts.SymbolFlags.Alias) {
              try { symbol = checker.getAliasedSymbol(symbol); } catch (_) {}
            }
            for (const declaration of symbol.declarations || []) recordByDeclaration.set(declaration, record);
          }
          recordByDeclaration.set(node, record);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  const allEdges = [];
  for (const [relative, sourceFile] of sourceByRelative) {
    function visit(node) {
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const callerNode = enclosingCallable(node);
        const caller = callerNode ? recordByNode.get(callerNode) : undefined;
        const expression = node.expression;
        let target;
        try {
          let symbol = checker.getSymbolAtLocation(expression);
          if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
          if (symbol) {
            for (const declaration of symbol.declarations || []) {
              target = recordByDeclaration.get(declaration);
              if (target) break;
            }
          }
          if (!target) {
            const signature = checker.getResolvedSignature(node);
            const declaration = signature && signature.getDeclaration();
            if (declaration) target = recordByDeclaration.get(declaration);
          }
        } catch (_) {}
        const callPosition = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile, false));
        const display = expression.getText(sourceFile).slice(0, 200);
        allEdges.push({
          from: caller ? caller.id : null,
          to: target ? target.id : null,
          kind: ts.isNewExpression(node) ? "construct" : "call",
          resolved: Boolean(target),
          unresolved: target ? null : display,
          path: relative,
          line: callPosition.line + 1,
          column: callPosition.character + 1,
        });
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  const selectedSymbolIds = new Set(records.filter((record) => changed.has(record.path)).map((record) => record.id));
  for (const edge of allEdges) {
    if ((edge.from && selectedSymbolIds.has(edge.from)) || (edge.to && selectedSymbolIds.has(edge.to)) || changed.has(edge.path)) {
      if (edge.from) selectedSymbolIds.add(edge.from);
      if (edge.to) selectedSymbolIds.add(edge.to);
    }
  }
  const selectedPaths = new Set(changed);
  for (const record of records) if (selectedSymbolIds.has(record.id)) selectedPaths.add(record.path);
  for (const edge of allEdges) {
    if ((edge.from && selectedSymbolIds.has(edge.from)) || (edge.to && selectedSymbolIds.has(edge.to))) selectedPaths.add(edge.path);
  }

  const files = [...selectedPaths].filter((relative) => sourceByRelative.has(relative) || changed.has(relative));
  files.sort((a, b) => Number(changed.has(b)) - Number(changed.has(a)) || a.localeCompare(b));
  if (files.length > maxFiles) limitations.push(limitation("file-budget-exceeded", `semantic result was limited to ${maxFiles} files`));
  const boundedFiles = files.slice(0, maxFiles);
  const allowed = new Set(boundedFiles);
  const symbols = records.filter((record) => allowed.has(record.path) && (changed.has(record.path) || selectedSymbolIds.has(record.id)));
  const allowedIds = new Set(symbols.map((record) => record.id));
  const edges = allEdges.filter((edge) => allowed.has(edge.path) && (
    changed.has(edge.path) || (edge.from && allowedIds.has(edge.from)) || (edge.to && allowedIds.has(edge.to))
  ));
  process.stdout.write(JSON.stringify({ files: boundedFiles, symbols, edges, limitations }));
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
}
