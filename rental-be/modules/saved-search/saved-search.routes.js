import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import {
  createSavedSearchController,
  ownerDeleteSavedSearchController,
  ownerSearchSavedSearchByIdController,
  ownerSearchSavedSearchesController,
  ownerUpdateSavedSearchController,
  ownerUpdateSavedSearchStatusController,
} from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);

router.get("/", ownerSearchSavedSearchesController);
router.post("/", createSavedSearchController);
router.get("/:savedSearchId", ownerSearchSavedSearchByIdController);
router.patch("/:savedSearchId", ownerUpdateSavedSearchController);
router.patch(
  "/:savedSearchId/status",
  ownerUpdateSavedSearchStatusController,
);
router.delete("/:savedSearchId", ownerDeleteSavedSearchController);

export default router;
