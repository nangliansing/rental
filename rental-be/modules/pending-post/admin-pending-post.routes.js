import { Router } from "express";

import {
  adminApprovePendingPostController,
  adminRejectPendingPostController,
  adminSearchPendingPostsController,
} from "./controllers/index.js";

const router = Router();

router.get("/", adminSearchPendingPostsController);
router.patch("/:pendingPostId/approve", adminApprovePendingPostController);
router.patch("/:pendingPostId/reject", adminRejectPendingPostController);

export default router;
