import { Router } from "express";
import { authorizeRoles } from "../../shared/middlewares/index.js";

import {
  adminGetUserByIdController,
  adminRemoveAdminRoleController,
  adminSearchPlatformAdminsController,
} from "./controllers/index.js";
import { USER_ROLES } from "./user.constants.js";

const router = Router();

router.get("/platform-admins", adminSearchPlatformAdminsController);
router.patch(
  "/:userId/remove-admin",
  authorizeRoles(USER_ROLES.OWNER),
  adminRemoveAdminRoleController
);
router.get("/:userId", adminGetUserByIdController);

export default router;
