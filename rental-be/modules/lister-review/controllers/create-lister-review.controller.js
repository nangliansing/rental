import { createListerReviewService } from "../services/index.js";

export const createListerReviewController = async (req, res, next) => {
  try {
    const result = await createListerReviewService({
      listerProfileId: req.params.listerProfileId,
      actorId: req.user.id,
      body: req.body,
      session: req.dbSession,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
