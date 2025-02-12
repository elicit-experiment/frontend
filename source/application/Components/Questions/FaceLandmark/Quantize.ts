export const QUANTIZE_AMOUNT = 100000;

// Quantize to 6 significant figures, as an integer without a decimal place.
// This is done to same bytes over the wire and at-rest.
export function quantize(value: number): number {
  if (QUANTIZE_AMOUNT) {
    return Math.round(value * QUANTIZE_AMOUNT);
  } else {
    return value;
  }
}

export function unquantize(value: number): number {
  if (QUANTIZE_AMOUNT) {
    return value / QUANTIZE_AMOUNT;
  } else {
    return value;
  }
}
