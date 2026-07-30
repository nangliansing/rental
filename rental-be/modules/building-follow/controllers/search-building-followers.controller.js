import { searchBuildingFollowersService } from "../services/index.js";

export const searchBuildingFollowersController = async (req, res, next) => {
  try {
    const result = await searchBuildingFollowersService({
      buildingId: req.params.buildingId,
      queryInput: req.query,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: {
        followers: result.followers,
      },
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
