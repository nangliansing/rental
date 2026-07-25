import { AppError } from "../errors/app-error.js";

export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const role = req.currentUser?.role ?? req.user?.role;

        if (!role) {
            return next(
                new AppError(
                    "Authentication required",
                    401,
                    "AUTHENTICATION_REQUIRED"
                )
            );
        }

        if (!allowedRoles.includes(role)) {
            return next(new AppError("Forbidden", 403, "FORBIDDEN"));
        }

        return next();
    };
};
