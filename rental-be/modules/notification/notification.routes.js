import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import {
  getMyNotificationsController,
  markMyNotificationsReadController,
} from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);

router.get("/me", getMyNotificationsController);
router.patch("/me/read-all", markMyNotificationsReadController);

export default router;
