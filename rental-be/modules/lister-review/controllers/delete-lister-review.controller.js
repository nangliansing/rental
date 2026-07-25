import { deleteListerReviewService } from "../services/index.js";

export const deleteListerReviewController = async (req, res, next) => {
  try {
    const result = await deleteListerReviewService({
      reviewId: req.params.reviewId,
      actorId: req.user.id,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
