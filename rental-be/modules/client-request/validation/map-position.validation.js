import {
  validateNumberRange,
  validateObject,
} from "../../../shared/validators/index.js";

export const validateMapPosition = (input, fieldName = "position") => {
  validateObject(input, fieldName);

  return {
    lat: validateNumberRange(input.lat, `${fieldName}.lat`, -90, 90),
    lng: validateNumberRange(input.lng, `${fieldName}.lng`, -180, 180),
  };
};
