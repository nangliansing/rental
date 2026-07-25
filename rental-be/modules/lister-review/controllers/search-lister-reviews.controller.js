import { searchListerReviewsService } from "../services/index.js";

export const searchListerReviewsController = async (req, res, next) => {
  try {
    const result = await searchListerReviewsService({
      listerProfileId: req.params.listerProfileId,
      viewerUserId: req.user?.id,
      queryInput: req.query,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: {
        myReview: result.myReview,
        reviews: result.reviews,
      },
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
