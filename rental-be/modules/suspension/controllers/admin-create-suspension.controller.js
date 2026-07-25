import { adminCreateSuspensionService } from "../services/index.js";

export const adminCreateSuspensionController = async (req, res, next) => {
  try {
    const result = await adminCreateSuspensionService({
      body: req.body,
      actorId: req.user.id,
      session: req.dbSession,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
