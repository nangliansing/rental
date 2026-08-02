import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import { geocodeRateLimit } from "../../shared/security/index.js";
import { reverseGeocodeController } from "./controllers/index.js";

const router = Router();

router.use(authenticate, requireActiveUser);
router.post("/reverse", geocodeRateLimit, reverseGeocodeController);

export default router;
