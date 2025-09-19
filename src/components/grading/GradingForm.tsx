import React, { useState } from 'react';
import { supabase } from '../../lib/api.ts';
import { useAuth } from '../../contexts/AuthContext';
import { Submission, Grade } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

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
  const { user } = useAuth();
  const [points, setPoints] = useState(submission.grade?.points || 0);
  const [feedback, setFeedback] = useState(submission.grade?.feedback || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const maxPoints = submission.assignment?.max_points || 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (points < 0 || points > maxPoints) {
      setError(`Points must be between 0 and ${maxPoints}`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let gradeData;

      if (submission.grade) {
        // Update existing grade
        const { data, error: updateError } = await supabase
          .from('grades')
          .update({
            points,
            feedback: feedback.trim() || null,
          })
          .eq('id', submission.grade.id)
          .select()
          .single();

        if (updateError) throw updateError;
        gradeData = data;
      } else {
        // Create new grade
        const { data, error: insertError } = await supabase
          .from('grades')
          .insert({
            submission_id: submission.id,
            professor_id: user.id,
            points,
            feedback: feedback.trim() || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        gradeData = data;
      }

      onGradingComplete(gradeData);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the grade');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          {submission.grade ? 'Update Grade' : 'Grade Submission'}
        </h3>
        <p className="text-gray-600 mt-1">
          Grading submission for "{submission.assignment?.title}" by {submission.student?.full_name}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">Submission Content:</h4>
          {submission.content && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Text:</p>
              <p className="text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border text-sm">
                {submission.content}
              </p>
            </div>
          )}
          
          {submission.files && submission.files.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Files:</p>
              <ul className="text-sm text-gray-600">
                {submission.files.map(file => (
                  <li key={file.id}>• {file.filename}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Input
          label={`Points (out of ${maxPoints})`}
          type="number"
          value={points}
          onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
          min="0"
          max={maxPoints}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Feedback (Optional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Provide feedback to the student..."
            rows={4}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-vertical"
          />
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
          >
            {isLoading 
              ? 'Saving...' 
              : (submission.grade ? 'Update Grade' : 'Save Grade')
            }
          </Button>
        </div>
      </form>
    </Card>
  );
};