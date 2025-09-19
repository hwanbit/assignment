import React, { useState, useRef, useEffect } from 'react';
import { submissionApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Assignment, Submission } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { validateFile, formatFileSize } from '../../utils/fileValidation';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { isOverdue } from '../../utils/date';

interface SubmissionFormProps {
    assignment: Assignment;
    onSubmissionSaved: (submission: Submission) => void;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
                                                                  assignment,
                                                                  onSubmissionSaved,
                                                              }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const assignmentOverdue = isOverdue(assignment.due_date);

    useEffect(() => {
        const fetchExistingSubmission = async () => {
            if (!user || !assignment) return;
            setIsFetching(true);
            try {
                // 학생이 이 과제에 대해 제출한 기존 내역을 가져옵니다.
                const { data } = await submissionApi.getStudentSubmissionForAssignment(assignment.id);
                if (data) {
                    setExistingSubmission(data);
                    setContent(data.content || '');
                    // 기존 파일 목록은 표시하되, 새로 업로드하는 파일과 별도로 관리합니다.
                    // 이 예제에서는 기존 파일 목록을 폼에 다시 로드하지는 않습니다.
                    // 필요시 data.files를 상태에 저장하여 UI에 표시할 수 있습니다.
                }
            } catch (err: any) {
                if (err.response && err.response.status !== 404) {
                    console.error('Error fetching existing submission:', err);
                    setError('Failed to load submission status.');
                }
                // 404는 제출물이 없는 정상이므로 에러 처리 안 함
            } finally {
                setIsFetching(false);
            }
        };

        fetchExistingSubmission();
    }, [assignment, user]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const validFiles: File[] = [];
        const errors: string[] = [];

        files.forEach(file => {
            const validation = validateFile(file);
            if (validation.isValid) {
                validFiles.push(file);
            } else {
                errors.push(`${file.name}: ${validation.error}`);
            }
        });

        if (errors.length > 0) {
            setError(errors.join('\n'));
        } else {
            setError('');
        }

        setSelectedFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !assignment) return;

        if (assignmentOverdue && !existingSubmission) {
            if (!window.confirm('This assignment is overdue. Late submissions may be penalized. Do you want to continue?')) {
                return;
            }
        }

        setIsLoading(true);
        setError('');

        const data = new FormData();
        data.append('content', content);
        selectedFiles.forEach(file => {
            data.append('files', file); // 백엔드에서 받을 키 이름 'files'
        });

        try {
            let response;
            if (existingSubmission) {
                // 기존 제출물 업데이트 (PUT 요청)
                // 백엔드 API 명세에 따라 submissionApi.update(...) 등으로 변경 필요
                // 여기서는 create를 사용하되, 백엔드에서 upsert 로직을 처리한다고 가정합니다.
                response = await submissionApi.create(assignment.id, data);
            } else {
                // 새 제출물 생성 (POST 요청)
                response = await submissionApi.create(assignment.id, data);
            }

            onSubmissionSaved(response.data);
            setSelectedFiles([]); // 성공 시 파일 목록 초기화
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'An error occurred';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return <Card className="p-6 text-center">Loading submission status...</Card>;
    }

    // 채점이 완료된 경우 폼 비활성화
    if (existingSubmission?.grade) {
        return (
            <Card className="p-6">
                <div className="flex items-center space-x-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                        <h4 className="text-lg font-semibold text-gray-900">Submission Graded</h4>
                        <p className="text-gray-600">
                            Your submission has been graded. You cannot make further changes.
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    // 마감 기한이 지났고, 제출물도 없는 경우
    if (assignmentOverdue && !existingSubmission) {
        return (
            <Card className="p-6">
                <div className="flex items-center space-x-3">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <div>
                        <h4 className="text-lg font-semibold text-gray-900">Assignment Overdue</h4>
                        <p className="text-gray-600">
                            The deadline for this assignment has passed.
                        </p>
                    </div>
                </div>
                {/* 마감 후 제출을 허용하는 경우 아래 폼을 활성화할 수 있습니다. */}
                {/* <form onSubmit={handleSubmit} className="mt-6 space-y-6"> ... </form> */}
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
                {existingSubmission ? 'Update Your Submission' : 'Submit Your Work'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm whitespace-pre-line">
                        {error}
                    </div>
                )}

                {existingSubmission && !existingSubmission.grade && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
                        You have already submitted this assignment. Resubmitting will overwrite your previous submission.
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Text Response (Optional)
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Type your response or attach files below"
                        rows={8}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-vertical"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Attach Files
                    </label>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="text-center">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-2">
                                Click to upload files or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
                                Max 10MB per file.
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2"
                            >
                                Choose Files
                            </Button>
                        </div>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700">New Files to Upload:</p>
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                    <div className="flex items-center space-x-2">
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-gray-700">{file.name}</span>
                                        <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFile(index)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200">
                    <Button
                        type="submit"
                        isLoading={isLoading}
                        disabled={!content && selectedFiles.length === 0}
                    >
                        {isLoading
                            ? 'Submitting...'
                            : (existingSubmission ? 'Update Submission' : 'Submit Assignment')
                        }
                    </Button>
                </div>
            </form>
        </Card>
    );
};