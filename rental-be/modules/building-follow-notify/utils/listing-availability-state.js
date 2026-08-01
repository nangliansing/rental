import {
  getCalendarDateKeyInTimeZone,
  startOfCalendarDayInTimeZone,
} from "../../../shared/validators/index.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getStartOfTomorrowBangkok = (referenceDate = new Date()) => {
  const todayKey = getCalendarDateKeyInTimeZone(referenceDate);
  const todayStart = startOfCalendarDayInTimeZone(todayKey);

  return new Date(todayStart.getTime() + MS_PER_DAY);
};

const toDate = (value) => {
  if (value == null) return null;
  if (value instanceof Date) return value;

  return new Date(value);
};

export const isListingAvailableNow = (availableAt, referenceDate = new Date()) => {
  const normalized = toDate(availableAt);

  if (normalized == null) {
    return true;
  }

  const tomorrowStart = getStartOfTomorrowBangkok(referenceDate);

  return normalized < tomorrowStart;
};

export const wasListingUnavailableNow = (
  availableAt,
  referenceDate = new Date(),
) => {
  return !isListingAvailableNow(availableAt, referenceDate);
};
