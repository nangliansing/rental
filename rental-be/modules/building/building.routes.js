import { Router } from "express";

import { optionalAuthenticate } from "../../shared/middlewares/index.js";
import { getBuildingNeighbourhoodController } from "../neighbourhood/controllers/index.js";
import { getBuildingByIdController } from "./controllers/index.js";

const router = Router();

router.use(optionalAuthenticate);

router.get("/:buildingId/neighbourhood", getBuildingNeighbourhoodController);
router.get("/:buildingId", getBuildingByIdController);

export default router;
