import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
  requireAgentProfile,
} from "../../shared/middlewares/index.js";
import { searchRateLimit } from "../../shared/security/index.js";
import { getAgentDemandOpportunityByIdController } from "./controllers/get-agent-demand-opportunity-by-id.controller.js";
import { searchAgentDemandOpportunitiesController } from "./controllers/search-agent-demand-opportunities.controller.js";

const router = Router();

router.use(authenticate, requireActiveUser, requireAgentProfile);
router.post(
  "/search",
  searchRateLimit,
  searchAgentDemandOpportunitiesController,
);
router.get("/:opportunityId", getAgentDemandOpportunityByIdController);

export default router;
