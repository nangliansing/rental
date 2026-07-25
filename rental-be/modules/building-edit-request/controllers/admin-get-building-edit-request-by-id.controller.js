import { adminGetBuildingEditRequestByIdService } from "../services/index.js";

export const adminGetBuildingEditRequestByIdController = async (
  req,
  res,
  next,
) => {
  try {
    const buildingEditRequest = await adminGetBuildingEditRequestByIdService(
      req.params.buildingEditRequestId,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: buildingEditRequest,
    });
  } catch (error) {
    return next(error);
  }
};
