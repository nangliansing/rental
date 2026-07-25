// modules/upload/controllers/create-upload-signature.controller.js
import { createUploadSignatureService } from "../services/index.js";

export async function createUploadSignatureController(req, res, next) {
  try {
    const uploadSignature = createUploadSignatureService({
      userId: req.user.id,
      body: req.body,
    });

    return res.status(200).json({
      success: true,
      data: {
        uploadSignature,
      },
    });
  } catch (error) {
    next(error);
  }
}
