import { createUserWithPasswordService } from "../services/index.js";

export const createUserWithPasswordController = async (req, res, next) => {
    try {
        const user = await createUserWithPasswordService(req.body);

        return res.status(201).json({
            success: true,
            data: user,
        });
    } catch (error) {
        return next(error);
    }
};