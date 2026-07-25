import { adminDeleteListerReviewService } from "../services/index.js";

export const adminDeleteListerReviewController = async (req, res, next) => {
  try {
    const result = await adminDeleteListerReviewService({
      reviewId: req.params.reviewId,
      actorId: req.currentUser._id,
      body: req.body,
      session: req.dbSession ?? null,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
