/** Matches: optional +, then digits/spaces/dashes/parens, 7–20 chars */
const PHONE_FORMAT = /^\+?[\d\s\-()]{7,20}$/;

/** Returns an error message or empty string if valid. Pass allowEmpty=true for optional fields. */
export function validatePhone(value: string, allowEmpty = false): string {
  if (!value.trim()) return allowEmpty ? "" : "Phone number is required";
  if (!PHONE_FORMAT.test(value)) return "Invalid phone format";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return "Phone must have at least 7 digits";
  if (digits.length > 15) return "Phone must have at most 15 digits";
  return "";
}

/** Zod-compatible refinement for required phone */
export const phoneSchema = {
  regex: PHONE_FORMAT,
  message: "Invalid phone format (digits, spaces, dashes, + allowed)",
};
