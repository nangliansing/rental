// modules/search/search.routes.js
import { Router } from "express";
import { optionalAuthenticate } from "../../shared/middlewares/index.js";
import { searchRateLimit } from "../../shared/security/index.js";
import {
  searchBuildingsInMapController,
  searchBuildingsNearbyController,
  searchBuildingsNearLinesController,
  searchAgentProfileByIdController,
  searchAgentProfilesController,
  searchListingsByAgentController,
  searchListingsInBuildingController,
  searchListingByIdController,
} from "./controllers/index.js";

const router = Router();

router.use(searchRateLimit, optionalAuthenticate);

router.post("/buildings/map", searchBuildingsInMapController);
router.post("/buildings/nearby", searchBuildingsNearbyController);
router.post("/buildings/near-lines", searchBuildingsNearLinesController);

router.get("/agents", searchAgentProfilesController);
router.get("/agents/:agentProfileId", searchAgentProfileByIdController);

router.post(
  "/buildings/:buildingId/listings",
  searchListingsInBuildingController
);

router.get(
  "/agents/:agentProfileId/listings",
  searchListingsByAgentController
);

router.get("/listings/:listingId", searchListingByIdController);

export default router;
