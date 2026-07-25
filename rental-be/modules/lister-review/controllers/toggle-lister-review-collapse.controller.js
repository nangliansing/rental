import { toggleListerReviewCollapseService } from "../services/index.js";

export const toggleListerReviewCollapseController = async (req, res, next) => {
  try {
    const review = await toggleListerReviewCollapseService({
      reviewId: req.params.reviewId,
      actorId: req.user.id,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    return next(error);
  }
};
