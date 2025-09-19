// backend/src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validateRequest = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: '입력값이 올바르지 않습니다.',
            details: errors.array().map(err => ({
                field: err.type === 'field' ? err.path : undefined,
                message: err.msg
            }))
        });
    }

    next();
};