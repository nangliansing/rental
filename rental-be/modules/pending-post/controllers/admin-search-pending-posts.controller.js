import { adminSearchPendingPostsService } from "../services/index.js";

export const adminSearchPendingPostsController = async (req, res, next) => {
  try {
    const result = await adminSearchPendingPostsService(
      req.query,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: result.pendingPosts,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
