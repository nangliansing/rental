import { ownerUpdateClientRequestStatusService } from "../services/index.js";

export const ownerUpdateClientRequestStatusController = async (
  req,
  res,
  next,
) => {
  try {
    const clientRequest = await ownerUpdateClientRequestStatusService({
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
