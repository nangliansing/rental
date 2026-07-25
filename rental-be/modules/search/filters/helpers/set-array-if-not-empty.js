export const setArrayIfNotEmpty = (doc, key, value) => {
  if (value.length > 0) {
    doc[key] = value;
  }
};