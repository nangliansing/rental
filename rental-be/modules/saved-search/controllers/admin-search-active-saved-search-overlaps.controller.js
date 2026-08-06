import { adminSearchActiveSavedSearchOverlapsService } from "../services/index.js";

export const adminSearchActiveSavedSearchOverlapsController = async (
  req,
  res,
  next,
) => {
  try {
    const result = await adminSearchActiveSavedSearchOverlapsService({
      body: req.body,
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
