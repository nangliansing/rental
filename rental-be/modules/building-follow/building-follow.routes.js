import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import {
  createBuildingFollowController,
  deleteBuildingFollowController,
  searchBuildingFollowersController,
  searchUserBuildingFollowsController,
} from "./controllers/index.js";

const router = Router();

router.get("/buildings/:buildingId", searchBuildingFollowersController);
router.get(
  "/users/:userId",
  authenticate,
  requireActiveUser,
  searchUserBuildingFollowsController,
);

router.post("/:buildingId", authenticate, requireActiveUser, createBuildingFollowController);
router.delete(
  "/:buildingId",
  authenticate,
  requireActiveUser,
  deleteBuildingFollowController,
);

export default router;
