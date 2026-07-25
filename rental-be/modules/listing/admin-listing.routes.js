// modules/listing/admin-listing.routes.js
import { Router } from "express";
import { adminDeleteListingController } from "./controllers/index.js";

const router = Router();

router.delete("/:listingId", adminDeleteListingController);

export default router;
