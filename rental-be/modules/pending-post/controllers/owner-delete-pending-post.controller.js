import { ownerDeletePendingPostService } from "../services/index.js";

export const ownerDeletePendingPostController = async (req, res, next) => {
  try {
    const pendingPost = await ownerDeletePendingPostService({
      pendingPostId: req.params.pendingPostId,
      actorId: req.currentUser._id,
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
