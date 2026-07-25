import { getEnvironment } from "../../config/index.js";
import { AppError } from "../errors/app-error.js";

export const requireTrustedOrigin = (req, res, next) => {
  const origin = req.get("origin");

  if (!origin || !getEnvironment().corsOrigins.includes(origin)) {
    return next(new AppError("Forbidden", 403, "FORBIDDEN"));
  }

  return next();
};
