import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../building-follow-notify.constants.js";
import { BUILDING_FOLLOWERS_MIN_PRICE_DROP_BAHT } from "../building-follow-notify.constants.js";

const isFiniteRent = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export const detectBuildingPriceDrop = ({
  oldMinRent,
  newMinRent,
  minDropBaht = BUILDING_FOLLOWERS_MIN_PRICE_DROP_BAHT,
} = {}) => {
  if (!isFiniteRent(oldMinRent) || !isFiniteRent(newMinRent)) {
    return null;
  }

  if (newMinRent >= oldMinRent) {
    return null;
  }

  if (oldMinRent - newMinRent < minDropBaht) {
    return null;
  }

  return {
    changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
    oldMinRent,
    newMinRent,
  };
};
