import React, { useState, useRef } from 'react';
import { supabase, uploadFile } from '../../lib/api.ts';
import { useAuth } from '../../contexts/AuthContext';
import { Assignment, Submission } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { validateFile, formatFileSize } from '../../utils/fileValidation';
import { Upload, X, FileText } from 'lucide-react';

interface SubmissionFormProps {
  assignment: Assignment;
  existingSubmission?: Submission | null;
  onSubmissionComplete: () => void;
  onCancel: () => void;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  assignment,
  existingSubmission,
  onSubmissionComplete,
  onCancel,
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState(existingSubmission?.content || '');
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
    if (!user || (!content.trim() && selectedFiles.length === 0)) {
      setError('Please provide either text content or upload files for your submission.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let submissionData;

      if (existingSubmission) {
        // Update existing submission
        const { data, error: updateError } = await supabase
          .from('submissions')
          .update({
            content: content.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubmission.id)
          .select()
          .single();

        if (updateError) throw updateError;
        submissionData = data;
      } else {
        // Create new submission
        const { data, error: insertError } = await supabase
          .from('submissions')
          .insert({
            assignment_id: assignment.id,
            student_id: user.id,
            content: content.trim() || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        submissionData = data;
      }

      // Upload new files
      if (selectedFiles.length > 0 && submissionData) {
        for (const file of selectedFiles) {
          const fileExtension = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
          const filePath = `submissions/${submissionData.id}/${fileName}`;

          await uploadFile('submission-files', filePath, file);

          await supabase
            .from('submission_files')
            .insert({
              submission_id: submissionData.id,
              filename: file.name,
              file_path: filePath,
              file_size: file.size,
              content_type: file.type,
            });
        }
      }

      onSubmissionComplete();
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting your assignment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          {existingSubmission ? 'Update Submission' : 'Submit Assignment'}
        </h3>
        <p className="text-gray-600 mt-1">
          Submit your work for "{assignment.title}"
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm whitespace-pre-line">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Submission (Optional)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your submission text here..."
            rows={8}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-vertical"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File Submissions (Optional)
          </label>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Click to upload files or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                PDF, Word, Images up to 10MB each
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
                Choose Files
              </Button>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Selected Files:</p>
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> You can update your submission multiple times before the due date. 
            Your latest submission will be used for grading.
          </p>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!content.trim() && selectedFiles.length === 0}
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