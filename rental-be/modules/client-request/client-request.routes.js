import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import {
  createClientRequestController,
  ownerUpdateClientRequestController,
} from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);

router.post("/", createClientRequestController);
router.patch("/:clientRequestId", ownerUpdateClientRequestController);

export default router;
