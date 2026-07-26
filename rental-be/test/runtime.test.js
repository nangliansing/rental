import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createServer } from "node:http";
import { describe, test } from "node:test";

import {
  createGracefulShutdown,
  createRuntimeHealth,
  listen,
  registerProcessHandlers,
} from "../shared/runtime/index.js";

const quietLogger = {
  error() {},
  info() {},
};

describe("runtime health", () => {
  test("requires ready state and healthy dependencies", () => {
    let databaseReady = true;
    let rateLimitStoreReady = true;
    const health = createRuntimeHealth({
      isDatabaseReady: () => databaseReady,
      isRateLimitStoreReady: () => rateLimitStoreReady,
    });

    assert.equal(health.isLive(), true);
    assert.equal(health.isReady(), false);

    health.markReady();
    assert.equal(health.isReady(), true);

    databaseReady = false;
    assert.equal(health.isReady(), false);

    databaseReady = true;
    rateLimitStoreReady = false;
    assert.equal(health.isReady(), false);

    rateLimitStoreReady = true;
    health.markShuttingDown();
    assert.equal(health.isLive(), true);
    assert.equal(health.isReady(), false);
  });

  test("treats a dependency-check exception as not ready", () => {
    const health = createRuntimeHealth({
      isDatabaseReady: () => {
        throw new Error("check failed");
      },
    });

    health.markReady();
    assert.equal(health.isReady(), false);
  });
});

describe("graceful shutdown", () => {
  test("binds the HTTP server on 0.0.0.0", async () => {
    const server = createServer((req, res) => res.end("OK"));

    await listen(server, 0);

    const address = server.address();
    assert.equal(typeof address, "object");
    assert.notEqual(address, null);
    assert.equal(address.address, "0.0.0.0");

    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  test("is idempotent and closes transports before dependencies", async () => {
    const events = [];
    const server = createServer((req, res) => res.end("OK"));
    const health = createRuntimeHealth();

    await listen(server, 0);
    health.markReady();

    const shutdown = createGracefulShutdown({
      server,
      runtimeHealth: health,
      closeSocketServer: async () => {
        assert.equal(health.isReady(), false);
        events.push("socket");
      },
      closeDatabase: async () => events.push("database"),
      closeRateLimitStore: async () => events.push("rate-limit-store"),
      timeoutMs: 1000,
      logger: quietLogger,
      onTimeout: () => assert.fail("shutdown should not time out"),
    });

    const firstShutdown = shutdown("test");
    const secondShutdown = shutdown("duplicate");

    assert.strictEqual(secondShutdown, firstShutdown);
    await firstShutdown;

    assert.equal(server.listening, false);
    assert.equal(health.isReady(), false);
    assert.equal(events[0], "socket");
    assert.deepEqual(new Set(events.slice(1)), new Set([
      "database",
      "rate-limit-store",
    ]));
  });

  test("reports cleanup failures after attempting every dependency", async () => {
    const closed = [];
    const health = createRuntimeHealth();
    const shutdown = createGracefulShutdown({
      server: null,
      runtimeHealth: health,
      closeSocketServer: async () => closed.push("socket"),
      closeDatabase: async () => {
        closed.push("database");
        throw new Error("database close failed");
      },
      closeRateLimitStore: async () => closed.push("rate-limit-store"),
      timeoutMs: 1000,
      logger: quietLogger,
      onTimeout: () => assert.fail("shutdown should not time out"),
    });

    await assert.rejects(shutdown("test-failure"), AggregateError);
    assert.deepEqual(closed, ["socket", "database", "rate-limit-store"]);
  });

  test("attempts dependency cleanup after a transport failure", async () => {
    const closed = [];
    const health = createRuntimeHealth();
    const shutdown = createGracefulShutdown({
      server: null,
      runtimeHealth: health,
      closeSocketServer: async () => {
        closed.push("socket");
        throw new Error("socket close failed");
      },
      closeDatabase: async () => closed.push("database"),
      closeRateLimitStore: async () => closed.push("rate-limit-store"),
      timeoutMs: 1000,
      logger: quietLogger,
      onTimeout: () => assert.fail("shutdown should not time out"),
    });

    await assert.rejects(shutdown("transport-failure"), AggregateError);
    assert.deepEqual(closed, ["socket", "database", "rate-limit-store"]);
  });
});

describe("process handlers", () => {
  test("maps SIGTERM to one successful shutdown", async () => {
    const processRef = new EventEmitter();
    const reasons = [];
    const unregister = registerProcessHandlers({
      processRef,
      logger: quietLogger,
      shutdown: async (reason) => reasons.push(reason),
    });

    processRef.emit("SIGTERM");
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(reasons, ["SIGTERM"]);
    assert.equal(processRef.exitCode, 0);
    unregister();
  });

  test("uses a failure exit code for fatal process events", async () => {
    const processRef = new EventEmitter();
    const reasons = [];
    const unregister = registerProcessHandlers({
      processRef,
      logger: quietLogger,
      shutdown: async (reason) => reasons.push(reason),
    });

    processRef.emit("unhandledRejection", new Error("fatal"));
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(reasons, ["unhandledRejection"]);
    assert.equal(processRef.exitCode, 1);
    unregister();
  });

  test("does not downgrade a fatal exit code when signals overlap", async () => {
    const processRef = new EventEmitter();
    let finishShutdown;
    const shutdownPromise = new Promise((resolve) => {
      finishShutdown = resolve;
    });
    const unregister = registerProcessHandlers({
      processRef,
      logger: quietLogger,
      shutdown: () => shutdownPromise,
    });

    processRef.emit("unhandledRejection", new Error("fatal"));
    processRef.emit("SIGTERM");
    finishShutdown();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(processRef.exitCode, 1);
    unregister();
  });
});
