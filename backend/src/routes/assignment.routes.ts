// backend/src/routes/assignment.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as assignmentController from '../controllers/assignment.controller';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/assignments/' });

// 모든 과제 조회
router.get('/', authenticate, assignmentController.getAllAssignments);

// 과제 생성 (교사만)
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), assignmentController.createAssignment);

// 파일 업로드
router.post('/:id/upload', authenticate, authorize('TEACHER', 'ADMIN'),
    upload.single('file'), assignmentController.uploadAttachment);

// 과제 상세 조회
router.get('/:id', authenticate, assignmentController.getAssignment);

// 과제 수정 (교사만)
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), assignmentController.updateAssignment);

// 과제 삭제 (교사만)
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), assignmentController.deleteAssignment);

export default router;