import { updateListerReviewService } from "../services/index.js";

export const updateListerReviewController = async (req, res, next) => {
  try {
    const result = await updateListerReviewService({
      reviewId: req.params.reviewId,
      actorId: req.user.id,
      body: req.body,
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
