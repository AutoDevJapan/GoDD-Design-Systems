// Keep the exact decimal value when Number would change it on serialization.
const exactNumbers = Symbol("exact JSON numbers");

function canonicalDecimal(token) {
  const [mantissa, exponent = "0"] = token.toLowerCase().split("e");
  const negative = mantissa.startsWith("-");
  const unsigned = negative ? mantissa.slice(1) : mantissa;
  const [integer, fraction = ""] = unsigned.split(".");
  const digits = (integer + fraction).replace(/^0+/, "");
  if (digits === "") return "0";

  // Adjust the exponent instead of expanding it into a string of zeroes.
  let end = digits.length;
  while (digits[end - 1] === "0") end--;
  const scale = BigInt(exponent) + BigInt(digits.length - end - fraction.length);
  const coefficient = (negative ? "-" : "") + digits.slice(0, end);
  return scale === 0n ? coefficient : coefficient + "e" + scale;
}

export function preserveJsonNumber(key, value, context) {
  if (typeof value !== "number") return value;
  const token = context?.source;
  if (token === undefined) {
    throw new Error("JSON number source requires Node.js 22 or later");
  }

  const serialized = String(value);
  if (token !== serialized) {
    const exact = canonicalDecimal(token);
    if (!Number.isFinite(value) || exact !== canonicalDecimal(serialized)) {
      // Deep strict equality also compares these enumerable symbol properties.
      this[exactNumbers] ??= new Map();
      this[exactNumbers].set(key, exact);
    }
  }
  return value === 0 ? 0 : value;
}

export function jsonNumberForComparison(object, key) {
  // A retained decimal differs from the rounded value and cannot match a Number.
  return object[exactNumbers]?.get(key) ?? object[key];
}

export function serializeJsonNumber(key, value) {
  const exact = this[exactNumbers]?.get(key);
  return exact === undefined ? value : JSON.rawJSON(exact);
}
