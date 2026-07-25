import { validateIntegerRange } from "./number.validators.js";

export const validateDistanceMeters = (
  input,
  fieldName,
  { defaultValue, maxValue },
) => {
  const value = input === undefined ? defaultValue : input;
  return validateIntegerRange(value, fieldName, 1, maxValue);
};
