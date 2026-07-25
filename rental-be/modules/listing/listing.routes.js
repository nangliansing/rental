// modules/listing/listing.routes.js
import { Router } from "express";
import {
  ownerDeleteListingController,
  ownerSearchListingByIdController,
  ownerSearchListingsController,
  ownerUpdateListingController,
} from "./controllers/index.js";
import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);

router.get("/", ownerSearchListingsController);
router.get("/:listingId", ownerSearchListingByIdController);

router.patch("/:listingId", ownerUpdateListingController);
router.delete("/:listingId", ownerDeleteListingController);

export default router;
