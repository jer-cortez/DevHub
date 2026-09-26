const OPERATORS = { add: (a, b) => a + b, subtract: (a, b) => a - b };
export function calculate(operation, a, b) {
  if (!Object.hasOwn(OPERATORS, operation)) throw new Error("unknown operation");
  return OPERATORS[operation](Number(a), Number(b));
}
