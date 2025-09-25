import React, { useState, useRef } from 'react';
import { assignmentApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Assignment } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { validateFile, formatFileSize } from '../../utils/fileValidation';
import { Upload, X, FileText } from 'lucide-react';

interface AssignmentFormProps {
    assignment?: Assignment;
    onSave: (assignment: Assignment) => void;
    onCancel: () => void;
}

export const AssignmentForm: React.FC<AssignmentFormProps> = ({
                                                                  assignment,
                                                                  onSave,
                                                                  onCancel,
                                                              }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        title: assignment?.title || '',
        description: assignment?.description || '',
        due_date: assignment?.due_date ? new Date(assignment.due_date).toISOString().slice(0, 16) : '',
        max_points: assignment?.max_points || 100,
    });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (!user) return;

        setIsLoading(true);
        setError('');

        // FormData를 사용하여 텍스트 데이터와 파일을 함께 전송합니다.
        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('due_date', new Date(formData.due_date).toISOString());
        data.append('max_points', formData.max_points.toString());

        selectedFiles.forEach(file => {
            data.append('files', file); // 'files'는 백엔드에서 받을 때 사용할 키 이름입니다.
        });

        try {
            let response;
            if (assignment) {
                // 과제 수정 (PUT 요청)
                // 참고: 파일 수정 로직은 백엔드 구현에 따라 달라질 수 있습니다.
                // 여기서는 텍스트 정보만 업데이트하는 것으로 가정합니다.
                // 파일 변경을 포함하려면 별도의 로직이 필요합니다.
                response = await assignmentApi.update(assignment.id, {
                    title: formData.title,
                    description: formData.description,
                    due_date: new Date(formData.due_date).toISOString(),
                    max_points: formData.max_points,
                });
            } else {
                // 새 과제 생성 (POST 요청)
                response = await assignmentApi.create(data);
            }

            onSave(response.data);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'An error occurred';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [field]: field === 'max_points' ? parseInt(e.target.value) || 0 : e.target.value,
        }));
    };

    return (
        <Card>
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                    {assignment ? '과제 수정' : '새 과제 할당'}
                </h3>
                <p className="text-gray-600 mt-1">
                    아래에 세부 사항을 입력하여 과제를 {assignment ? '업데이트' : '생성'} 하세요.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm whitespace-pre-line">
                        {error}
                    </div>
                )}

                <Input
                    label="제목"
                    value={formData.title}
                    onChange={handleChange('title')}
                    placeholder="과제 제목을 입력하세요."
                    required
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        설명
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={handleChange('description')}
                        placeholder="과제 요구 사항 및 지침 설명"
                        rows={6}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-vertical"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="마감 기한"
                        type="datetime-local"
                        value={formData.due_date}
                        onChange={handleChange('due_date')}
                        required
                    />

                    <Input
                        label="최고 성적"
                        type="number"
                        value={formData.max_points}
                        onChange={handleChange('max_points')}
                        min="1"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        파일 첨부
                    </label>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="text-center">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-2">
                                파일을 업로드하거나 드래그 앤 드롭하려면 클릭하세요.
                            </p>
                            <p className="text-xs text-gray-500">
                                최대 5GB까지 업로드 가능
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2"
                            >
                                파일 선택
                            </Button>
                        </div>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700">선택된 파일:</p>
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

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        취소
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isLoading}
                        disabled={!formData.title || !formData.description || !formData.due_date}
                    >
                        {isLoading
                            ? (assignment ? '업데이트중...' : '생성중...')
                            : (assignment ? '과제 업데이트' : '과제 생성')
                        }
                    </Button>
                </div>
            </form>
        </Card>
    );
};