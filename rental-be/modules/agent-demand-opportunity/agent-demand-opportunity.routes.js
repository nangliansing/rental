import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
  requireAgentProfile,
} from "../../shared/middlewares/index.js";
import { searchRateLimit } from "../../shared/security/index.js";
import { searchAgentDemandOpportunitiesController } from "./controllers/search-agent-demand-opportunities.controller.js";

const router = Router();

router.use(searchRateLimit, authenticate, requireActiveUser, requireAgentProfile);
router.post("/search", searchAgentDemandOpportunitiesController);

export default router;
