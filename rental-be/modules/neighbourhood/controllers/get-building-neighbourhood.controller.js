import { getBuildingNeighbourhoodService } from "../services/index.js";

export const getBuildingNeighbourhoodController = async (req, res, next) => {
  try {
    const data = await getBuildingNeighbourhoodService({
      buildingIdInput: req.params.buildingId,
      queryInput: req.query,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};
