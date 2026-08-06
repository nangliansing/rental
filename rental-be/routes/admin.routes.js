// routes/admin.routes.js
import { Router } from "express";
import {
  authenticate,
  authorizeRoles,
  requireActiveUser,
} from "../shared/middlewares/index.js";
import { USER_ROLES } from "../modules/user/user.constants.js";
import { adminMutationRateLimit } from "../shared/security/index.js";

import adminBuildingEditRequestRoutes from "../modules/building-edit-request/admin-building-edit-request.routes.js";
import adminListingRoutes from "../modules/listing/admin-listing.routes.js";
import adminListerReviewRoutes from "../modules/lister-review/admin-lister-review.routes.js";
import adminPendingPostRoutes from "../modules/pending-post/admin-pending-post.routes.js";
import adminReportRoutes from "../modules/report/admin-report.routes.js";
import adminReviewReportRoutes from "../modules/review-report/admin-review-report.routes.js";
import adminSuspensionRoutes from "../modules/suspension/admin-suspension.routes.js";
import adminUserRoutes from "../modules/user/admin-user.routes.js";
import adminSavedSearchRoutes from "../modules/saved-search/admin-saved-search.routes.js";

const router = Router();

router.use(
  authenticate,
  requireActiveUser,
  authorizeRoles(USER_ROLES.OWNER, USER_ROLES.ADMIN)
);
router.use(adminMutationRateLimit);

router.use("/building-edit-requests", adminBuildingEditRequestRoutes);
router.use("/listings", adminListingRoutes);
router.use("/reviews", adminListerReviewRoutes);
router.use("/pending-posts", adminPendingPostRoutes);
router.use("/reports", adminReportRoutes);
router.use("/review-reports", adminReviewReportRoutes);
router.use("/suspensions", adminSuspensionRoutes);
router.use("/users", adminUserRoutes);
router.use("/saved-searches", adminSavedSearchRoutes);

export default router;
