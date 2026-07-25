import { adminApprovePendingPostService } from "../services/index.js";

export const adminApprovePendingPostController = async (req, res, next) => {
  try {
    const pendingPost = await adminApprovePendingPostService({
      pendingPostId: req.params.pendingPostId,
      actorId: req.currentUser._id,
      body: req.body,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: pendingPost,
    });
  } catch (error) {
    return next(error);
  }
};
