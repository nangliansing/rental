import { buildSavedSearchCoverage } from "../../modules/saved-search/utils/build-saved-search-coverage.js";

export const id = "20260806T060000Z_add-saved-search-coverage";
export const description =
  "Backfill canonical saved-search coverage geometry for overlap queries";

const BATCH_SIZE = 500;

export const up = async ({ db }) => {
  const collection = db.collection("client_requests");
  const cursor = collection.find(
    { "geoSearch.coverage": { $exists: false } },
    { projection: { _id: 1, geoSearch: 1 } },
  );
  let operations = [];

  const flush = async () => {
    if (!operations.length) return;
    await collection.bulkWrite(operations, { ordered: false });
    operations = [];
  };

  for await (const savedSearch of cursor) {
    operations.push({
      updateOne: {
        filter: {
          _id: savedSearch._id,
          "geoSearch.coverage": { $exists: false },
        },
        update: {
          $set: {
            "geoSearch.coverage": buildSavedSearchCoverage(
              savedSearch.geoSearch,
            ),
          },
        },
      },
    });

    if (operations.length >= BATCH_SIZE) {
      await flush();
    }
  }

  await flush();
};
