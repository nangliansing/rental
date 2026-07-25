import { getBuildingByIdService } from "../services/index.js";

export const getBuildingByIdController = async (req, res, next) => {
  try {
    const building = await getBuildingByIdService(
      req.params.buildingId,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: building,
    });
  } catch (error) {
    return next(error);
  }
};
