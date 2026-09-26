import { scryptSync, randomBytes } from "node:crypto";
export const passwordDigest = (password: string) => {
  const salt = randomBytes(16);
  return { salt: salt.toString("hex"), digest: scryptSync(password, salt, 64).toString("hex") };
};
