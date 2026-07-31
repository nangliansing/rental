import { updateCurrentUserService } from "../services/index.js";

export const updateCurrentUserController = async (req, res, next) => {
  try {
    const user = await updateCurrentUserService(
      req.body,
      req.currentUser._id,
      req.dbSession ?? null
    );

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    return next(error);
  }
};
