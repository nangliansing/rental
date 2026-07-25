import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import { sensitiveActionRateLimit } from "../../shared/security/index.js";
import { createReportController } from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);

router.post("/", sensitiveActionRateLimit, createReportController);

export default router;
