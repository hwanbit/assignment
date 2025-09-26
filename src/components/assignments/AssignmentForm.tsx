import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assignmentApi, getCourses } from '../../lib/api';
import { Course } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { validateFile, formatFileSize } from '../../utils/fileValidation';
import { Upload, X, FileText } from 'lucide-react';

// onSave, onCancel props가 더 이상 필요 없으므로 인터페이스를 제거하고 컴포넌트를 바로 export합니다.
export const AssignmentForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>(); // URL에서 과제 ID를 가져옵니다 (수정 모드일 경우).

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        due_date: '',
        max_points: 100,
    });
    const [courseId, setCourseId] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEditMode = Boolean(id);

    // 컴포넌트 마운트 시 강의 목록을 불러옵니다.
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await getCourses();
                setCourses(response.data);
            } catch (err) {
                console.error("Failed to fetch courses", err);
                setError("강의 목록을 불러오는 데 실패했습니다.");
            }
        };
        fetchCourses();
    }, []);

    // 수정 모드일 경우, 기존 과제 데이터를 불러옵니다.
    useEffect(() => {
        if (isEditMode) {
            const fetchAssignment = async () => {
                try {
                    const { data: assignmentData } = await assignmentApi.getById(id);
                    setFormData({
                        title: assignmentData.title,
                        description: assignmentData.description,
                        due_date: new Date(assignmentData.due_date).toISOString().slice(0, 16),
                        max_points: assignmentData.max_points,
                    });
                    // 백엔드에서 courseId를 반환해준다고 가정합니다.
                    // 만약 API 응답에 courseId가 없다면 이 부분은 수정이 필요합니다.
                    setCourseId(assignmentData.courseId || '');
                } catch (err) {
                    console.error("Failed to fetch assignment", err);
                    setError("과제 정보를 불러오는 데 실패했습니다.");
                }
            };
            fetchAssignment();
        }
    }, [id, isEditMode]);

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
        setIsLoading(true);
        setError('');

        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('due_date', new Date(formData.due_date).toISOString());
        data.append('max_points', formData.max_points.toString());
        data.append('courseId', courseId); // courseId 추가

        selectedFiles.forEach(file => {
            data.append('files', file);
        });

        try {
            if (isEditMode) {
                // 참고: 현재 API 정의상 파일 수정은 지원되지 않습니다.
                // 텍스트 정보와 강의 ID만 업데이트됩니다.
                await assignmentApi.update(id, {
                    title: formData.title,
                    description: formData.description,
                    due_date: new Date(formData.due_date).toISOString(),
                    max_points: formData.max_points,
                    courseId: courseId,
                });
            } else {
                await assignmentApi.create(data);
            }
            navigate('/assignments'); // 성공 시 과제 목록 페이지로 이동
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'An error occurred';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [field]: field === 'max_points' ? parseInt(e.target.value) || 0 : e.target.value,
        }));
    };

    return (
        <Card>
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                    {isEditMode ? '과제 수정' : '새 과제 할당'}
                </h3>
                <p className="text-gray-600 mt-1">
                    아래에 세부 사항을 입력하여 과제를 {isEditMode ? '업데이트' : '생성'} 하세요.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm whitespace-pre-line">
                        {error}
                    </div>
                )}

                <div>
                    <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">강의 선택</label>
                    <select
                        id="course"
                        value={courseId}
                        onChange={(e) => setCourseId(e.target.value)}
                        required
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="">강의를 선택하세요</option>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.name}
                            </option>
                        ))}
                    </select>
                </div>

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
                                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.hwp"
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
                        onClick={() => navigate(-1)} // 이전 페이지로 이동
                        disabled={isLoading}
                    >
                        취소
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isLoading}
                        disabled={!formData.title || !formData.description || !formData.due_date || !courseId}
                    >
                        {isLoading
                            ? (isEditMode ? '업데이트중...' : '생성중...')
                            : (isEditMode ? '과제 업데이트' : '과제 생성')
                        }
                    </Button>
                </div>
            </form>
        </Card>
    );
};