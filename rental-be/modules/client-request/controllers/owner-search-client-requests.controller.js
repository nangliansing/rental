import { ownerSearchClientRequestsService } from "../services/index.js";

export const ownerSearchClientRequestsController = async (req, res, next) => {
  try {
    const result = await ownerSearchClientRequestsService({
      queryInput: req.query,
      actorId: req.currentUser._id,
      session: req.dbSession ?? null,
    });

    return res.status(200).json({
      success: true,
      data: result.clientRequests,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
