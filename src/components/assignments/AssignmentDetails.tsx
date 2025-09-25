import React, { useEffect, useState } from 'react';
import {
  assignmentApi,
  submissionApi,
  qaLogApi,
  fileApi
} from '../../lib/api'; // 백엔드 API 모듈 임포트
import { useAuth } from '../../contexts/AuthContext';
import { Assignment, AssignmentFile, Submission, QALog } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDate, isOverdue } from '../../utils/date';
import { formatFileSize } from '../../utils/fileValidation';
import {
  Calendar,
  User,
  FileText,
  Download,
  MessageSquare,
  ArrowLeft,
  Send,
  Clock
} from 'lucide-react';
import { SubmissionForm } from '../submissions/SubmissionForm';

interface AssignmentDetailsProps {
  assignment: Assignment;
  onBack: () => void;
  onSubmissionComplete?: () => void;
}

export const AssignmentDetails: React.FC<AssignmentDetailsProps> = ({
                                                                      assignment,
                                                                      onBack,
                                                                      onSubmissionComplete,
                                                                    }) => {
  const { user } = useAuth();
  const [assignmentFiles, setAssignmentFiles] = useState<AssignmentFile[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [qaLogs, setQALogs] = useState<QALog[]>([]);
  const [question, setQuestion] = useState('');
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignmentData();
    if (user && user.role === 'STUDENT') {
      fetchStudentSubmission();
    } else {
      setLoading(false);
    }
    fetchQALogs();
  }, [assignment.id, user]);

  const fetchAssignmentData = async () => {
    try {
      const { data } = await assignmentApi.getFiles(assignment.id);
      setAssignmentFiles(data || []);
    } catch (error) {
      console.error('Error fetching assignment files:', error);
    }
  };

  const fetchStudentSubmission = async () => {
    if (!user) return;

    try {
      const { data } = await submissionApi.getStudentSubmissionForAssignment(assignment.id);
      setSubmission(data);
    } catch (error) {
      console.log('No submission found for this assignment, which is normal.');
    } finally {
      setLoading(false);
    }
  };

  const fetchQALogs = async () => {
    try {
      const { data } = await qaLogApi.getByAssignmentId(assignment.id);
      setQALogs(data || []);
    } catch (error) {
      console.error('Error fetching Q&A logs:', error);
    }
  };

  const handleDownloadFile = async (file: AssignmentFile) => {
    try {
      const url = await fileApi.download('assignment-files', file.file_path);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !user) return;

    setIsAskingQuestion(true);
    try {
      // 이 부분은 백엔드에서 LLM API를 호출하도록 수정해야 합니다.
      const mockAnswer = `This assignment appears to be about ${assignment.title.toLowerCase()}. Based on the description, you should ${assignment.description.split('.')[0].toLowerCase()}. Make sure to review all the requirements carefully and start early to meet the due date.`;

      await qaLogApi.create({
        assignment_id: assignment.id,
        student_id: user.id,
        question: question.trim(),
        answer: mockAnswer,
        source: 'llm',
      });

      setQuestion('');
      fetchQALogs();
    } catch (error) {
      console.error('Error submitting question:', error);
    } finally {
      setIsAskingQuestion(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  const overdue = isOverdue(assignment.due_date);
  const canSubmit = user && user.role === 'STUDENT' && !overdue;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          과제로 돌아가기
        </Button>
      </div>

      <Card>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{assignment.title}</h2>
            <Badge variant={overdue ? 'danger' : 'success'}>
              {overdue ? '제출 마감' : '제출 가능'}
            </Badge>
          </div>

          <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Due: {formatDate(assignment.due_date)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>{assignment.max_points} points</span>
            </div>
            {assignment.professor && (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Prof. {assignment.professor.full_name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="prose max-w-none">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">설명</h3>
          <p className="text-gray-700 whitespace-pre-wrap mb-6">{assignment.description}</p>
        </div>

        {assignmentFiles.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">첨부된 파일</h3>
            <div className="space-y-2">
              {assignmentFiles.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">{file.filename}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.file_size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadFile(file)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    다운로드
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {user && user.role === 'STUDENT' && (
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">제출물</h3>
              {canSubmit && (
                <Button onClick={() => setShowSubmissionForm(true)}>
                  {submission ? 'Update Submission' : 'Submit Assignment'}
                </Button>
              )}
            </div>

            {submission ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="success">제출됨</Badge>
                  <span className="text-sm text-gray-600">
                    on {formatDate(submission.submitted_at)}
                  </span>
                </div>
                {submission.grade && (
                  <div className="mt-2">
                    <p className="font-semibold text-gray-900">
                      Grade: {submission.grade.points}/{assignment.max_points}
                    </p>
                    {submission.grade.feedback && (
                      <p className="text-gray-700 mt-1">{submission.grade.feedback}</p>
                    )}
                  </div>
                )}
              </div>
            ) : overdue ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">
                  과제 기한이 지났기에 제출이 불가합니다.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  아직 과제를 제출하지 않았습니다.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {user && user.role === 'STUDENT' && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            AI Assistant에게 물어보기
          </h3>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="과제에 대해 질문하세요..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
              />
              <Button
                onClick={handleAskQuestion}
                disabled={!question.trim() || isAskingQuestion}
                isLoading={isAskingQuestion}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {qaLogs.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {qaLogs.map(log => (
                  <div key={log.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <p className="font-medium text-gray-900">Q: {log.question}</p>
                      <Badge variant="info" size="sm">
                        {log.source === 'llm' ? 'AI' : 'Professor'}
                      </Badge>
                    </div>
                    <p className="text-gray-700 mb-2">A: {log.answer}</p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {showSubmissionForm && (
        <SubmissionForm
          assignment={assignment}
          existingSubmission={submission}
          onSubmissionComplete={() => {
            setShowSubmissionForm(false);
            fetchStudentSubmission();
            onSubmissionComplete?.();
          }}
          onCancel={() => setShowSubmissionForm(false)}
        />
      )}
    </div>
  );
};