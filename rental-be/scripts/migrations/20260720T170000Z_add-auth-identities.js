export const id = "20260720T170000Z_add-auth-identities";
export const description =
  "Add authentication identities and backfill password credentials";

const PASSWORD_PROVIDER = "PASSWORD";
const BATCH_SIZE = 500;

const authIdentityIndexes = [
  [
    { userId: 1, provider: 1 },
    { unique: true, name: "auth_identity_user_provider_unique" },
  ],
  [
    { provider: 1, providerSubject: 1 },
    {
      unique: true,
      name: "auth_identity_provider_subject_unique",
      partialFilterExpression: { providerSubject: { $type: "string" } },
    },
  ],
];

const writeBatch = async (collection, users) => {
  if (users.length === 0) {
    return;
  }

  await collection.bulkWrite(
    users.map((user) => ({
      updateOne: {
        filter: { userId: user._id, provider: PASSWORD_PROVIDER },
        update: {
          $setOnInsert: {
            userId: user._id,
            provider: PASSWORD_PROVIDER,
            providerSubject: null,
            providerEmail: user.email,
            emailVerified: false,
            passwordHash: user.password,
            lastAuthenticatedAt: null,
            createdAt: user.createdAt || new Date(),
            updatedAt: user.updatedAt || new Date(),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
};

export const up = async ({ db }) => {
  const users = db.collection("users");
  const authIdentities = db.collection("auth_identities");

  for (const [keys, options] of authIdentityIndexes) {
    await authIdentities.createIndex(keys, options);
  }

  const cursor = users.find(
    { authProvider: PASSWORD_PROVIDER, password: { $type: "string" } },
    {
      projection: {
        _id: 1,
        email: 1,
        password: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  );
  let batch = [];

  for await (const user of cursor) {
    batch.push(user);

    if (batch.length === BATCH_SIZE) {
      await writeBatch(authIdentities, batch);
      batch = [];
    }
  }

  await writeBatch(authIdentities, batch);
};
