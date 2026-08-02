import {
  validateNumberRange,
  validateObject,
} from "../../../shared/validators/index.js";

export const buildReverseGeocodeParams = (body) => {
  validateObject(body, "body");

  return {
    lat: validateNumberRange(body.lat, "lat", -90, 90),
    lng: validateNumberRange(body.lng, "lng", -180, 180),
  };
};
