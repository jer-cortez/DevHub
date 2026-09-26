const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
export function assign(target, key, value) {
  if (BLOCKED_KEYS.has(key)) throw new Error("invalid key");
  Object.defineProperty(target, key, { value, enumerable: true, configurable: true });
  return target;
}
