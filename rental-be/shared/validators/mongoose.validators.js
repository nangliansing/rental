// src/shared/validators/mongoose.validators.js
import mongoose from "mongoose";
import { AppError } from "../errors/app-error.js";

export const validateMongooseId = (
    input,
    fieldName = "id",
    options = {}
) => {
    const { asObjectId = false } = options;

    if (typeof asObjectId !== "boolean") {
        throw new AppError(
            "asObjectId must be a boolean",
            500,
            "INTERNAL_ERROR"
        );
    }

    let idString;

    if (input instanceof mongoose.Types.ObjectId) {
        idString = input.toString();
    } else if (typeof input === "string") {
        idString = input.trim();
    } else {
        throw new AppError(
            `${fieldName} must be a valid id`,
            422,
            "VALIDATION_ERROR"
        );
    }

    if (
        !mongoose.Types.ObjectId.isValid(idString) ||
        new mongoose.Types.ObjectId(idString).toString() !== idString
    ) {
        throw new AppError(
            `${fieldName} must be a valid id`,
            422,
            "VALIDATION_ERROR"
        );
    }

    if (asObjectId) {
        return new mongoose.Types.ObjectId(idString);
    }

    return idString;
};