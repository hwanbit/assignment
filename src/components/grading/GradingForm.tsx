// src/components/grading/GradingForm.tsx

import React, { useState } from 'react';
import { gradeApi, fileApi } from '../../lib/api';
import { Submission, Grade } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/date';
import { formatFileSize } from '../../utils/fileValidation';
import { FileText, Download, User, Calendar } from 'lucide-react';

interface GradingFormProps {
    submission: Submission;
    onGradingComplete: (grade: Grade) => void;
    onCancel: () => void;
}

export const GradingForm: React.FC<GradingFormProps> = ({
                                                            submission,
                                                            onGradingComplete,
                                                            onCancel,
                                                        }) => {
    const [score, setScore] = useState<number | ''>(submission.grade?.points || '');
    const [feedback, setFeedback] = useState(submission.grade?.feedback || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const maxPoints = submission.assignment?.max_points || 100;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (score === '' || score < 0 || score > maxPoints) {
            setError(`Score must be between 0 and ${maxPoints}.`);
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const response = await gradeApi.gradeSubmission(submission.id, {
                score: Number(score),
                feedback,
            });
            onGradingComplete(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to submit grade.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadFile = async (filePath: string, filename: string) => {
        try {
            const url = await fileApi.download('submission-files', filePath);
            if (url) {
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Failed to download file.');
        }
    };

    return (
        <Card>
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Grade Submission</h3>
                <p className="text-gray-600 mt-1">
                    Assignment: {submission.assignment?.title}
                </p>
            </div>

            {/* Submission Details */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                    {submission.student && (
                        <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>{submission.student.full_name} ({submission.student.email})</span>
                        </div>
                    )}
                    <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Submitted: {formatDate(submission.submitted_at)}</span>
                    </div>
                </div>

                {submission.content && (
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-800 mb-1">Text Submission:</p>
                        <div className="bg-white p-3 rounded-md border">
                            <p className="text-gray-700 whitespace-pre-wrap">{submission.content}</p>
                        </div>
                    </div>
                )}

                {submission.files && submission.files.length > 0 && (
                    <div>
                        <p className="text-sm font-medium text-gray-800 mb-2">Attached Files:</p>
                        <div className="space-y-2">
                            {submission.files.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-2 bg-white rounded-md border">
                                    <div className="flex items-center space-x-2">
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-gray-700">{file.filename}</span>
                                        <span className="text-xs text-gray-500">({formatFileSize(file.file_size)})</span>
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
            </div>

            {/* Grading Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className='md:col-span-1'>
                        <Input
                            label={`Score (out of ${maxPoints})`}
                            type="number"
                            value={score}
                            onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))}
                            max={maxPoints}
                            min="0"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Feedback (Optional)
                    </label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Provide constructive feedback for the student..."
                        rows={5}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    />
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        {submission.grade ? 'Update Grade' : 'Submit Grade'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};