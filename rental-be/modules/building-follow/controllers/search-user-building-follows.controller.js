import { searchUserBuildingFollowsService } from "../services/index.js";

export const searchUserBuildingFollowsController = async (req, res, next) => {
  try {
    const result = await searchUserBuildingFollowsService({
      userId: req.params.userId,
      actorId: req.currentUser._id,
      queryInput: req.query,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: {
        followings: result.followings,
      },
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
