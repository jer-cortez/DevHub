import { createHash } from "node:crypto";
export const passwordDigest = (password: string) => createHash("md5").update(password).digest("hex");
