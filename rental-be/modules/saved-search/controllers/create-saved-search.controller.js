import { createSavedSearchService } from "../services/index.js";

export const createSavedSearchController = async (req, res, next) => {
  try {
    const savedSearch = await createSavedSearchService(
      req.body,
      req.currentUser._id,
      req.dbSession,
    );

    return res.status(201).json({
      success: true,
      data: savedSearch,
    });
  } catch (error) {
    return next(error);
  }
};
