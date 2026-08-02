// routes/api.routes.js
import { Router } from "express";

import userRoutes from "../modules/user/user.routes.js";
import buildingRoutes from "../modules/building/building.routes.js";
import listingRoutes from "../modules/listing/listing.routes.js";
import agentProfileRoutes from "../modules/agent/agent-profile.routes.js";
import searchRoutes from "../modules/search/search.routes.js";
import uploadRoutes from "../modules/upload/upload.routes.js";
import pendingPostRoutes from "../modules/pending-post/pending-post.routes.js";
import buildingEditRequestRoutes from "../modules/building-edit-request/building-edit-request.routes.js";
import reportRoutes from "../modules/report/report.routes.js";
import notificationRoutes from "../modules/notification/notification.routes.js";
import savedListingRoutes from "../modules/saved-listing/saved-listing.routes.js";
import buildingFollowRoutes from "../modules/building-follow/building-follow.routes.js";
import listerReviewRoutes from "../modules/lister-review/lister-review.routes.js";
import reviewReportRoutes from "../modules/review-report/review-report.routes.js";
import geocodeRoutes from "../modules/geocode/geocode.routes.js";
import adminRoutes from "./admin.routes.js";

const router = Router();

router.use("/users", userRoutes);
router.use("/buildings", buildingRoutes);
router.use("/listings", listingRoutes);
router.use("/agent-profiles", agentProfileRoutes);
router.use("/search", searchRoutes);
router.use("/uploads", uploadRoutes);
router.use("/pending-posts", pendingPostRoutes);
router.use("/building-edit-requests", buildingEditRequestRoutes);
router.use("/reports", reportRoutes);
router.use("/notifications", notificationRoutes);
router.use("/saved-listings", savedListingRoutes);
router.use("/building-follows", buildingFollowRoutes);
router.use("/lister-reviews", listerReviewRoutes);
router.use("/review-reports", reviewReportRoutes);
router.use("/geocode", geocodeRoutes);
router.use("/admin", adminRoutes);

export default router;
