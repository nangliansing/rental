// modules/listing/utils/build-listing-availability-filter-match.js
import { LISTING_AVAILABILITY_FILTERS } from "../listing.constants.js";
import {
  getCalendarDateKeyInTimeZone,
  startOfCalendarDayInTimeZone,
} from "../../../shared/validators/date.validators.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getStartOfTomorrowBangkok(referenceDate = new Date()) {
  const todayKey = getCalendarDateKeyInTimeZone(referenceDate);
  const todayStart = startOfCalendarDayInTimeZone(todayKey);

  // Bangkok has no DST, so +1 calendar day is stable for listing availability.
  return new Date(todayStart.getTime() + MS_PER_DAY);
}

/**
 * Returns Mongo match fields for listing availability tabs (all / now / soon).
 * Does not set visibility; callers compose with their own public/owner scope.
 */
export const buildListingAvailabilityFilterMatch = (
  filter,
  referenceDate = new Date(),
) => {
  switch (filter) {
    case LISTING_AVAILABILITY_FILTERS.ALL:
      return {};

    case LISTING_AVAILABILITY_FILTERS.NOW: {
      const tomorrowStart = getStartOfTomorrowBangkok(referenceDate);

      return {
        availableAt: { $ne: null, $lt: tomorrowStart },
      };
    }

    case LISTING_AVAILABILITY_FILTERS.SOON: {
      const tomorrowStart = getStartOfTomorrowBangkok(referenceDate);

      return {
        availableAt: { $gte: tomorrowStart },
      };
    }

    default:
      return {};
  }
};
