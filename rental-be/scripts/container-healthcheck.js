import { request } from "node:http";

const port = Number(process.env.PORT || 3000);
const healthRequest = request(
  {
    host: "127.0.0.1",
    method: "GET",
    path: "/health/live",
    port,
    timeout: 2_000,
  },
  (response) => {
    response.resume();
    process.exitCode = response.statusCode === 200 ? 0 : 1;
  },
);

healthRequest.on("error", () => {
  process.exitCode = 1;
});
healthRequest.on("timeout", () => {
  healthRequest.destroy();
  process.exitCode = 1;
});
healthRequest.end();
