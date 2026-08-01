import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseRealtimeHint } from "../../shared/queue/pubsub/parse-realtime-hint.js";
import { createRealtimePublisher } from "../../shared/queue/pubsub/realtime-hints.js";

describe("parseRealtimeHint", () => {
  test("parses a valid payload", () => {
    assert.deepEqual(
      parseRealtimeHint(
        JSON.stringify({
          userId: " user-1 ",
          notificationId: " notif-1 ",
        }),
      ),
      { userId: "user-1", notificationId: "notif-1" },
    );
  });

  test("rejects malformed or incomplete payloads", () => {
    for (const rawMessage of [
      "",
      "   ",
      "{",
      "null",
      "[]",
      JSON.stringify({}),
      JSON.stringify({ userId: "user-1" }),
      JSON.stringify({ notificationId: "notif-1" }),
      JSON.stringify({ userId: "   ", notificationId: "notif-1" }),
      JSON.stringify({ userId: "user-1", notificationId: "   " }),
    ]) {
      assert.equal(parseRealtimeHint(rawMessage), null, `Expected null for ${rawMessage}`);
    }
  });
});

describe("createRealtimePublisher", () => {
  test("returns a disabled publisher without redis", async () => {
    const publisher = await createRealtimePublisher({ enabled: false });

    assert.deepEqual(await publisher.publish({}), {
      published: false,
      reason: "disabled",
    });

    await publisher.close();
  });

  test("disabled publisher ignores invalid payloads safely", async () => {
    const publisher = await createRealtimePublisher({ enabled: false });

    assert.deepEqual(
      await publisher.publish({ userId: "", notificationId: "" }),
      { published: false, reason: "disabled" },
    );

    await publisher.close();
  });
});
