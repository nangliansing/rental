# Observability

The API emits structured JSON logs to standard output and exposes Prometheus
metrics at `GET /metrics`. Deployment infrastructure should collect stdout and
scrape metrics over a private network.

## Request IDs

Every HTTP response includes `X-Request-ID`. Error responses also include the
same value as `requestId` in the JSON body. A caller-supplied `X-Request-ID` is
accepted only when it contains 1-128 letters, numbers, dots, underscores,
colons, or hyphens. Invalid values are replaced with a generated UUID.

Forward the request ID from the browser, reverse proxy, and background jobs so
one operation can be traced across services.

## Structured logs

`LOG_LEVEL` controls Pino output. Request-completion records include only:

- `requestId`, HTTP method, normalized route, status code, and duration;
- authenticated user ID when available; and
- service name and environment.

Request bodies, query values, cookies, authorization headers, tokens, and
passwords are not logged. Common secret fields are also redacted if they are
accidentally passed to the logger. Server failures include a serialized error;
expected client errors do not emit stack traces. Health and metrics requests
are omitted from access logs to reduce noise. Denied metrics scrapes emit a
dedicated warning without including the supplied credential.

Runtime events cover server startup, MongoDB and Redis connection, shutdown,
shutdown timeout, uncaught exceptions, and unhandled promise rejections.

## Metrics

Metrics are enabled by default. Production requires a random `METRICS_TOKEN`
of at least 32 characters. Scrape with:

```bash
curl -H "Authorization: Bearer $METRICS_TOKEN" \
  http://127.0.0.1:3000/metrics
```

The endpoint exposes:

| Metric | Meaning |
| --- | --- |
| `rental_http_requests_total` | Completed requests by method, route template, and status |
| `rental_http_request_duration_seconds` | Request latency histogram |
| `rental_http_active_requests` | Requests currently being served |
| `rental_dependency_ready` | MongoDB and rate-limit-store readiness |
| `rental_process_*` and `rental_nodejs_*` | Process and Node.js runtime metrics outside tests |

Matched endpoints use route templates such as
`/api/v1/listings/:listingId`. Unmatched paths share the `unmatched` label, so
arbitrary IDs and URLs cannot create unbounded metric cardinality. Health and
metrics scrapes are excluded from HTTP metrics.

Keep `/metrics` private and do not expose its token to browser applications.
Set `METRICS_ENABLED=false` only when the deployment platform supplies an
equivalent metrics integration.

## Initial alerts

Start with alerts for sustained 5xx response rate, high p95 request latency,
either dependency readiness metric staying at `0`, process restarts, and a
sharp rise in `429` responses. Tune thresholds from production traffic rather
than treating development values as capacity targets.

Retain access logs according to the platform privacy policy. Restrict log and
metrics access to operators, because user IDs and operational metadata remain
sensitive even though credentials and request content are excluded.
