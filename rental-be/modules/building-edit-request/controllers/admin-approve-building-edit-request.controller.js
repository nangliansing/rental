import { adminApproveBuildingEditRequestService } from "../services/index.js";

export const adminApproveBuildingEditRequestController = async (
  req,
  res,
  next,
) => {
  try {
    const result = await adminApproveBuildingEditRequestService({
      buildingEditRequestId: req.params.buildingEditRequestId,
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
