import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
  requireAgentProfile,
} from "../../shared/middlewares/index.js";
import { sensitiveActionRateLimit } from "../../shared/security/index.js";
import { createBuildingEditRequestController } from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser, requireAgentProfile);

router.post("/", sensitiveActionRateLimit, createBuildingEditRequestController);

export default router;
