import { clearRefreshTokenCookie } from "../../../shared/auth/index.js";
import { refreshAccessTokenService } from "../services/index.js";

export const refreshAccessTokenController = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        const result = await refreshAccessTokenService(refreshToken);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error?.code === "INVALID_REFRESH_TOKEN") {
            clearRefreshTokenCookie(res);
        }

        return next(error);
    }
};
