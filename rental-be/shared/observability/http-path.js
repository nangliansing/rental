const MONGOOSE_ID_PATTERN = /^[a-f\d]{24}$/i;
const UUID_PATTERN = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const INTEGER_PATTERN = /^\d+$/;

export const normalizeHttpPath = (req) => {
  if (!req.route) return "unmatched";

  const routePath =
    typeof req.route.path === "string" ? req.route.path : req.path;
  const path = `${req.baseUrl || ""}${routePath}`
    .split("/")
    .map((segment) =>
      MONGOOSE_ID_PATTERN.test(segment) ||
      UUID_PATTERN.test(segment) ||
      INTEGER_PATTERN.test(segment)
        ? ":id"
        : segment,
    )
    .join("/");

  return path.slice(0, 160) || "/";
};

export const isQuietOperationalPath = (path) =>
  path === "/health" || path.startsWith("/health/") || path === "/metrics";
