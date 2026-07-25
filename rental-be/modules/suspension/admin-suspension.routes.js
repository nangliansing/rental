import { Router } from "express";

import {
  adminCreateSuspensionController,
  adminGetSuspensionByIdController,
  adminLiftSuspensionController,
  adminSearchSuspensionsController,
} from "./controllers/index.js";

const router = Router();

router.get("/", adminSearchSuspensionsController);
router.post("/", adminCreateSuspensionController);
router.patch("/:suspensionId/lift", adminLiftSuspensionController);
router.get("/:suspensionId", adminGetSuspensionByIdController);

export default router;
