import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
export const download = (name: string) => readFileSync(join("/srv/files", basename(name)));
