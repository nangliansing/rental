import { searchBuildingsNearLinesService } from "../services/index.js";

export const searchBuildingsNearLinesController = async (req, res, next) => {
  try {
    const result = await searchBuildingsNearLinesService({
      bodyInput: req.body,
      viewerUserId: req.user?.id ?? null,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
