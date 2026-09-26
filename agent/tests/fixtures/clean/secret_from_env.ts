export function token(env: NodeJS.ProcessEnv) {
  if (!env.PAYMENT_TOKEN) throw new Error("PAYMENT_TOKEN is required");
  return env.PAYMENT_TOKEN;
}
