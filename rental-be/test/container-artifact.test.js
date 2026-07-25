import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { describe, test } from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const readProjectFile = (fileName) =>
  readFile(new URL(`../${fileName}`, import.meta.url), "utf8");

describe("production container artifact", () => {
  test("pins the runtime image and installs locked production dependencies", async () => {
    const dockerfile = await readProjectFile("Dockerfile");

    assert.match(
      dockerfile,
      /node:22\.17\.0-bookworm-slim@sha256:[a-f\d]{64}/,
    );
    assert.match(dockerfile, /npm ci --omit=dev/);
    assert.match(dockerfile, /FROM \$\{NODE_IMAGE\} AS runtime/);
  });

  test("runs as non-root with exec-form startup and liveness checks", async () => {
    const dockerfile = await readProjectFile("Dockerfile");

    assert.match(dockerfile, /USER node/);
    assert.match(dockerfile, /STOPSIGNAL SIGTERM/);
    assert.match(dockerfile, /HEALTHCHECK[\s\S]*scripts\/container-healthcheck\.js/);
    assert.match(dockerfile, /CMD \["node", "index\.js"\]/);
  });

  test("excludes secrets and local state from the build context", async () => {
    const ignored = new Set(
      (await readProjectFile(".dockerignore"))
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    );

    for (const entry of [".env", ".env.*", "backups", "node_modules", "tmp"]) {
      assert.ok(ignored.has(entry), `.dockerignore must include ${entry}`);
    }
  });

  test("health check succeeds only for a live HTTP endpoint", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200).end('{"success":true}');
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();

    try {
      await execFileAsync(process.execPath, ["scripts/container-healthcheck.js"], {
        env: { ...process.env, PORT: String(port) },
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    await assert.rejects(
      execFileAsync(process.execPath, ["scripts/container-healthcheck.js"], {
        env: { ...process.env, PORT: String(port) },
      }),
    );
  });
});
