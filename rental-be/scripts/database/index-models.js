import AgentProfile from "../../modules/agent/agent-profile.model.js";
import AuthIdentity from "../../modules/auth-identity/auth-identity.model.js";
import BuildingEditRequest from "../../modules/building-edit-request/building-edit-request.model.js";
import BuildingFollow from "../../modules/building-follow/building-follow.model.js";
import Building from "../../modules/building/building.model.js";
import ClientRequest from "../../modules/client-request/client-request.model.js";
import ListerReview from "../../modules/lister-review/lister-review.model.js";
import Listing from "../../modules/listing/listing.model.js";
import Notification from "../../modules/notification/notification.model.js";
import PendingPost from "../../modules/pending-post/pending-post.model.js";
import Report from "../../modules/report/report.model.js";
import ReviewReport from "../../modules/review-report/review-report.model.js";
import SavedListing from "../../modules/saved-listing/saved-listing.model.js";
import Suspension from "../../modules/suspension/suspension.model.js";
import User from "../../modules/user/user.model.js";

export const indexModels = Object.freeze([
  User,
  AuthIdentity,
  AgentProfile,
  Building,
  Listing,
  PendingPost,
  Notification,
  SavedListing,
  BuildingFollow,
  Report,
  ReviewReport,
  Suspension,
  BuildingEditRequest,
  ListerReview,
  ClientRequest,
]);
