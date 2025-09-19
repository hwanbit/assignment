// backend/src/routes/grade.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as gradeController from '../controllers/grade.controller';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Validation rules
const gradeValidation = [
    body('score')
        .isInt({ min: 0 })
        .withMessage('점수는 0 이상의 정수여야 합니다')
        .custom((value, { req }) => {
            // maxScore와 비교는 컨트롤러에서 처리
            return true;
        }),
    body('feedback')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('피드백은 1000자 이내로 작성해주세요'),
];

const updateGradeValidation = [
    body('score')
        .optional()
        .isInt({ min: 0 })
        .withMessage('점수는 0 이상의 정수여야 합니다'),
    body('feedback')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('피드백은 1000자 이내로 작성해주세요'),
];

// 교수/관리자: 제출물 채점
router.post(
    '/submissions/:submissionId/grade',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('submissionId').isUUID().withMessage('유효한 제출물 ID가 아닙니다'),
    gradeValidation,
    validateRequest,
    gradeController.gradeSubmission
);

// 교수/관리자: 여러 제출물 일괄 채점
router.post(
    '/batch-grade',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    body('grades').isArray().withMessage('grades는 배열이어야 합니다'),
    body('grades.*.submissionId').isUUID().withMessage('유효한 제출물 ID가 아닙니다'),
    body('grades.*.score').isInt({ min: 0 }).withMessage('점수는 0 이상의 정수여야 합니다'),
    body('grades.*.feedback').optional().trim().isLength({ max: 1000 }),
    validateRequest,
    gradeController.batchGradeSubmissions
);

// 학생: 내 성적 조회
router.get(
    '/my-grades',
    authenticate,
    authorize('STUDENT'),
    query('assignmentId').optional().isUUID().withMessage('유효한 과제 ID가 아닙니다'),
    validateRequest,
    gradeController.getMyGrades
);

// 학생: 특정 제출물의 성적 조회
router.get(
    '/submissions/:submissionId/grade',
    authenticate,
    param('submissionId').isUUID().withMessage('유효한 제출물 ID가 아닙니다'),
    validateRequest,
    gradeController.getGradeForSubmission
);

// 교수/관리자: 특정 과제의 모든 성적 조회
router.get(
    '/assignments/:assignmentId/grades',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('assignmentId').isUUID().withMessage('유효한 과제 ID가 아닙니다'),
    query('includeUngraded').optional().isBoolean().withMessage('includeUngraded는 boolean이어야 합니다'),
    validateRequest,
    gradeController.getAssignmentGrades
);

// 교수/관리자: 특정 학생의 모든 성적 조회
router.get(
    '/students/:studentId/grades',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('studentId').isUUID().withMessage('유효한 학생 ID가 아닙니다'),
    validateRequest,
    gradeController.getStudentGrades
);

// 성적 상세 조회 (해당 학생, 교수, 관리자만 가능)
router.get(
    '/:gradeId',
    authenticate,
    param('gradeId').isUUID().withMessage('유효한 성적 ID가 아닙니다'),
    validateRequest,
    gradeController.getGradeDetail
);

// 교수/관리자: 성적 수정
router.put(
    '/:gradeId',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('gradeId').isUUID().withMessage('유효한 성적 ID가 아닙니다'),
    updateGradeValidation,
    validateRequest,
    gradeController.updateGrade
);

// 교수/관리자: 성적 삭제 (채점 취소)
router.delete(
    '/:gradeId',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('gradeId').isUUID().withMessage('유효한 성적 ID가 아닙니다'),
    validateRequest,
    gradeController.deleteGrade
);

// 통계: 과제별 성적 통계
router.get(
    '/assignments/:assignmentId/statistics',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('assignmentId').isUUID().withMessage('유효한 과제 ID가 아닙니다'),
    validateRequest,
    gradeController.getGradeStatistics
);

// 통계: 학생별 성적 통계
router.get(
    '/students/:studentId/statistics',
    authenticate,
    param('studentId').isUUID().withMessage('유효한 학생 ID가 아닙니다'),
    validateRequest,
    gradeController.getStudentGradeStatistics
);

// 성적 내보내기 (CSV)
router.get(
    '/assignments/:assignmentId/export',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('assignmentId').isUUID().withMessage('유효한 과제 ID가 아닙니다'),
    query('format').optional().isIn(['csv', 'excel']).withMessage('지원하지 않는 형식입니다'),
    validateRequest,
    gradeController.exportGrades
);

// 성적 분포 조회
router.get(
    '/assignments/:assignmentId/distribution',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('assignmentId').isUUID().withMessage('유효한 과제 ID가 아닙니다'),
    query('interval').optional().isInt({ min: 1, max: 100 }).withMessage('interval은 1-100 사이의 값이어야 합니다'),
    validateRequest,
    gradeController.getGradeDistribution
);

// 학생 순위 조회 (선택적 - 공개 설정에 따라)
router.get(
    '/assignments/:assignmentId/rankings',
    authenticate,
    param('assignmentId').isUUID().withMessage('유효한 과제 ID가 아닙니다'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit은 1-100 사이의 값이어야 합니다'),
    validateRequest,
    gradeController.getGradeRankings
);

// 성적 히스토리 조회 (수정 이력)
router.get(
    '/:gradeId/history',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('gradeId').isUUID().withMessage('유효한 성적 ID가 아닙니다'),
    validateRequest,
    gradeController.getGradeHistory
);

// 피드백 템플릿 관리 (교수용)
router.get(
    '/feedback-templates',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    gradeController.getFeedbackTemplates
);

router.post(
    '/feedback-templates',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    body('title').trim().isLength({ min: 1, max: 100 }).withMessage('템플릿 제목을 입력해주세요'),
    body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('템플릿 내용을 입력해주세요'),
    validateRequest,
    gradeController.createFeedbackTemplate
);

router.delete(
    '/feedback-templates/:templateId',
    authenticate,
    authorize('PROFESSOR', 'ADMIN'),
    param('templateId').isUUID().withMessage('유효한 템플릿 ID가 아닙니다'),
    validateRequest,
    gradeController.deleteFeedbackTemplate
);

export default router;