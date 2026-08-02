import { validateNullableObject } from "../../../shared/validators/index.js";
import { buildReverseGeocodeParams } from "../params/build-reverse-geocode-params.js";
import { resolveReverseGeocodeAddress } from "./resolve-reverse-geocode-address.service.js";

export const reverseGeocodeService = async ({
  bodyInput,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const params = buildReverseGeocodeParams(bodyInput);

  return resolveReverseGeocodeAddress({
    lat: params.lat,
    lng: params.lng,
    session,
  });
};
