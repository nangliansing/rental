/**
 * Live E2E for building follower notifications.
 * Requires: Redis, worker running, .env with QUEUE_ENABLED=true.
 *
 * Usage: node scripts/run-follower-notify-e2e-all.js
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const mongoose = (await import("mongoose")).default;
const { validateEnvironment } = await import("../config/environment.js");
const { closeQueueProducer, getQueue, initializeQueueProducer } = await import(
  "../shared/queue/queue-manager.js"
);
const { default: Building } = await import("../modules/building/building.model.js");
const { default: BuildingFollow } = await import(
  "../modules/building-follow/building-follow.model.js"
);
const { default: Listing } = await import("../modules/listing/listing.model.js");
const { LISTING_VISIBILITIES } = await import("../modules/listing/listing.constants.js");
const { default: Notification } = await import(
  "../modules/notification/notification.model.js"
);
const { default: User } = await import("../modules/user/user.model.js");
const { updateBuildingRentSummaryService } = await import(
  "../modules/building/services/update-building-rent-summary.service.js"
);
const { ownerUpdateListingService } = await import(
  "../modules/listing/services/owner-update-listing.service.js"
);
const { BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS } = await import(
  "../modules/building-follow-notify/building-follow-notify.constants.js"
);

const env = validateEnvironment(process.env);
const suffix = Date.now();
const WAIT_MS = BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS + 5000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const waitForJob = async (jobId) => {
  const deadline = Date.now() + WAIT_MS;

  while (Date.now() < deadline) {
    const job = await getQueue().getJob(jobId);
    if (job) {
      const state = await job.getState();
      if (state === "completed" || state === "failed") {
        return { job, state };
      }
    }
    await sleep(500);
  }

  return { job: await getQueue().getJob(jobId), state: "timeout" };
};

const assertScenario = (name, condition, detail) => {
  const ok = Boolean(condition);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
  return ok;
};

const createListingRecord = (overrides) => ({
  rent: 5000,
  deposit: 5000,
  moveInCost: 10000,
  bedroomCount: 1,
  bathroomCount: 1,
  kitchenType: "Kitchen",
  contractMonths: 12,
  occupancy: 2,
  isForeignerAccepted: true,
  isTM30Provided: true,
  isCookingAllowed: true,
  isPetAllowed: false,
  visibility: LISTING_VISIBILITIES.PUBLIC,
  isDeleted: false,
  availableAt: null,
  facilities: ["Air Conditioner"],
  media: [],
  ...overrides,
});

const run = async () => {
  console.log(`debounce_ms=${BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS}, wait_ms=${WAIT_MS}`);

  await mongoose.connect(env.mongodbUri);
  await initializeQueueProducer(env.queue);

  const results = [];

  const owner = await User.create({
    name: "E2E Owner",
    email: `e2e-owner-${suffix}@example.com`,
  });
  const follower = await User.create({
    name: "E2E Follower",
    email: `e2e-follower-${suffix}@example.com`,
  });

  const building = await Building.create({
    name: `E2E Tower ${suffix}`,
    minRent: 5000,
    maxRent: 5000,
    isActive: true,
    createdBy: owner._id,
    location: { type: "Point", coordinates: [100.5018, 13.7563] },
  });

  await BuildingFollow.create({
    userId: follower._id,
    buildingId: building._id,
    createdAt: new Date(Date.now() - 60_000),
  });

  const listing = await Listing.create(
    createListingRecord({
      buildingId: building._id,
      listedBy: owner._id,
      rent: 5000,
    }),
  );

  const buildingId = building._id.toString();
  const jobId = (type) => `building.followers.notify-${buildingId}-${type}`;

  console.log("\n--- Scenario 1: Price drop ---");
  await ownerUpdateListingService({
    listingId: listing._id,
    actorId: owner._id,
    body: { rent: 4000 },
  });

  let { job, state } = await waitForJob(jobId("PRICE_DROPPED"));
  const priceDrop1Count = await Notification.countDocuments({
    recipient: follower._id,
    type: "FOLLOWED_BUILDING_PRICE_DROPPED",
    "metadata.buildingId": buildingId,
  });
  results.push(assertScenario("Price drop job completes", state === "completed", `state=${state}`));
  results.push(
    assertScenario(
      "Price drop delivers notification",
      job?.returnvalue?.sent >= 1,
      JSON.stringify(job?.returnvalue),
    ),
  );
  results.push(
    assertScenario("Price drop notification in DB", priceDrop1Count >= 1, `count=${priceDrop1Count}`),
  );

  console.log("\n--- Scenario 2: Second price drop (dedupe per newMinRent) ---");
  await ownerUpdateListingService({
    listingId: listing._id,
    actorId: owner._id,
    body: { rent: 3500 },
  });

  ({ job, state } = await waitForJob(jobId("PRICE_DROPPED")));
  const priceDrop2Count = await Notification.countDocuments({
    recipient: follower._id,
    type: "FOLLOWED_BUILDING_PRICE_DROPPED",
    "metadata.buildingId": buildingId,
  });
  results.push(
    assertScenario(
      "Second price drop delivers",
      job?.returnvalue?.sent >= 1,
      JSON.stringify(job?.returnvalue),
    ),
  );
  results.push(
    assertScenario(
      "Second price drop adds notification",
      priceDrop2Count >= 2,
      `count=${priceDrop2Count}`,
    ),
  );

  console.log("\n--- Scenario 3: New public listing ---");
  const newListing = await Listing.create(
    createListingRecord({
      buildingId: building._id,
      listedBy: owner._id,
      rent: 4500,
    }),
  );

  const { maybeEnqueueBuildingFollowerNewListing } = await import(
    "../modules/building-follow-notify/services/enqueue-building-followers-notify.service.js"
  );

  await maybeEnqueueBuildingFollowerNewListing({
    listing: newListing.toObject(),
    buildingId: building._id,
    buildingName: building.name,
    occurredAt: new Date(),
  });

  ({ job, state } = await waitForJob(jobId("NEW_LISTING")));
  const newListingCount = await Notification.countDocuments({
    recipient: follower._id,
    type: "FOLLOWED_BUILDING_NEW_LISTING",
    "metadata.buildingId": buildingId,
  });
  results.push(
    assertScenario(
      "New listing delivers",
      job?.returnvalue?.sent >= 1,
      JSON.stringify(job?.returnvalue),
    ),
  );
  results.push(
    assertScenario(
      "New listing notification in DB",
      newListingCount >= 1,
      `count=${newListingCount}`,
    ),
  );

  console.log("\n--- Scenario 4: Available again ---");
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await Listing.findByIdAndUpdate(listing._id, { $set: { availableAt: futureDate } });
  const beforeUnavailable = await Listing.findById(listing._id).lean();
  await Listing.findByIdAndUpdate(listing._id, { $set: { availableAt: null } });
  const afterAvailable = await Listing.findById(listing._id).lean();

  const { maybeEnqueueBuildingFollowerAvailableAgain } = await import(
    "../modules/building-follow-notify/services/enqueue-building-followers-notify.service.js"
  );

  const availableEnqueue = await maybeEnqueueBuildingFollowerAvailableAgain({
    before: beforeUnavailable,
    after: afterAvailable,
    buildingName: building.name,
    occurredAt: new Date(),
  });

  if (!availableEnqueue.enqueued) {
    console.log("Available again enqueue skipped:", availableEnqueue.reason);
  }

  ({ job, state } = await waitForJob(jobId("AVAILABLE_AGAIN")));
  const availableCount = await Notification.countDocuments({
    recipient: follower._id,
    type: "FOLLOWED_BUILDING_AVAILABLE_AGAIN",
    "metadata.buildingId": buildingId,
  });
  results.push(
    assertScenario(
      "Available again delivers",
      job?.returnvalue?.sent >= 1,
      JSON.stringify(job?.returnvalue),
    ),
  );
  results.push(
    assertScenario(
      "Available again notification in DB",
      availableCount >= 1,
      `count=${availableCount}`,
    ),
  );

  console.log("\n--- Scenario 5: Late follower excluded ---");
  const lateFollower = await User.create({
    name: "Late Follower",
    email: `e2e-late-${suffix}@example.com`,
  });
  await BuildingFollow.create({
    userId: lateFollower._id,
    buildingId: building._id,
    createdAt: new Date(),
  });

  const { maybeEnqueueBuildingFollowerPriceDrop } = await import(
    "../modules/building-follow-notify/services/enqueue-building-followers-notify.service.js"
  );

  const staleOccurredAt = new Date(Date.now() - 60_000);

  await maybeEnqueueBuildingFollowerPriceDrop({
    buildingId: building._id,
    buildingName: building.name,
    oldMinRent: 4000,
    newMinRent: 3500,
    occurredAt: staleOccurredAt,
  });

  ({ job, state } = await waitForJob(jobId("PRICE_DROPPED")));
  const lateCount = await Notification.countDocuments({
    recipient: lateFollower._id,
    type: "FOLLOWED_BUILDING_PRICE_DROPPED",
  });
  results.push(
    assertScenario(
      "Late follower gets no notification",
      lateCount === 0,
      `lateCount=${lateCount}, job=${JSON.stringify(job?.returnvalue)}`,
    ),
  );
  results.push(
    assertScenario(
      "Only pre-event followers are considered",
      job?.returnvalue?.requested === 1,
      `requested=${job?.returnvalue?.requested}`,
    ),
  );

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;

  console.log(`\n=== Summary: ${passed}/${results.length} passed, ${failed} failed ===`);

  await closeQueueProducer();
  await mongoose.disconnect();

  if (failed > 0) process.exit(1);
};

run().catch(async (error) => {
  console.error(error);
  try {
    await closeQueueProducer();
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
