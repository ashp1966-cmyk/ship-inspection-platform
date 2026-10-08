// IMO number validation: 7 digits; multiply the first 6 digits by 7,6,5,4,3,2,
// sum them, and the last digit of the sum must equal the 7th digit (check digit).
export const IMO_FORMAT_MESSAGE = "IMO number must be exactly 7 digits.";
export const IMO_CHECK_DIGIT_MESSAGE = "Invalid IMO number: the check digit doesn't match.";

/** Returns an error message, or null when `imo` is a valid IMO number. */
export function imoError(imo: string): string | null {
  if (!/^\d{7}$/.test(imo)) return IMO_FORMAT_MESSAGE;
  const sum = [...imo.slice(0, 6)].reduce((acc, d, i) => acc + Number(d) * (7 - i), 0);
  return sum % 10 === Number(imo[6]) ? null : IMO_CHECK_DIGIT_MESSAGE;
}
