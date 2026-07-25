import { createBuildingEditRequestService } from "../services/index.js";

export const createBuildingEditRequestController = async (req, res, next) => {
  try {
    const buildingEditRequest = await createBuildingEditRequestService(
      req.body,
      req.user.id,
      req.dbSession,
    );

    return res.status(201).json({
      success: true,
      data: buildingEditRequest,
    });
  } catch (error) {
    return next(error);
  }
};
