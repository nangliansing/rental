import { createBuildingFollowService } from "../services/index.js";

export const createBuildingFollowController = async (req, res, next) => {
  try {
    const buildingFollow = await createBuildingFollowService({
      buildingId: req.params.buildingId,
      actorId: req.currentUser._id,
      session: req.dbSession,
    });

    return res.status(201).json({
      success: true,
      data: buildingFollow,
    });
  } catch (error) {
    return next(error);
  }
};
