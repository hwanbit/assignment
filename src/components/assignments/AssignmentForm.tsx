import React, { useState, useRef } from 'react';
import { supabase, uploadFile } from '../../lib/api.ts';
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

    try {
      let assignmentData;

      if (assignment) {
        // Update existing assignment
        const { data, error: updateError } = await supabase
          .from('assignments')
          .update({
            title: formData.title,
            description: formData.description,
            due_date: formData.due_date,
            max_points: formData.max_points,
            updated_at: new Date().toISOString(),
          })
          .eq('id', assignment.id)
          .select()
          .single();

        if (updateError) throw updateError;
        assignmentData = data;
      } else {
        // Create new assignment
        const { data, error: insertError } = await supabase
          .from('assignments')
          .insert({
            title: formData.title,
            description: formData.description,
            due_date: formData.due_date,
            max_points: formData.max_points,
            professor_id: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        assignmentData = data;
      }

      // Upload files if any
      if (selectedFiles.length > 0 && assignmentData) {
        for (const file of selectedFiles) {
          const fileExtension = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
          const filePath = `assignments/${assignmentData.id}/${fileName}`;

          await uploadFile('assignment-files', filePath, file);

          await supabase
            .from('assignment_files')
            .insert({
              assignment_id: assignmentData.id,
              filename: file.name,
              file_path: filePath,
              file_size: file.size,
              content_type: file.type,
            });
        }
      }

      onSave(assignmentData);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the assignment');
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
          {assignment ? 'Edit Assignment' : 'Create New Assignment'}
        </h3>
        <p className="text-gray-600 mt-1">
          Fill in the details below to {assignment ? 'update' : 'create'} your assignment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm whitespace-pre-line">
            {error}
          </div>
        )}

        <Input
          label="Assignment Title"
          value={formData.title}
          onChange={handleChange('title')}
          placeholder="Enter assignment title"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={handleChange('description')}
            placeholder="Describe the assignment requirements and instructions"
            rows={6}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-vertical"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Due Date"
            type="datetime-local"
            value={formData.due_date}
            onChange={handleChange('due_date')}
            required
          />

          <Input
            label="Maximum Points"
            type="number"
            value={formData.max_points}
            onChange={handleChange('max_points')}
            min="1"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attachment Files
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
            disabled={!formData.title || !formData.description || !formData.due_date}
          >
            {isLoading 
              ? (assignment ? 'Updating...' : 'Creating...') 
              : (assignment ? 'Update Assignment' : 'Create Assignment')
            }
          </Button>
        </div>
      </form>
    </Card>
  );
};