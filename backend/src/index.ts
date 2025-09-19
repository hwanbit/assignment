// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import assignmentRoutes from './routes/assignment.routes';
import submissionRoutes from './routes/submission.routes';
import gradeRoutes from './routes/grade.routes';
import qaLogRoutes from './routes/qa_logs.routes';
import fileRoutes from './routes/files.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/qa-logs', qaLogRoutes);
app.use('/api/files', fileRoutes);

// 에러 핸들링
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});