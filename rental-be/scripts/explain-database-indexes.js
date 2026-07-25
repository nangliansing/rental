import "dotenv/config";
import mongoose from "mongoose";

import BuildingEditRequest from "../modules/building-edit-request/building-edit-request.model.js";
import Listing from "../modules/listing/listing.model.js";
import Report from "../modules/report/report.model.js";
import ReviewReport from "../modules/review-report/review-report.model.js";
import Suspension from "../modules/suspension/suspension.model.js";
import User from "../modules/user/user.model.js";

const collectStages = (value, stages = new Set()) => {
  if (Array.isArray(value)) {
    for (const item of value) collectStages(item, stages);
    return stages;
  }

  if (!value || typeof value !== "object") return stages;
  if (typeof value.stage === "string") stages.add(value.stage);
  for (const nestedValue of Object.values(value)) {
    collectStages(nestedValue, stages);
  }
  return stages;
};

const explainCases = [
  {
    name: "platform administrator timeline",
    model: User,
    filter: { role: { $in: ["OWNER", "ADMIN"] } },
    sort: { role: 1, createdAt: -1, _id: 1 },
    hint: { role: 1, createdAt: -1, _id: 1 },
  },
  {
    name: "unfiltered report queue",
    model: Report,
    filter: { targetType: "LISTING" },
    sort: { createdAt: -1, _id: 1 },
    hint: { targetType: 1, createdAt: -1, _id: 1 },
  },
  {
    name: "unfiltered review-report queue",
    model: ReviewReport,
    filter: { isDeleted: false },
    sort: { createdAt: -1, _id: 1 },
    hint: { isDeleted: 1, createdAt: -1, _id: 1 },
  },
  {
    name: "unfiltered suspension timeline",
    model: Suspension,
    filter: {},
    sort: { createdAt: -1, _id: 1 },
    hint: { createdAt: -1, _id: 1 },
  },
  {
    name: "status-filtered suspension timeline",
    model: Suspension,
    filter: { status: "LIFTED" },
    sort: { createdAt: -1, _id: 1 },
    hint: { status: 1, createdAt: -1, _id: 1 },
  },
  {
    name: "unfiltered building-edit-request queue",
    model: BuildingEditRequest,
    filter: {},
    sort: { createdAt: -1, _id: 1 },
    hint: { createdAt: -1, _id: 1 },
  },
];

const addPublicListingCase = async () => {
  const sample = await Listing.findOne({ buildingId: { $ne: null } })
    .select("buildingId")
    .lean();

  if (!sample) return;

  explainCases.push({
    name: "public listings in a building",
    model: Listing,
    filter: {
      buildingId: sample.buildingId,
      isDeleted: false,
      visibility: "PUBLIC",
    },
    sort: { updatedAt: -1, _id: 1 },
    hint: {
      buildingId: 1,
      isDeleted: 1,
      visibility: 1,
      updatedAt: -1,
      _id: 1,
    },
  });
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
  await addPublicListingCase();

  let hasBlockingSort = false;
  for (const item of explainCases) {
    const explanation = await item.model.collection
      .find(item.filter)
      .sort(item.sort)
      .hint(item.hint)
      .limit(20)
      .explain("executionStats");
    const stages = collectStages(explanation.executionStats?.executionStages);
    const blockingSort = stages.has("SORT");
    hasBlockingSort ||= blockingSort;

    console.log(
      JSON.stringify({
        name: item.name,
        collection: item.model.collection.name,
        index: item.hint,
        returned: explanation.executionStats?.nReturned ?? 0,
        keysExamined: explanation.executionStats?.totalKeysExamined ?? 0,
        documentsExamined: explanation.executionStats?.totalDocsExamined ?? 0,
        blockingSort,
        stages: [...stages].sort(),
      }),
    );
  }

  if (hasBlockingSort) process.exitCode = 1;
};

try {
  await run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
