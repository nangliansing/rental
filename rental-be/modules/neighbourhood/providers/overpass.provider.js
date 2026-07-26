import { getEnvironment } from "../../../config/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import { buildOverpassQuery } from "../services/build-overpass-query.service.js";
import { normalizeOverpassResponse } from "../services/normalize-overpass-response.service.js";

const DEFAULT_OVERPASS_API_URLS = Object.freeze([
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
]);
const OVERPASS_TIMEOUT_MS = 25_000;

const buildOverpassApiUrls = (configuredUrl) => {
  if (!configuredUrl) {
    return [...DEFAULT_OVERPASS_API_URLS];
  }

  return [
    configuredUrl,
    ...DEFAULT_OVERPASS_API_URLS.filter((url) => url !== configuredUrl),
  ];
};

const fetchOverpassPayload = async ({ overpassApiUrl, query, signal }) => {
  const response = await fetch(overpassApiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "rental-be-neighbourhood/1.0",
    },
    body: new URLSearchParams({ data: query }),
    signal,
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !contentType.includes("json")) {
    throw new AppError(
      "Unable to fetch nearby places",
      503,
      "NEIGHBOURHOOD_UNAVAILABLE",
    );
  }

  return response.json();
};

export const queryOverpass = async ({ origin, fetchRadiusMeters }) => {
  const config = getEnvironment();
  const overpassApiUrls = buildOverpassApiUrls(
    config.neighbourhood?.overpassApiUrl,
  );
  const query = buildOverpassQuery({ origin, fetchRadiusMeters });
  let lastError = null;

  for (const overpassApiUrl of overpassApiUrls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

    try {
      const payload = await fetchOverpassPayload({
        overpassApiUrl,
        query,
        signal: controller.signal,
      });

      return normalizeOverpassResponse(payload);
    } catch (error) {
      lastError =
        error instanceof AppError
          ? error
          : new AppError(
              "Unable to fetch nearby places",
              503,
              "NEIGHBOURHOOD_UNAVAILABLE",
            );
    } finally {
      clearTimeout(timeout);
    }
  }

  throw (
    lastError ??
    new AppError(
      "Unable to fetch nearby places",
      503,
      "NEIGHBOURHOOD_UNAVAILABLE",
    )
  );
};
