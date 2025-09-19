import React, { useEffect, useState } from 'react';
import { submissionApi, fileApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Submission, Assignment } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatDate } from '../../utils/date';
import { formatFileSize } from '../../utils/fileValidation';
import { FileText, Download, Calendar, User, CheckCircle } from 'lucide-react';

interface SubmissionsListProps {
    assignment?: Assignment;
    onGradeSubmission?: (submission: Submission) => void;
}

export const SubmissionsList: React.FC<SubmissionsListProps> = ({
                                                                    assignment,
                                                                    onGradeSubmission,
                                                                }) => {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubmissions();
    }, [user, assignment]);

    const fetchSubmissions = async () => {
        if (!user) return;
        setLoading(true);

        try {
            let response;
            if (user.role === 'student') {
                // 학생은 자신의 제출물 목록을 가져옵니다.
                response = await submissionApi.getMySubmissions();
            } else {
                // 교수는 특정 과제의 제출물 목록 또는 모든 제출물 목록을 가져옵니다.
                if (assignment) {
                    response = await submissionApi.getSubmissionsForAssignment(assignment.id);
                } else {
                    response = await submissionApi.getAllSubmissions();
                }
            }
            setSubmissions(response.data || []);
        } catch (error) {
            console.error('Error fetching submissions:', error);
            setSubmissions([]); // 에러 발생 시 목록을 비웁니다.
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadFile = async (filePath: string, filename: string) => {
        try {
            // fileApi를 사용하여 파일 다운로드 URL을 생성하고 다운로드를 트리거합니다.
            const url = await fileApi.download('submission-files', filePath);
            if (url) {
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url); // 메모리 누수 방지를 위해 URL 해제
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Failed to download file.');
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </Card>
                ))}
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <Card className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h4>
                <p className="text-gray-500">
                    {user?.role === 'professor'
                        ? 'Students haven\'t submitted any assignments yet.'
                        : 'You haven\'t submitted any assignments yet.'
                    }
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                    {user?.role === 'professor' ? 'Student Submissions' : 'My Submissions'}
                </h3>
                <p className="text-sm text-gray-500">
                    {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                </p>
            </div>

            <div className="space-y-4">
                {submissions.map(submission => (
                    <Card key={submission.id}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                    <h4 className="text-lg font-semibold text-gray-900">
                                        {submission.assignment?.title}
                                    </h4>
                                    <Badge variant={submission.grade ? 'success' : 'warning'}>
                                        {submission.grade ? 'Graded' : 'Pending'}
                                    </Badge>
                                </div>

                                <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                                    {user?.role === 'professor' && submission.student && (
                                        <div className="flex items-center space-x-1">
                                            <User className="w-4 h-4" />
                                            <span>{submission.student.full_name}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center space-x-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>Submitted: {formatDate(submission.submitted_at)}</span>
                                    </div>

                                    {submission.grade && (
                                        <div className="flex items-center space-x-1">
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            <span className="font-medium text-green-700">
                        {submission.grade.points}/{submission.assignment?.max_points}
                      </span>
                                        </div>
                                    )}
                                </div>

                                {submission.content && (
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-gray-700 mb-1">Text Submission:</p>
                                        <div className="bg-gray-50 p-3 rounded-md">
                                            <p className="text-gray-700 whitespace-pre-wrap line-clamp-3">
                                                {submission.content}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {submission.files && submission.files.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Attached Files:</p>
                                        <div className="space-y-1">
                                            {submission.files.map(file => (
                                                <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                                    <div className="flex items-center space-x-2">
                                                        <FileText className="w-4 h-4 text-gray-500" />
                                                        <span className="text-sm text-gray-700">{file.filename}</span>
                                                        <span className="text-xs text-gray-500">
                              ({formatFileSize(file.file_size)})
                            </span>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDownloadFile(file.file_path, file.filename)}
                                                    >
                                                        <Download className="w-3 h-3 mr-1" />
                                                        Download
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {submission.grade && submission.grade.feedback && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                        <p className="text-sm font-medium text-blue-900 mb-1">Professor Feedback:</p>
                                        <p className="text-blue-800 text-sm">{submission.grade.feedback}</p>
                                    </div>
                                )}
                            </div>

                            {user?.role === 'professor' && onGradeSubmission && (
                                <div className="ml-4">
                                    <Button
                                        variant={submission.grade ? 'outline' : 'primary'}
                                        size="sm"
                                        onClick={() => onGradeSubmission(submission)}
                                    >
                                        {submission.grade ? 'Update Grade' : 'Grade'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};