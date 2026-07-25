// modules/user/controllers/get-current-user.controller.js
import { getCurrentUserService } from "../services/index.js";

export async function getCurrentUserController(req, res, next) {
    try {
        const user = await getCurrentUserService(req.user.id);

        return res.status(200).json({
            success: true,
            data: {
                user,
            },
        });
    } catch (error) {
        next(error);
    }
}