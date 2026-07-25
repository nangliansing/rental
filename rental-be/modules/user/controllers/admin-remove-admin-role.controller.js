import { adminRemoveAdminRoleService } from "../services/index.js";

export const adminRemoveAdminRoleController = async (req, res, next) => {
  try {
    const user = await adminRemoveAdminRoleService({
      userId: req.params.userId,
      actorId: req.user.id,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};
