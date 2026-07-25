import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
  requireAgentProfile,
} from "../../shared/middlewares/index.js";
import {
  createPendingPostController,
  ownerDeletePendingPostController,
  ownerSearchPendingPostsController,
} from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser, requireAgentProfile);

router.get("/", ownerSearchPendingPostsController);
router.post("/", createPendingPostController);
router.delete("/:pendingPostId", ownerDeletePendingPostController);

export default router;
