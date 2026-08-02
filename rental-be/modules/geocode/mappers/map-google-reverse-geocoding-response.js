import { AppError } from "../../../shared/errors/app-error.js";

const GOOGLE_GEOCODING_STATUS = Object.freeze({
  OK: "OK",
  ZERO_RESULTS: "ZERO_RESULTS",
  REQUEST_DENIED: "REQUEST_DENIED",
});

const readGoogleErrorMessage = (payload) => {
  const errorMessage =
    typeof payload.error_message === "string" ? payload.error_message.trim() : "";

  return errorMessage;
};

export const mapGoogleReverseGeocodingResponse = (
  payload,
  { includeProviderDetails = false } = {},
) => {
  if (!payload || typeof payload !== "object") {
    throw new AppError(
      "Reverse geocoding response is invalid",
      502,
      "GEOCODE_PROVIDER_ERROR",
    );
  }

  const status = typeof payload.status === "string" ? payload.status : "";

  if (status === GOOGLE_GEOCODING_STATUS.ZERO_RESULTS) {
    throw new AppError(
      "No address was found for the provided coordinates",
      404,
      "GEOCODE_NOT_FOUND",
    );
  }

  if (status === GOOGLE_GEOCODING_STATUS.REQUEST_DENIED) {
    const googleMessage = readGoogleErrorMessage(payload);
    const message =
      includeProviderDetails && googleMessage
        ? `Reverse geocoding was denied by Google: ${googleMessage}`
        : "Reverse geocoding API key was rejected. Use a server-restricted Google Maps API key with the Geocoding API enabled.";

    throw new AppError(message, 503, "GEOCODE_REQUEST_DENIED");
  }

  if (status !== GOOGLE_GEOCODING_STATUS.OK) {
    throw new AppError(
      "Reverse geocoding is temporarily unavailable",
      503,
      "GEOCODE_UNAVAILABLE",
    );
  }

  const firstResult = Array.isArray(payload.results) ? payload.results[0] : null;
  const formattedAddress =
    typeof firstResult?.formatted_address === "string"
      ? firstResult.formatted_address.trim()
      : "";
  const placeId =
    typeof firstResult?.place_id === "string" ? firstResult.place_id : null;

  if (!formattedAddress) {
    throw new AppError(
      "Reverse geocoding response is missing required data",
      502,
      "GEOCODE_PROVIDER_ERROR",
    );
  }

  return {
    formattedAddress,
    placeId,
  };
};
