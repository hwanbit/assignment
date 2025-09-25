import React, { useEffect, useState } from 'react';
import { assignmentApi, submissionApi } from '../../lib/api.ts';
import { useAuth } from '../../contexts/AuthContext';
import { Assignment, Submission } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatDate, isOverdue, getDaysUntilDue } from '../../utils/date';
import { Calendar, FileText, User, Eye, Edit, Trash2 } from 'lucide-react';

interface AssignmentListProps {
    onSelectAssignment: (assignment: Assignment) => void;
    onEditAssignment?: (assignment: Assignment) => void;
    refreshTrigger?: number;
}

export const AssignmentList: React.FC<AssignmentListProps> = ({
                                                                  onSelectAssignment,
                                                                  onEditAssignment,
                                                                  refreshTrigger,
                                                              }) => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'모두' | '진행중' | '기한 경과' | '완료됨'>('모두');

    useEffect(() => {
        // 기존 fetchAssignments 함수를 아래와 같이 수정합니다.
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // 과제 목록과 학생 제출 목록을 함께 불러옵니다.
                const assignmentPromise = assignmentApi.getAll();
                const submissionPromise = user.role === 'STUDENT'
                    ? submissionApi.getMySubmissions()
                    : Promise.resolve({ data: [] });

                const [assignmentResponse, submissionResponse] = await Promise.all([
                    assignmentPromise,
                    submissionPromise,
                ]);

                setAssignments(assignmentResponse.data || []);
                setSubmissions(submissionResponse.data || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, refreshTrigger]);

    const handleDeleteAssignment = async (assignmentId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this assignment?')) {
            return;
        }
        try {
            // 새로운 axios 호출 로직
            await assignmentApi.delete(assignmentId);
            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
        } catch (error) {
            console.error('Error deleting assignment:', error);
        }
    };

    const completedAssignmentIds = new Set(submissions.map(sub => sub.assignment_id));

    const filteredAssignments = assignments.filter(assignment => {
        const isCompleted = completedAssignmentIds.has(assignment.id);
        const overdue = isOverdue(assignment.due_date);

        switch (filter) {
            case '진행중':
                return !overdue && !isCompleted;
            case '기한 경과':
                return overdue && !isCompleted;
            case '완료됨':
                return isCompleted;
            default:
                return true;
        }
    });

    const getStatusBadge = (assignment: Assignment) => {
        if (completedAssignmentIds.has(assignment.id)) {
            return <Badge variant="success">완료됨</Badge>;
        }
        if (isOverdue(assignment.due_date)) {
            return <Badge variant="danger">기한 경과</Badge>;
        }
        const daysUntilDue = getDaysUntilDue(assignment.due_date);
        if (daysUntilDue <= 3) {
            return <Badge variant="warning">곧 마감됨</Badge>;
        }
        return <Badge variant="info">진행중</Badge>;
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
                <h3 className="text-lg font-semibold text-gray-900">
                    {user?.role === 'PROFESSOR' ? '모든 과제' : '내 과제'}
                </h3>

                <div className="flex space-x-2">
                    {['모두', '진행중', '기한 경과', '완료됨'].map(filterOption => (
                        <Button
                            key={filterOption}
                            variant={filter === filterOption ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setFilter(filterOption as any)}
                        >
                            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                        </Button>
                    ))}
                </div>
            </div>

            {filteredAssignments.length === 0 ? (
                <Card className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">과제가 없습니다.</h4>
                    <p className="text-gray-500">
                        {filter === '모두'
                            ? '아직 과제가 할당되지 않았습니다.'
                            : `${filter} 과제를 찾을 수 없습니다.`
                        }
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredAssignments.map(assignment => (
                        <Card
                            key={assignment.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => onSelectAssignment(assignment)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h4 className="text-lg font-semibold text-gray-900">
                                            {assignment.title}
                                        </h4>
                                        {getStatusBadge(assignment)}
                                    </div>

                                    <p className="text-gray-600 mb-3 line-clamp-2">
                                        {assignment.description}
                                    </p>

                                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                                        <div className="flex items-center space-x-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>Due: {formatDate(assignment.due_date)}</span>
                                        </div>

                                        {assignment.professor && (
                                            <div className="flex items-center space-x-1">
                                                <User className="w-4 h-4" />
                                                <span>{assignment.professor.full_name}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center space-x-1">
                                            <FileText className="w-4 h-4" />
                                            <span>{assignment.max_points} points</span>
                                        </div>
                                    </div>
                                </div>

                                {user?.role === 'PROFESSOR' && user.id === assignment.professor_id && (
                                    <div className="flex space-x-2 ml-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectAssignment(assignment);
                                            }}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        {onEditAssignment && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditAssignment(assignment);
                                                }}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => handleDeleteAssignment(assignment.id, e)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
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