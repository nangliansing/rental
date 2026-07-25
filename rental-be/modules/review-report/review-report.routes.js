import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import { sensitiveActionRateLimit } from "../../shared/security/index.js";
import { createReviewReportController } from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);

router.post("/", sensitiveActionRateLimit, createReviewReportController);

export default router;
