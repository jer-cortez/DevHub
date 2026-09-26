import { readFileSync } from "node:fs";
export const download = (name: string) => readFileSync("/srv/files/" + name);
