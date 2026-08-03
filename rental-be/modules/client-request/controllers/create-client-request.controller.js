import { createClientRequestService } from "../services/index.js";

export const createClientRequestController = async (req, res, next) => {
  try {
    const clientRequest = await createClientRequestService(
      req.body,
      req.currentUser._id,
      req.dbSession,
    );

    return res.status(201).json({
      success: true,
      data: clientRequest,
    });
  } catch (error) {
    return next(error);
  }
};
