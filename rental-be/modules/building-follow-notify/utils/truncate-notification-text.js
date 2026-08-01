export const truncateNotificationText = (value, maxLength) => {
  if (typeof value !== "string") {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
};
