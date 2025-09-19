import React, { useEffect, useState } from 'react';
import { gradeApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Submission } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/date';
import { BarChart3, Calendar, FileText, User } from 'lucide-react';

export const GradesList: React.FC = () => {
    const { user } = useAuth();
    const [gradedSubmissions, setGradedSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGradedSubmissions();
    }, [user]);

    const fetchGradedSubmissions = async () => {
        if (!user) return;

        setLoading(true);
        try {
            let response;
            if (user.role === 'student') {
                // 학생 본인의 성적만 가져옵니다.
                response = await gradeApi.getMyGrades();
            } else {
                // 교수는 모든 학생의 성적을 가져옵니다 (API 구현 필요).
                // 예: response = await gradeApi.getAllGrades();
                // 현재는 학생 API로 임시 대체합니다. 백엔드 구현에 맞춰 수정하세요.
                response = await gradeApi.getMyGrades(); // 이 부분은 교수용 API로 변경해야 합니다.
            }
            setGradedSubmissions(response.data || []);
        } catch (error) {
            console.error('Error fetching graded submissions:', error);
            setGradedSubmissions([]); // 에러 발생 시 빈 배열로 초기화
        } finally {
            setLoading(false);
        }
    };

    const calculateGPA = () => {
        if (gradedSubmissions.length === 0) return 0;

        const totalPercentage = gradedSubmissions.reduce((sum, submission) => {
            if (submission.grade && submission.assignment) {
                return sum + (submission.grade.points / submission.assignment.max_points);
            }
            return sum;
        }, 0);

        return (totalPercentage / gradedSubmissions.length) * 100;
    };

    const getGradeColor = (points: number, maxPoints: number) => {
        const percentage = (points / maxPoints) * 100;
        if (percentage >= 90) return 'success';
        if (percentage >= 80) return 'info';
        if (percentage >= 70) return 'warning';
        return 'danger';
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    {user?.role === 'professor' ? 'All Grades' : 'My Grades'}
                </h3>

                {user?.role === 'student' && gradedSubmissions.length > 0 && (
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Overall Average</p>
                        <p className="text-2xl font-bold text-gray-900">{calculateGPA().toFixed(1)}%</p>
                    </div>
                )}
            </div>

            {gradedSubmissions.length === 0 ? (
                <Card className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No grades available</h4>
                    <p className="text-gray-500">
                        {user?.role === 'professor'
                            ? 'You haven\'t graded any submissions yet.'
                            : 'Your assignments haven\'t been graded yet.'
                        }
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {gradedSubmissions.map(submission => (
                        <Card key={submission.id}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h4 className="text-lg font-semibold text-gray-900">
                                            {submission.assignment?.title}
                                        </h4>
                                        {submission.grade && submission.assignment && (
                                            <Badge
                                                variant={getGradeColor(submission.grade.points, submission.assignment.max_points)}
                                            >
                                                {submission.grade.points}/{submission.assignment.max_points}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
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
                                                <Calendar className="w-4 h-4" />
                                                <span>Graded: {formatDate(submission.grade.graded_at)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {submission.grade?.feedback && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                            <p className="text-sm font-medium text-blue-900 mb-1">Feedback:</p>
                                            <p className="text-blue-800 text-sm">{submission.grade.feedback}</p>
                                        </div>
                                    )}
                                </div>

                                {submission.assignment && submission.grade && (
                                    <div className="text-right ml-4">
                                        <div className="text-2xl font-bold text-gray-900">
                                            {Math.round((submission.grade.points / submission.assignment.max_points) * 100)}%
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {submission.grade.points}/{submission.assignment.max_points} points
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};