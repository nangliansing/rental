import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isNotifyEligibleListing } from "../modules/building-follow-notify/utils/is-notify-eligible-listing.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";

describe("isNotifyEligibleListing", () => {
  test("requires public visibility and not deleted", () => {
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
});
