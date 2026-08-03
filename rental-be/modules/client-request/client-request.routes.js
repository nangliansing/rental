import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import { createClientRequestController } from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);

router.post("/", createClientRequestController);

export default router;
