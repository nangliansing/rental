import { ownerUpdateClientRequestService } from "../services/index.js";

export const ownerUpdateClientRequestController = async (req, res, next) => {
  try {
    const clientRequest = await ownerUpdateClientRequestService({
      clientRequestId: req.params.clientRequestId,
      body: req.body,
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
