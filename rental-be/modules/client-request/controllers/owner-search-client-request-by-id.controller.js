import { ownerSearchClientRequestByIdService } from "../services/index.js";

export const ownerSearchClientRequestByIdController = async (
  req,
  res,
  next,
) => {
  try {
    const clientRequest = await ownerSearchClientRequestByIdService({
      clientRequestId: req.params.clientRequestId,
      actorId: req.currentUser._id,
      session: req.dbSession ?? null,
    });

    return res.status(200).json({
      success: true,
      data: clientRequest,
    });
  } catch (error) {
    return next(error);
  }
};
