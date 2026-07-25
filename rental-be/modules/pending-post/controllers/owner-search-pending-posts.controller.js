import { ownerSearchPendingPostsService } from "../services/index.js";

export const ownerSearchPendingPostsController = async (req, res, next) => {
  try {
    const result = await ownerSearchPendingPostsService(
      req.query,
      req.currentUser._id,
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
