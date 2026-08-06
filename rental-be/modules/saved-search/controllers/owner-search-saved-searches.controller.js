import { ownerSearchSavedSearchesService } from "../services/index.js";

export const ownerSearchSavedSearchesController = async (req, res, next) => {
  try {
    const result = await ownerSearchSavedSearchesService({
      queryInput: req.query,
      actorId: req.currentUser._id,
      session: req.dbSession ?? null,
    });

    return res.status(200).json({
      success: true,
      data: result.savedSearches,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
