# HTTP security and abuse protection

The API applies layered controls. A client must remain within every applicable
quota; passing the global limit does not bypass a narrower route limit.
Public `/api/v1/search/*` routes skip the global, read, and mutation limiters and
use only the search policy so map/search traffic does not triple Redis command
usage. If the Redis rate-limit store fails, limiters fail open so availability is
preserved.

| Policy | Default window | Default maximum | Key |
| --- | ---: | ---: | --- |
| All non-health HTTP methods | 5 minutes | 300 | Client IP |
| API `GET` and `HEAD` | 1 minute | 180 | Client IP |
| Public search and map routes (only) | 1 minute | 60 | Client IP |
| Signup, login, and refresh | 15 minutes | 10 | Client IP |
| API mutations | 10 minutes | 100 | Client IP |
| Reports, review reports, reviews, and building edits | 1 hour | 20 | Authenticated user |
| Upload signatures | 10 minutes | 30 | Authenticated user |
| Admin mutations | 10 minutes | 100 | Authenticated admin |

Exceeding any quota returns HTTP `429`:

```json
{
  "success": false,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later."
}
```

Responses use the standard `RateLimit` header and do not emit legacy
`X-RateLimit-*` headers. Frontends should respect the response header and avoid
immediate automatic retries.

JSON bodies default to 256 KB. Oversized bodies return HTTP `413` with code
`PAYLOAD_TOO_LARGE`. Uploaded media bytes do not pass through this API; clients
request signed upload parameters and upload directly to Cloudinary.

Helmet supplies defensive HTTP response headers and Express technology headers
are disabled. These application controls complement, rather than replace,
load-balancer or CDN request controls and managed DDoS protection.

Health probes are exempt from application rate limits. Rate-limiting liveness
or readiness checks can cause an orchestrator to replace healthy instances
during traffic pressure. These paths should be restricted at the network or
load-balancer layer instead.

## Production topology

Production requires the Redis limiter store. Configure `TRUST_PROXY_HOPS` to
the exact number of trusted reverse proxies between the client and Express, and
prevent direct public access that bypasses those proxies. An incorrect value
can group clients together or allow spoofed forwarding headers.

Tune quotas only after reviewing traffic and latency metrics. Raising a limit
for one expensive route should be paired with query-cost, pagination, cache,
and database-index review.
