import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import {
  createSavedListingController,
  deleteSavedListingController,
  searchSavedListingsController,
} from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);

router.get("/", searchSavedListingsController);
router.post("/:listingId", createSavedListingController);
router.delete("/:listingId", deleteSavedListingController);

export default router;
