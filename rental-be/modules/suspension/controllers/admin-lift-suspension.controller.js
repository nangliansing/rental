import { adminLiftSuspensionService } from "../services/index.js";

export const adminLiftSuspensionController = async (req, res, next) => {
  try {
    const result = await adminLiftSuspensionService({
      suspensionId: req.params.suspensionId,
      body: req.body,
      actorId: req.user.id,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
