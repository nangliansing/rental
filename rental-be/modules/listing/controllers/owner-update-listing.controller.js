import { ownerUpdateListingService } from "../services/index.js";

export const ownerUpdateListingController = async (req, res, next) => {
  try {
    const listing = await ownerUpdateListingService({
      listingId: req.params.listingId,
      body: req.body,
      actorId: req.currentUser._id,
      session: req.dbSession ?? null,
    });

    return res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    return next(error);
  }
};
