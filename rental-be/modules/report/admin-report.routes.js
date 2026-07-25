import { Router } from "express";

import {
  adminGetReportByIdController,
  adminSearchReportsController,
  adminUpdateReportStatusController,
} from "./controllers/index.js";

const router = Router();

router.get("/", adminSearchReportsController);
router.patch("/:reportId/status", adminUpdateReportStatusController);
router.get("/:reportId", adminGetReportByIdController);

export default router;
