import "dotenv/config";
import mongoose from "mongoose";

import Building from "../modules/building/building.model.js";
import { buildLineBufferGeometry } from "../shared/geo/build-line-buffer-geometry.js";

const collectPlanMetadata = (value, metadata = { indexes: new Set(), stages: new Set() }) => {
  if (Array.isArray(value)) {
    for (const item of value) collectPlanMetadata(item, metadata);
    return metadata;
  }

  if (!value || typeof value !== "object") return metadata;

  if (typeof value.stage === "string") metadata.stages.add(value.stage);
  if (typeof value.indexName === "string") metadata.indexes.add(value.indexName);

  for (const nestedValue of Object.values(value)) {
    collectPlanMetadata(nestedValue, metadata);
  }

  return metadata;
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });

  const sample = await Building.findOne({
    isActive: true,
    "location.type": "Point",
    "location.coordinates.0": { $type: "number" },
    "location.coordinates.1": { $type: "number" },
  })
    .select("location")
    .lean();

  if (!sample) {
    throw new Error("An active building with a valid point location is required");
  }

  const [longitude, latitude] = sample.location.coordinates;
  const searchArea = buildLineBufferGeometry(
    {
      type: "LineString",
      coordinates: [
        [longitude - 0.001, latitude],
        [longitude + 0.001, latitude],
      ],
    },
    500,
  );

  const explanation = await Building.collection
    .find({
      isActive: true,
      location: { $geoWithin: { $geometry: searchArea } },
    })
    .limit(20)
    .explain("executionStats");

  const metadata = collectPlanMetadata(explanation);
  const indexes = [...metadata.indexes].sort();
  const stages = [...metadata.stages].sort();
  const usesLocationIndex = indexes.some((name) =>
    name.toLowerCase().includes("location"),
  );

  console.log(
    JSON.stringify({
      name: "search buildings near lines",
      collection: Building.collection.name,
      indexes,
      stages,
      returned: explanation.executionStats?.nReturned ?? 0,
      keysExamined: explanation.executionStats?.totalKeysExamined ?? 0,
      documentsExamined: explanation.executionStats?.totalDocsExamined ?? 0,
      usesLocationIndex,
    }),
  );

  if (!usesLocationIndex) {
    throw new Error("Near-lines query did not use the location geospatial index");
  }
};

try {
  await run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
