// modules/listing/mappers/build-create-listing-record.js
import { validateObject } from "../../../shared/validators/index.js";

import {
  validateVisibility,
  validateIsForeignerAccepted,
  validateIsTM30Provided,
  validateRent,
  validateDeposit,
  validateMoveInCost,
  validateElectricRate,
  validateWaterRate,
  validateBedroomCount,
  validateBathroomCount,
  validateKitchenType,
  validateSize,
  validateContractMonths,
  validateOccupancy,
  validateIsCookingAllowed,
  validateIsPetAllowed,
  validateFacilities,
  validateMedia,
  validateDescription,
  validateListedBy,
  validateBuildingId,
} from "../listing.validation.js";

export const buildCreateListingRecord = (body, actorId) => {
  validateObject(body, "body");

  return {
    visibility: validateVisibility(body.visibility),

    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,

    isForeignerAccepted: validateIsForeignerAccepted(body.isForeignerAccepted),
    isTM30Provided: validateIsTM30Provided(body.isTM30Provided),

    rent: validateRent(body.rent),
    deposit: validateDeposit(body.deposit),
    moveInCost: validateMoveInCost(body.moveInCost),

    electricRate: validateElectricRate(body.electricRate),
    waterRate: validateWaterRate(body.waterRate),

    bedroomCount: validateBedroomCount(body.bedroomCount),
    bathroomCount: validateBathroomCount(body.bathroomCount),
    kitchenType: validateKitchenType(body.kitchenType),
    size: validateSize(body.size),

    contractMonths: validateContractMonths(body.contractMonths),
    occupancy: validateOccupancy(body.occupancy),

    isCookingAllowed: validateIsCookingAllowed(body.isCookingAllowed),
    isPetAllowed: validateIsPetAllowed(body.isPetAllowed),

    facilities: validateFacilities(body.facilities),
    media: validateMedia(body.media),
    description: validateDescription(body.description),

    listedBy: validateListedBy(actorId),
    buildingId: validateBuildingId(body.buildingId),
  };
};