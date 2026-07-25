# Runtime lifecycle

## Health endpoints

| Endpoint | Purpose | Success | Failure |
| --- | --- | --- | --- |
| `GET /health` | Backward-compatible liveness | `200 OK` | Process unavailable |
| `GET /health/live` | Orchestrator liveness | `200 OK` | Process unavailable |
| `GET /health/ready` | Traffic readiness | `200 READY` | `503 SERVICE_NOT_READY` |

Liveness only proves that the Node process can answer HTTP. Readiness requires
the runtime to have completed startup, MongoDB to be connected, and the
rate-limit store to be ready. Readiness becomes false immediately when graceful
shutdown starts. Responses intentionally omit dependency details.

Health routes are not rate limited. Restrict them through the deployment
network or load balancer rather than public application quotas.

## Startup

The process validates configuration, connects the rate-limit store, connects
MongoDB, creates HTTP and Socket.IO transports, and binds the port. It reports
ready only after every step succeeds. A startup failure closes any resources
opened by earlier steps and exits unsuccessfully without opening a partial
service.

## Shutdown

`SIGTERM` and `SIGINT` start one idempotent shutdown sequence:

1. Mark the instance unready.
2. Stop accepting HTTP traffic and close idle connections.
3. Close Socket.IO connections.
4. Disconnect MongoDB and Redis.
5. Exit successfully after cleanup.

Uncaught exceptions and unhandled promise rejections use the same cleanup path
but set a failure exit code. `SHUTDOWN_TIMEOUT_MS` defaults to 10 seconds and
must be from 1 through 60 seconds. If cleanup exceeds that deadline, remaining
HTTP connections are destroyed and the process exits unsuccessfully.

For zero-downtime deployment, configure the orchestrator readiness probe to
`/health/ready`, send `SIGTERM`, and allow a termination grace period longer
than `SHUTDOWN_TIMEOUT_MS`.
