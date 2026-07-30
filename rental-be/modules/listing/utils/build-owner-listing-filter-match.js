// modules/listing/utils/build-owner-listing-filter-match.js
import {
  LISTING_VISIBILITIES,
  OWNER_LISTING_FILTERS,
} from "../listing.constants.js";
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
 * Returns Mongo match fields for GET /api/v1/listings?filter=...
 * Merge into the base owner match: { listedBy, isDeleted: false }.
 */
export const buildOwnerListingFilterMatch = (
  filter,
  referenceDate = new Date(),
) => {
  switch (filter) {
    case OWNER_LISTING_FILTERS.ALL:
      return {};

    case OWNER_LISTING_FILTERS.PRIVATE:
      return { visibility: LISTING_VISIBILITIES.PRIVATE };

    case OWNER_LISTING_FILTERS.NOW: {
      const tomorrowStart = getStartOfTomorrowBangkok(referenceDate);

      return {
        visibility: LISTING_VISIBILITIES.PUBLIC,
        availableAt: { $ne: null, $lt: tomorrowStart },
      };
    }

    case OWNER_LISTING_FILTERS.SOON: {
      const tomorrowStart = getStartOfTomorrowBangkok(referenceDate);

      return {
        visibility: LISTING_VISIBILITIES.PUBLIC,
        availableAt: { $gte: tomorrowStart },
      };
    }

    default:
      return {};
  }
};
