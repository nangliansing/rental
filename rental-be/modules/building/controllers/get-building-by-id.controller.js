import { attachIsFollowingToBuilding } from "../../building-follow/utils/index.js";
import { getBuildingByIdService } from "../services/index.js";

export const getBuildingByIdController = async (req, res, next) => {
  try {
    const building = await getBuildingByIdService(
      req.params.buildingId,
      req.dbSession,
    );
    const data = await attachIsFollowingToBuilding({
      building,
      viewerUserId: req.user?.id ?? null,
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
