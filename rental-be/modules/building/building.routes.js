import { Router } from "express";

import { getBuildingNeighbourhoodController } from "../neighbourhood/controllers/index.js";
import { getBuildingByIdController } from "./controllers/index.js";

const router = Router();

router.get("/:buildingId/neighbourhood", getBuildingNeighbourhoodController);
router.get("/:buildingId", getBuildingByIdController);

export default router;
