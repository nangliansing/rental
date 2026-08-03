import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import {
  createClientRequestController,
  ownerDeleteClientRequestController,
  ownerUpdateClientRequestController,
} from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);

router.post("/", createClientRequestController);
router.patch("/:clientRequestId", ownerUpdateClientRequestController);
router.delete("/:clientRequestId", ownerDeleteClientRequestController);

export default router;
