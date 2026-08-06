import { Router } from "express";

import { adminSearchActiveSavedSearchOverlapsController } from "./controllers/index.js";

const router = Router();

router.post("/overlaps", adminSearchActiveSavedSearchOverlapsController);

export default router;
