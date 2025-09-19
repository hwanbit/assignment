// backend/src/routes/files.routes.ts
import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// 파일 다운로드 라우트
router.get('/download', (req, res) => {
    const { type, filePath } = req.query; // 쿼리 파라미터로 파일 경로를 받음

    if (!filePath || typeof filePath !== 'string') {
        return res.status(400).send('File path is required.');
    }

    // 파일이 저장된 실제 경로를 구성
    const absolutePath = path.join(__dirname, '..', '..', 'uploads', type, path.basename(filePath));

    // 파일이 존재하는지 확인
    if (fs.existsSync(absolutePath)) {
        res.download(absolutePath, path.basename(filePath));
    } else {
        res.status(404).send('File not found.');
    }
});

export default router;