import {
    validateMongooseId,
    validateNullableObject,
} from "../../../shared/validators/index.js";
import { buildSafeUserResponse } from "../mappers/index.js";
import { assertActiveUser } from "../utils/index.js";
import User from "../user.model.js";

export async function getCurrentUserService(userId, session = null) {
    validateNullableObject(session, "session");
    validateMongooseId(userId, "userId");

    const query = User.findById(userId).select("-password");

    if (session) {
        query.session(session);
    }

    const user = await query;

    assertActiveUser(user);

    return buildSafeUserResponse(user);
}
