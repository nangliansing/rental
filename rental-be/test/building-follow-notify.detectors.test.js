import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { detectBuildingPriceDrop } from "../modules/building-follow-notify/detectors/detect-building-price-drop.js";
import { detectNewPublicListing } from "../modules/building-follow-notify/detectors/detect-new-public-listing.js";
import { detectListingAvailableAgain } from "../modules/building-follow-notify/detectors/detect-listing-available-again.js";
import { isNotifyEligibleListing } from "../modules/building-follow-notify/utils/is-notify-eligible-listing.js";
import {
  isListingAvailableNow,
  wasListingUnavailableNow,
} from "../modules/building-follow-notify/utils/listing-availability-state.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import { startOfCalendarDayInTimeZone } from "../shared/validators/index.js";

describe("building follower notification detectors", () => {
  test("detectBuildingPriceDrop ignores null rents and increases", () => {
    assert.equal(detectBuildingPriceDrop({ oldMinRent: null, newMinRent: 5000 }), null);
    assert.equal(detectBuildingPriceDrop({ oldMinRent: 6000, newMinRent: null }), null);
    assert.equal(detectBuildingPriceDrop({ oldMinRent: 6000, newMinRent: 6500 }), null);
    assert.equal(detectBuildingPriceDrop({ oldMinRent: 6000, newMinRent: 5999 }), null);
  });

  test("detectBuildingPriceDrop detects meaningful drops", () => {
    const result = detectBuildingPriceDrop({
      oldMinRent: 7000,
      newMinRent: 5500,
      minDropBaht: 100,
    });

    assert.deepEqual(result, {
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
      oldMinRent: 7000,
      newMinRent: 5500,
    });
  });

  test("isNotifyEligibleListing requires public and not deleted", () => {
    assert.equal(
      isNotifyEligibleListing({
        visibility: LISTING_VISIBILITIES.PUBLIC,
        isDeleted: false,
      }),
      true,
    );

    assert.equal(
      isNotifyEligibleListing({
        visibility: LISTING_VISIBILITIES.PRIVATE,
        isDeleted: false,
      }),
      false,
    );

    assert.equal(
      isNotifyEligibleListing({
        visibility: LISTING_VISIBILITIES.PUBLIC,
        isDeleted: true,
      }),
      false,
    );
  });

  test("detectNewPublicListing returns null for private listings", () => {
    const buildingId = new mongoose.Types.ObjectId();

    assert.equal(
      detectNewPublicListing({
        listing: {
          _id: new mongoose.Types.ObjectId(),
          buildingId,
          visibility: LISTING_VISIBILITIES.PRIVATE,
          isDeleted: false,
          rent: 5000,
        },
        buildingName: "Test Tower",
      }),
      null,
    );
  });

  test("detectNewPublicListing captures public listing metadata", () => {
    const buildingId = new mongoose.Types.ObjectId();
    const listingId = new mongoose.Types.ObjectId();
    const listedBy = new mongoose.Types.ObjectId();

    const result = detectNewPublicListing({
      listing: {
        _id: listingId,
        buildingId,
        listedBy,
        visibility: LISTING_VISIBILITIES.PUBLIC,
        isDeleted: false,
        rent: 5200,
        availableAt: null,
      },
      buildingName: "Test Tower",
    });

    assert.equal(result.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING);
    assert.equal(result.buildingId.toString(), buildingId.toString());
    assert.equal(result.listingId.toString(), listingId.toString());
    assert.equal(result.rent, 5200);
    assert.equal(result.excludeUserId.toString(), listedBy.toString());
  });

  test("detectListingAvailableAgain detects private to public transition", () => {
    const listingId = new mongoose.Types.ObjectId();
    const buildingId = new mongoose.Types.ObjectId();

    const result = detectListingAvailableAgain({
      before: {
        visibility: LISTING_VISIBILITIES.PRIVATE,
        availableAt: null,
      },
      after: {
        _id: listingId,
        buildingId,
        visibility: LISTING_VISIBILITIES.PUBLIC,
        isDeleted: false,
        rent: 4800,
        availableAt: null,
      },
    });

    assert.equal(result.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN);
    assert.equal(result.becamePublic, true);
    assert.equal(result.availabilityChanged, false);
  });

  test("detectListingAvailableAgain detects future availability becoming now", () => {
    const listingId = new mongoose.Types.ObjectId();
    const buildingId = new mongoose.Types.ObjectId();
    const referenceDate = startOfCalendarDayInTimeZone("2026-08-15");
    const futureAvailableAt = startOfCalendarDayInTimeZone("2026-09-01");

    assert.equal(wasListingUnavailableNow(futureAvailableAt, referenceDate), true);
    assert.equal(isListingAvailableNow(futureAvailableAt, referenceDate), false);

    const result = detectListingAvailableAgain({
      before: {
        visibility: LISTING_VISIBILITIES.PUBLIC,
        availableAt: futureAvailableAt,
      },
      after: {
        _id: listingId,
        buildingId,
        visibility: LISTING_VISIBILITIES.PUBLIC,
        isDeleted: false,
        rent: 4800,
        availableAt: referenceDate,
      },
      referenceDate,
    });

    assert.equal(result.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN);
    assert.equal(result.becamePublic, false);
    assert.equal(result.availabilityChanged, true);
  });
});
