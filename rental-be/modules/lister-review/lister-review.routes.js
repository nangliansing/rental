import { Router } from "express";

import {
  authenticate,
  optionalAuthenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import { sensitiveActionRateLimit } from "../../shared/security/index.js";

import {
  createListerReviewController,
  deleteListerReviewController,
  searchListerReviewsController,
  toggleListerReviewCollapseController,
  updateListerReviewController,
} from "./controllers/index.js";

const router = Router();

router.get(
  "/listers/:listerProfileId",
  optionalAuthenticate,
  searchListerReviewsController,
);

router.use(authenticate, requireActiveUser, sensitiveActionRateLimit);

router.post("/:listerProfileId", createListerReviewController);
router.patch("/:reviewId/toggle-collapse", toggleListerReviewCollapseController);
router.patch("/:reviewId", updateListerReviewController);
router.delete("/:reviewId", deleteListerReviewController);

export default router;
