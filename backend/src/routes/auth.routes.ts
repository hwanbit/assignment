// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body } from 'express-validator';

const router = Router();

// 회원가입 validation rules
const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('유효한 이메일을 입력해주세요'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('비밀번호는 최소 6자 이상이어야 합니다'),
    body('fullName')
        .trim()
        .isLength({ min: 2 })
        .withMessage('이름은 최소 2자 이상이어야 합니다'),
    body('role')
        .isIn(['STUDENT', 'PROFESSOR', 'ADMIN'])
        .withMessage('유효한 역할을 선택해주세요'),
];

// 로그인 validation rules
const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('유효한 이메일을 입력해주세요'),
    body('password')
        .notEmpty()
        .withMessage('비밀번호를 입력해주세요'),
];

// 프로필 업데이트 validation rules
const updateProfileValidation = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('이름은 최소 2자 이상이어야 합니다'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('유효한 이메일을 입력해주세요'),
];

// 비밀번호 변경 validation rules
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('현재 비밀번호를 입력해주세요'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('새 비밀번호는 최소 6자 이상이어야 합니다'),
];

// Public routes (인증 불필요)
router.post('/register', registerValidation, validateRequest, authController.register);
router.post('/login', loginValidation, validateRequest, authController.login);
router.post('/refresh', authController.refreshToken); // 리프레시 토큰
router.post('/forgot-password', authController.forgotPassword); // 비밀번호 찾기
router.post('/reset-password', authController.resetPassword); // 비밀번호 재설정

// Protected routes (인증 필요)
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/profile', authenticate, updateProfileValidation, validateRequest, authController.updateProfile);
router.post('/change-password', authenticate, changePasswordValidation, validateRequest, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

export default router;