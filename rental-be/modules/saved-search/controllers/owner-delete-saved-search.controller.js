import { ownerDeleteSavedSearchService } from "../services/index.js";

export const ownerDeleteSavedSearchController = async (req, res, next) => {
  try {
    const savedSearch = await ownerDeleteSavedSearchService({
      savedSearchId: req.params.savedSearchId,
      actorId: req.currentUser._id,
      session: req.dbSession ?? null,
    });

    return res.status(200).json({
      success: true,
      data: savedSearch,
    });
  } catch (error) {
    return next(error);
  }
};
