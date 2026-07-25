import { adminRejectBuildingEditRequestService } from "../services/index.js";

export const adminRejectBuildingEditRequestController = async (
  req,
  res,
  next,
) => {
  try {
    const buildingEditRequest = await adminRejectBuildingEditRequestService({
      buildingEditRequestId: req.params.buildingEditRequestId,
      actorId: req.user.id,
      body: req.body,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: buildingEditRequest,
    });
  } catch (error) {
    return next(error);
  }
};
