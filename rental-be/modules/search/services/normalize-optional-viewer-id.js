// modules/search/services/normalize-optional-viewer-id.js
import { validateMongooseId } from "../../../shared/validators/index.js";

export const normalizeOptionalViewerId = (viewerUserId = null) => {
  if (!viewerUserId) {
    return null;
  }

  return validateMongooseId(viewerUserId, "viewerUserId", {
    asObjectId: true,
  });
};
