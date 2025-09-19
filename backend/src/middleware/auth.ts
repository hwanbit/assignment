// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
    userEmail?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Bearer 토큰 추출
        const authHeader = req.header('Authorization');

        if (!authHeader) {
            return res.status(401).json({
                error: '인증 토큰이 제공되지 않았습니다.'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                error: '유효한 토큰 형식이 아닙니다.'
            });
        }

        // 토큰 검증
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        // 요청 객체에 사용자 정보 추가
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        req.userEmail = decoded.email;

        next();
    } catch (error: any) {
        console.error('Authentication error:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: '토큰이 만료되었습니다.',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: '유효하지 않은 토큰입니다.'
            });
        }

        res.status(401).json({
            error: '인증에 실패했습니다.'
        });
    }
};

export const authorize = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.userRole) {
            return res.status(401).json({
                error: '인증이 필요합니다.'
            });
        }

        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({
                error: '이 작업을 수행할 권한이 없습니다.',
                requiredRoles: allowedRoles,
                currentRole: req.userRole
            });
        }

        next();
    };
};

// 선택적: 소프트 인증 (로그인 안 해도 되지만, 로그인했으면 정보 추가)
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader) {
            return next(); // 토큰이 없어도 진행
        }

        const token = authHeader.replace('Bearer ', '');

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
            req.userId = decoded.userId;
            req.userRole = decoded.role;
            req.userEmail = decoded.email;
        }

        next();
    } catch (error) {
        // 토큰이 유효하지 않아도 진행
        next();
    }
};