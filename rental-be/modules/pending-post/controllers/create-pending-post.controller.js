import { createPendingPostService } from "../services/index.js";

export const createPendingPostController = async (req, res, next) => {
  try {
    const pendingPost = await createPendingPostService(
      req.body,
      req.currentUser._id,
      req.dbSession,
    );

    return res.status(201).json({
      success: true,
      data: pendingPost,
    });
  } catch (error) {
    return next(error);
  }
};
