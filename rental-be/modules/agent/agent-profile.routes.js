// modules/agent/agent-profile.routes.js
import { Router } from "express";
import {
  createAgentProfileController,
  getMyAgentProfileController,
  ownerDeleteAgentProfileController,
  ownerUpdateAgentProfileController,
} from "./controllers/index.js";
import { authenticate, requireActiveUser } from "../../shared/middlewares/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);

router.post("/", createAgentProfileController);
router.get("/me", getMyAgentProfileController);
router.patch("/me", ownerUpdateAgentProfileController);
router.delete("/me", ownerDeleteAgentProfileController);

export default router;
