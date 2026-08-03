import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import {
  createClientRequestController,
  ownerDeleteClientRequestController,
  ownerSearchClientRequestByIdController,
  ownerSearchClientRequestsController,
  ownerUpdateClientRequestController,
  ownerUpdateClientRequestStatusController,
} from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);

router.get("/", ownerSearchClientRequestsController);
router.post("/", createClientRequestController);
router.get("/:clientRequestId", ownerSearchClientRequestByIdController);
router.patch("/:clientRequestId", ownerUpdateClientRequestController);
router.patch(
  "/:clientRequestId/status",
  ownerUpdateClientRequestStatusController,
);
router.delete("/:clientRequestId", ownerDeleteClientRequestController);

export default router;
