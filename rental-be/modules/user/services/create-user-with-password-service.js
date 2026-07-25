import bcrypt from "bcrypt";
import { validateNullableObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { buildCreateUserWithPasswordRecord } from "../mappers/index.js";
import User from "../user.model.js";

const SALT_ROUNDS = 12;

export const createUserWithPasswordService = async (body, session = null) => {
    validateNullableObject(session, "session");

    const record = buildCreateUserWithPasswordRecord(body);
    const passwordHash = await bcrypt.hash(record.password, SALT_ROUNDS);

    const { password, ...userRecord } = record;

    try {
        const [user] = await User.create(
            [
                {
                    ...userRecord,
                    password: passwordHash,
                },
            ],
            session ? { session } : undefined
        );

        const safeUser = user.toObject();
        delete safeUser.password;

        return safeUser;
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError(
                "Unable to create account with these details",
                409,
                "ACCOUNT_CREATE_FAILED"
            );
        }

        throw error;
    }
};