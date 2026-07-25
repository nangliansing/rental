import { validateNullableObject } from "../../../shared/validators/index.js";
import { buildCreateBuildingRecord } from "../mappers/index.js";
import Building from "../building.model.js";

export const adminCreateBuildingService = async (
  body,
  actorId,
  session = null
) => {
  validateNullableObject(session, "session");

  const record = buildCreateBuildingRecord(body, actorId);

  const [building] = await Building.create(
    [record],
    session ? { session } : undefined
  );

  return building;
};