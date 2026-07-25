// modules/upload/upload.routes.js
import { Router } from "express";

import {
  authenticate,
  requireActiveUser,
} from "../../shared/middlewares/index.js";
import { uploadRateLimit } from "../../shared/security/index.js";
import { createUploadSignatureController } from "./controllers/index.js";

const router = Router();

router.post(
  "/signature",
  authenticate,
  requireActiveUser,
  uploadRateLimit,
  createUploadSignatureController
);

export default router;
