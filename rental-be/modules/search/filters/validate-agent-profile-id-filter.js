import { validateMongooseId } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

export const validateAgentProfileIdFilter = (
  input,
  fieldName = "agentProfileIds"
) => {
  if (input === undefined || input === null) return [];

  if (!Array.isArray(input)) {
    throw new AppError(
      `${fieldName} must be an array`,
      422,
      "VALIDATION_ERROR"
    );
  }

  const ids = input.map((id) =>
    validateMongooseId(id, fieldName, { asObjectId: true })
  );

  return [...new Map(ids.map((id) => [id.toString(), id])).values()];
};
