import { deleteBuildingFollowService } from "../services/index.js";

export const deleteBuildingFollowController = async (req, res, next) => {
  try {
    const buildingFollow = await deleteBuildingFollowService({
      buildingId: req.params.buildingId,
      actorId: req.currentUser._id,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: buildingFollow,
    });
  } catch (error) {
    return next(error);
  }
};
