// modules/agent/admin-agent-profile.routes.js
import { Router } from "express";
import { adminUpdateAgentProfileController } from "./controllers/index.js";

const router = Router();

router.patch("/:agentProfileId", adminUpdateAgentProfileController);

export default router;