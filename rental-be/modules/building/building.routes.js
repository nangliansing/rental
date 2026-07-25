import { Router } from "express";

import { getBuildingByIdController } from "./controllers/index.js";

const router = Router();

router.get("/:buildingId", getBuildingByIdController);

export default router;
