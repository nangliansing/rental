import { Router } from "express";

import {
  adminGetReviewReportByIdController,
  adminSearchReviewReportsController,
  adminUpdateReviewReportStatusController,
} from "./controllers/index.js";

const router = Router();

router.get("/", adminSearchReviewReportsController);
router.patch("/:reviewReportId/status", adminUpdateReviewReportStatusController);
router.get("/:reviewReportId", adminGetReviewReportByIdController);

export default router;
