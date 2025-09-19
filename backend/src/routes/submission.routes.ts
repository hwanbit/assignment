// backend/src/routes/submission.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as submissionController from '../controllers/submission.controller';
import multer from 'multer';
import path from 'path';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Multer 설정 - 파일 업로드
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/submissions/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 제한
    },
    fileFilter: (req, file, cb) => {
        // 허용할 파일 형식 설정
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('허용되지 않는 파일 형식입니다.'));
        }
    }
});

// Validation rules
const submitValidation = [
    body('content')
        .trim()
        .isLength({ min: 1 })
        .withMessage('제출 내용을 입력해주세요'),
];

const updateValidation = [
    body('content')
        .optional()
        .trim()
        .isLength({ min: 1 })
        .withMessage('제출 내용을 입력해주세요'),
];

// 학생: 과제 제출
router.post(
    '/assignments/:assignmentId/submit',
    authenticate,
    authorize('STUDENT'),
    param('assignmentId').isUUID().withMessage('유효한 과제 ID가 아닙니다'),
    submitValidation,
    validateRequest,
    submissionController.submitAssignment
);

// 학생: 과제 제출 시 파일 첨부
router.post(
    '/assignments/:assignmentId/submit-with-files',
    authenticate,
    authorize('STUDENT'),
    upload.array('files', 5), // 최대 5개 파일
    param('assignmentId').isUUID().withMessage('유효한 과제 ID가 아닙니다'),
    submissionController.submitAssignmentWithFiles
);

// 학생: 내 제출물 목록 조회
router.get(
    '/my-submissions',
    authenticate,
    authorize('STUDENT'),
    submissionController.getMySubmissions
);

// 학생: 특정 과제에 대한 내 제출물 조회
router.get(
    '/assignments/:assignmentId/my-submission',
    authenticate,
    authorize('STUDENT'),
    param('assignmentId').isUUID().withMessage('유효한 과제 ID가 아닙니다'),
    validateRequest,
    submissionController.getMySubmissionForAssignment
);

// 교수/관리자: 특정 과제의 모든 제출물 조회
router.get(
    '/assignments/:assignmentId/submissions',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('assignmentId').isUUID().withMessage('유효한 과제 ID가 아닙니다'),
    validateRequest,
    submissionController.getAssignmentSubmissions
);

// 교수/관리자: 특정 학생의 모든 제출물 조회
router.get(
    '/students/:studentId/submissions',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('studentId').isUUID().withMessage('유효한 학생 ID가 아닙니다'),
    validateRequest,
    submissionController.getStudentSubmissions
);

// 제출물 상세 조회 (제출한 학생, 교수, 관리자만 가능)
router.get(
    '/:submissionId',
    authenticate,
    param('submissionId').isUUID().withMessage('유효한 제출물 ID가 아닙니다'),
    validateRequest,
    submissionController.getSubmissionDetail
);

// 학생: 제출물 수정 (제출 마감 전까지만)
router.put(
    '/:submissionId',
    authenticate,
    authorize('STUDENT'),
    param('submissionId').isUUID().withMessage('유효한 제출물 ID가 아닙니다'),
    updateValidation,
    validateRequest,
    submissionController.updateSubmission
);

// 학생: 제출물에 파일 추가
router.post(
    '/:submissionId/files',
    authenticate,
    authorize('STUDENT'),
    upload.single('file'),
    param('submissionId').isUUID().withMessage('유효한 제출물 ID가 아닙니다'),
    validateRequest,
    submissionController.addFileToSubmission
);

// 학생: 제출물 파일 삭제
router.delete(
    '/:submissionId/files/:fileId',
    authenticate,
    authorize('STUDENT'),
    param('submissionId').isUUID().withMessage('유효한 제출물 ID가 아닙니다'),
    param('fileId').isUUID().withMessage('유효한 파일 ID가 아닙니다'),
    validateRequest,
    submissionController.removeFileFromSubmission
);

// 학생: 제출물 삭제 (제출 마감 전까지만)
router.delete(
    '/:submissionId',
    authenticate,
    authorize('STUDENT'),
    param('submissionId').isUUID().withMessage('유효한 제출물 ID가 아닙니다'),
    validateRequest,
    submissionController.deleteSubmission
);

// 교수/관리자: 제출물 상태 변경
router.patch(
    '/:submissionId/status',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('submissionId').isUUID().withMessage('유효한 제출물 ID가 아닙니다'),
    body('status')
        .isIn(['PENDING', 'GRADED', 'RETURNED'])
        .withMessage('유효한 상태값이 아닙니다'),
    validateRequest,
    submissionController.updateSubmissionStatus
);

// 통계: 과제별 제출 현황
router.get(
    '/assignments/:assignmentId/statistics',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('assignmentId').isUUID().withMessage('유효한 과제 ID가 아닙니다'),
    validateRequest,
    submissionController.getSubmissionStatistics
);

// 파일 다운로드
router.get(
    '/files/:fileId/download',
    authenticate,
    param('fileId').isUUID().withMessage('유효한 파일 ID가 아닙니다'),
    validateRequest,
    submissionController.downloadFile
);

export default router;