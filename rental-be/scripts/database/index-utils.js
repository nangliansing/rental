const RELEVANT_OPTIONS = Object.freeze([
  "collation",
  "expireAfterSeconds",
  "partialFilterExpression",
  "sparse",
  "unique",
]);

const normalizeValue = (value) => {
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, normalizeValue(nestedValue)]),
  );
};

const selectOptions = (options = {}) =>
  Object.fromEntries(
    RELEVANT_OPTIONS.filter((key) => options[key] !== undefined).map((key) => [
      key,
      normalizeValue(options[key]),
    ]),
  );

export const normalizeIndex = ({ key, keys, name, ...options }) => ({
  key: key || keys,
  name,
  options: selectOptions(options),
});

export const normalizeExpectedIndex = ([keys, options]) => ({
  key: keys,
  name: options.name,
  options: selectOptions(options),
});

export const indexSignature = (index) =>
  JSON.stringify({
    key: index.key,
    options: index.options,
  });

export const describeIndex = (index) =>
  `${JSON.stringify(index.key)} ${JSON.stringify(index.options)}`;
