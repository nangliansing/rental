import "dotenv/config";
import mongoose from "mongoose";

import { indexModels } from "./database/index-models.js";
import {
  describeIndex,
  indexSignature,
  normalizeExpectedIndex,
  normalizeIndex,
} from "./database/index-utils.js";

const getActualIndexes = async (model) => {
  try {
    return (await model.collection.indexes())
      .filter((index) => index.name !== "_id_")
      .map((index) => normalizeIndex(index));
  } catch (error) {
    if (error?.codeName === "NamespaceNotFound" || error?.code === 26) {
      return [];
    }

    throw error;
  }
};

const auditModel = async (model) => {
  const expected = model.schema.indexes().map(normalizeExpectedIndex);
  const actual = await getActualIndexes(model);
  const actualSignatures = new Set(actual.map(indexSignature));
  const expectedSignatures = new Set(expected.map(indexSignature));
  const missing = expected.filter(
    (index) => !actualSignatures.has(indexSignature(index)),
  );
  const unexpected = actual.filter(
    (index) => !expectedSignatures.has(indexSignature(index)),
  );

  return { actual, expected, missing, model, unexpected };
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });

  const results = [];
  for (const model of indexModels) {
    results.push(await auditModel(model));
  }

  let missingCount = 0;
  for (const result of results) {
    console.log(`\n${result.model.modelName} (${result.model.collection.name})`);

    if (result.missing.length === 0) {
      console.log("  missing: none");
    } else {
      for (const index of result.missing) {
        console.log(`  missing: ${describeIndex(index)}`);
        missingCount += 1;
      }
    }

    for (const index of result.unexpected) {
      console.log(`  unmanaged: ${index.name || "unnamed"} ${describeIndex(index)}`);
    }
  }

  console.log(`\nIndex audit complete: ${missingCount} missing`);
  if (missingCount > 0) process.exitCode = 1;
};

try {
  await run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
