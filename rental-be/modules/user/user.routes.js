import { Router } from "express";

import { authenticate } from "../../shared/middlewares/authenticate.js";
import { requireTrustedOrigin } from "../../shared/middlewares/index.js";
import { authenticationRateLimit } from "../../shared/security/index.js";
import {
  getCurrentUserController,
  loginUserWithGoogleController,
  logoutController,
  refreshAccessTokenController,
} from "./controllers/index.js";

const router = Router();

router.post(
  "/login/google",
  authenticationRateLimit,
  requireTrustedOrigin,
  loginUserWithGoogleController,
);
router.post("/token/refresh", refreshAccessTokenController);
router.post("/logout", logoutController);

router.get("/me", authenticate, getCurrentUserController);

export default router;
