import { ownerUpdateSavedSearchService } from "../services/index.js";

export const ownerUpdateSavedSearchController = async (req, res, next) => {
  try {
    const savedSearch = await ownerUpdateSavedSearchService({
      savedSearchId: req.params.savedSearchId,
      body: req.body,
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
