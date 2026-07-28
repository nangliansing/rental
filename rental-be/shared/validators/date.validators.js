import { AppError } from "../errors/app-error.js";

export const LISTING_AVAILABILITY_TIME_ZONE = "Asia/Bangkok";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const getCalendarDateKeyInTimeZone = (
  date,
  timeZone = LISTING_AVAILABILITY_TIME_ZONE,
) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export const startOfCalendarDayInTimeZone = (
  dateKey,
  timeZone = LISTING_AVAILABILITY_TIME_ZONE,
) => {
  if (timeZone !== LISTING_AVAILABILITY_TIME_ZONE) {
    throw new Error(`Unsupported time zone: ${timeZone}`);
  }

  return new Date(`${dateKey}T00:00:00+07:00`);
};

export const validateNullableDateAtStartOfDay = (
  input,
  fieldName,
  timeZone = LISTING_AVAILABILITY_TIME_ZONE,
) => {
  if (input === undefined || input === null) {
    return null;
  }

  let parsed;

  if (typeof input === "string") {
    const trimmed = input.trim();

    if (!trimmed) {
      throw new AppError(
        `${fieldName} must be a valid date`,
        422,
        "VALIDATION_ERROR",
      );
    }

    parsed = DATE_ONLY_PATTERN.test(trimmed)
      ? new Date(`${trimmed}T00:00:00+07:00`)
      : new Date(trimmed);
  } else if (input instanceof Date) {
    parsed = input;
  } else {
    throw new AppError(
      `${fieldName} must be a valid date`,
      422,
      "VALIDATION_ERROR",
    );
  }

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(
      `${fieldName} must be a valid date`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const dateKey = getCalendarDateKeyInTimeZone(parsed, timeZone);

  return startOfCalendarDayInTimeZone(dateKey, timeZone);
};
