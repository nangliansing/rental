import { getEnvironment } from "../../../config/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { roundCoordinate } from "../../../shared/geo/index.js";
import {
  GEOCODE_CACHE_COORDINATE_DECIMALS,
  GOOGLE_GEOCODING_TIMEOUT_MS,
} from "../geocode.constants.js";
import { mapGoogleReverseGeocodingResponse } from "../mappers/map-google-reverse-geocoding-response.js";

const GOOGLE_GEOCODING_API_URL =
  "https://maps.googleapis.com/maps/api/geocode/json";

export const queryGoogleReverseGeocoding = async ({ lat, lng }) => {
  const config = getEnvironment();

  if (!config.geocode.enabled) {
    throw new AppError(
      "Reverse geocoding is disabled",
      503,
      "GEOCODE_DISABLED",
    );
  }

  const apiKey = config.geocode.googleMapsApiKey;

  if (!apiKey) {
    throw new AppError(
      "Reverse geocoding is not configured",
      503,
      "GEOCODE_NOT_CONFIGURED",
    );
  }

  const roundedLat = roundCoordinate(lat, GEOCODE_CACHE_COORDINATE_DECIMALS);
  const roundedLng = roundCoordinate(lng, GEOCODE_CACHE_COORDINATE_DECIMALS);
  const url = new URL(GOOGLE_GEOCODING_API_URL);

  url.searchParams.set("latlng", `${roundedLat},${roundedLng}`);
  url.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_GEOCODING_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AppError(
        "Reverse geocoding is temporarily unavailable",
        503,
        "GEOCODE_UNAVAILABLE",
      );
    }

    const payload = await response.json();

    return mapGoogleReverseGeocodingResponse(payload, {
      includeProviderDetails: config.nodeEnv === "development",
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Reverse geocoding is temporarily unavailable",
      503,
      "GEOCODE_UNAVAILABLE",
    );
  } finally {
    clearTimeout(timeout);
  }
};
