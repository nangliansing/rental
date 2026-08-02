import { reverseGeocodeService } from "../services/index.js";

export const reverseGeocodeController = async (req, res, next) => {
  try {
    const data = await reverseGeocodeService({
      bodyInput: req.body,
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
