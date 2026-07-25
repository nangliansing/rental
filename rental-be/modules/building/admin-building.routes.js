// modules/building/admin-building.routes.js
import { Router } from "express";
import {
  adminCreateBuildingController,
  adminUpdateBuildingController,
} from "./controllers/index.js";

const router = Router();

router.post("/", adminCreateBuildingController);
router.patch("/:buildingId", adminUpdateBuildingController);

export default router;