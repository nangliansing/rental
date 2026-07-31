import { Router } from "express";

import { authenticate } from "../../shared/middlewares/authenticate.js";
import { requireActiveUser, requireTrustedOrigin } from "../../shared/middlewares/index.js";
import {
  authenticationRateLimit,
  sensitiveActionRateLimit,
} from "../../shared/security/index.js";
import {
  getCurrentUserController,
  loginUserWithGoogleController,
  logoutController,
  refreshAccessTokenController,
  updateCurrentUserController,
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
router.patch(
  "/me",
  authenticate,
  requireActiveUser,
  sensitiveActionRateLimit,
  updateCurrentUserController,
);

export default router;
