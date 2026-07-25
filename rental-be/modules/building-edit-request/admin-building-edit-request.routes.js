import { Router } from "express";

import {
  adminApproveBuildingEditRequestController,
  adminGetBuildingEditRequestByIdController,
  adminRejectBuildingEditRequestController,
  adminSearchBuildingEditRequestsController,
} from "./controllers/index.js";

const router = Router();

router.get("/", adminSearchBuildingEditRequestsController);
router.patch(
  "/:buildingEditRequestId/approve",
  adminApproveBuildingEditRequestController,
);
router.patch(
  "/:buildingEditRequestId/reject",
  adminRejectBuildingEditRequestController,
);
router.get("/:buildingEditRequestId", adminGetBuildingEditRequestByIdController);

export default router;
