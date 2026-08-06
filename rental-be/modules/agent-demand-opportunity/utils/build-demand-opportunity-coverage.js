import { buildBufferedGeometry } from "../../../shared/geo/index.js";

export const buildDemandOpportunityCoverage = (area) => {
  if (["Polygon", "MultiPolygon"].includes(area.type)) {
    return area;
  }

  const { coverageMeters, ...geometry } = area;

  return buildBufferedGeometry(geometry, coverageMeters, {
    message: "Unable to create demand opportunity search coverage",
    code: "INVALID_DEMAND_OPPORTUNITY_AREA",
  });
};
