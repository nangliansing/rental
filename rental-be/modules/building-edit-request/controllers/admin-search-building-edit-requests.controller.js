import { adminSearchBuildingEditRequestsService } from "../services/index.js";

export const adminSearchBuildingEditRequestsController = async (
  req,
  res,
  next,
) => {
  try {
    const result = await adminSearchBuildingEditRequestsService(
      req.query,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: result.buildingEditRequests,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
