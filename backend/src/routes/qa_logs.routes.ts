// backend/src/routes/qa_logs.routes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 특정 과제에 대한 Q&A 기록 조회
router.get('/assignments/:assignmentId', async (req, res) => {
    const { assignmentId } = req.params;
    try {
        const qaLogs = await prisma.qALog.findMany({
            where: {
                assignmentId: parseInt(assignmentId),
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        res.json(qaLogs);
    } catch (error) {
        console.error('Error fetching Q&A logs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Q&A 질문 등록 (LLM API 호출 포함)
router.post('/', async (req, res) => {
    const { assignment_id, student_id, question } = req.body;

    // 이 부분에서 LLM API를 호출하는 로직을 구현합니다.
    // 현재는 더미 답변을 사용합니다.
    const mockAnswer = `This assignment appears to be about a detailed analysis. Based on your question, you should focus on the core concepts presented in the material.`;

    try {
        const newLog = await prisma.qALog.create({
            data: {
                assignmentId: assignment_id,
                studentId: student_id,
                question,
                answer: mockAnswer,
                source: 'llm',
            },
        });
        res.status(201).json(newLog);
    } catch (error) {
        console.error('Error submitting question:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;