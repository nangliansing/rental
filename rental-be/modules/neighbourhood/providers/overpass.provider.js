import { getEnvironment } from "../../../config/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import { buildOverpassQuery } from "../services/build-overpass-query.service.js";
import { normalizeOverpassResponse } from "../services/normalize-overpass-response.service.js";

const DEFAULT_OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";
const OVERPASS_TIMEOUT_MS = 8_000;

export const queryOverpass = async ({ origin, fetchRadiusMeters }) => {
  const config = getEnvironment();
  const overpassApiUrl =
    config.neighbourhood?.overpassApiUrl ?? DEFAULT_OVERPASS_API_URL;
  const query = buildOverpassQuery({ origin, fetchRadiusMeters });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

  try {
    const response = await fetch(overpassApiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "rental-be-neighbourhood/1.0",
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AppError(
        "Unable to fetch nearby places",
        503,
        "NEIGHBOURHOOD_UNAVAILABLE",
      );
    }

    const payload = await response.json();
    return normalizeOverpassResponse(payload);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Unable to fetch nearby places",
      503,
      "NEIGHBOURHOOD_UNAVAILABLE",
    );
  } finally {
    clearTimeout(timeout);
  }
};
