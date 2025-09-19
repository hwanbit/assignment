// backend/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// JWT 토큰 생성 함수
const generateTokens = (userId: string, role: string) => {
    const accessToken = jwt.sign(
        { userId, role },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' } // 15분
    );

    const refreshToken = jwt.sign(
        { userId, role },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!,
        { expiresIn: '7d' } // 7일
    );

    return { accessToken, refreshToken };
};

// 회원가입
export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, fullName, role } = req.body;

        // 이메일 중복 체크
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(409).json({
                error: '이미 사용 중인 이메일입니다.'
            });
        }

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        // 사용자 생성
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: fullName,
                role: role || 'STUDENT'
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });

        // 토큰 생성
        const { accessToken, refreshToken } = generateTokens(user.id, user.role);

        res.status(201).json({
            message: '회원가입이 완료되었습니다.',
            token: accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.name,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            error: '회원가입 처리 중 오류가 발생했습니다.'
        });
    }
};

// 로그인
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // 사용자 찾기
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({
                error: '이메일 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        // 비밀번호 확인
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                error: '이메일 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        // 토큰 생성
        const { accessToken, refreshToken } = generateTokens(user.id, user.role);

        res.json({
            message: '로그인되었습니다.',
            token: accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.name,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: '로그인 처리 중 오류가 발생했습니다.'
        });
    }
};

// 현재 사용자 정보 조회
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                error: '사용자를 찾을 수 없습니다.'
            });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.name,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            error: '사용자 정보 조회 중 오류가 발생했습니다.'
        });
    }
};

// 프로필 업데이트
export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { fullName, email } = req.body;
        const updateData: any = {};

        if (fullName) updateData.name = fullName;

        // 이메일 변경 시 중복 체크
        if (email && email !== req.userEmail) {
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                return res.status(409).json({
                    error: '이미 사용 중인 이메일입니다.'
                });
            }
            updateData.email = email;
        }

        const user = await prisma.user.update({
            where: { id: req.userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                updatedAt: true
            }
        });

        res.json({
            message: '프로필이 업데이트되었습니다.',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.name,
                role: user.role,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: '프로필 업데이트 중 오류가 발생했습니다.'
        });
    }
};

// 비밀번호 변경
export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // 현재 사용자 조회
        const user = await prisma.user.findUnique({
            where: { id: req.userId }
        });

        if (!user) {
            return res.status(404).json({
                error: '사용자를 찾을 수 없습니다.'
            });
        }

        // 현재 비밀번호 확인
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                error: '현재 비밀번호가 올바르지 않습니다.'
            });
        }

        // 새 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 비밀번호 업데이트
        await prisma.user.update({
            where: { id: req.userId },
            data: { password: hashedPassword }
        });

        res.json({
            message: '비밀번호가 변경되었습니다.'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: '비밀번호 변경 중 오류가 발생했습니다.'
        });
    }
};

// 리프레시 토큰으로 새 액세스 토큰 발급
export const refreshToken = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                error: '리프레시 토큰이 필요합니다.'
            });
        }

        // 리프레시 토큰 검증
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!
        ) as any;

        // 새 토큰 생성
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            generateTokens(decoded.userId, decoded.role);

        res.json({
            token: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({
            error: '유효하지 않은 리프레시 토큰입니다.'
        });
    }
};

// 로그아웃 (선택적 - 클라이언트에서 토큰 삭제만 해도 됨)
export const logout = async (req: AuthRequest, res: Response) => {
    try {
        // 서버 측에서 토큰 블랙리스트 관리 등의 추가 작업 가능
        // 예: Redis에 토큰 저장하여 무효화

        res.json({
            message: '로그아웃되었습니다.'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: '로그아웃 처리 중 오류가 발생했습니다.'
        });
    }
};

// 비밀번호 찾기 (이메일 발송)
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // 보안상 사용자 존재 여부를 알려주지 않음
            return res.json({
                message: '이메일이 등록되어 있다면 비밀번호 재설정 링크가 발송됩니다.'
            });
        }

        // TODO: 비밀번호 재설정 토큰 생성 및 이메일 발송
        // const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
        // await sendPasswordResetEmail(email, resetToken);

        res.json({
            message: '이메일이 등록되어 있다면 비밀번호 재설정 링크가 발송됩니다.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            error: '비밀번호 찾기 처리 중 오류가 발생했습니다.'
        });
    }
};

// 비밀번호 재설정
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        // 토큰 검증
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        // 새 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 비밀번호 업데이트
        await prisma.user.update({
            where: { id: decoded.userId },
            data: { password: hashedPassword }
        });

        res.json({
            message: '비밀번호가 재설정되었습니다.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(400).json({
            error: '유효하지 않거나 만료된 토큰입니다.'
        });
    }
};