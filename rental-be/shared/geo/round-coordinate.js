export const roundCoordinate = (value, decimalPlaces = 3) => {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
};
