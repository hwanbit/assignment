import React, { useState } from 'react';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { AssignmentList } from './components/assignments/AssignmentList';
import { AssignmentDetails } from './components/assignments/AssignmentDetails';
import { AssignmentForm } from './components/assignments/AssignmentForm';
import { SubmissionsList } from './components/submissions/SubmissionsList';
import { GradingForm } from './components/grading/GradingForm';
import { GradesList } from './components/grades/GradesList';
import { Assignment, Submission, Grade } from './types';
import { Card } from './components/ui/Card';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('assignments');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const renderContent = () => {
    if (selectedAssignment) {
      return (
        <AssignmentDetails
          assignment={selectedAssignment}
          onBack={() => setSelectedAssignment(null)}
          onSubmissionComplete={handleRefresh}
        />
      );
    }

    if (editingAssignment) {
      return (
        <AssignmentForm
          assignment={editingAssignment}
          onSave={(assignment) => {
            setEditingAssignment(null);
            handleRefresh();
          }}
          onCancel={() => setEditingAssignment(null)}
        />
      );
    }

    if (gradingSubmission) {
      return (
        <GradingForm
          submission={gradingSubmission}
          onGradingComplete={(grade: Grade) => {
            setGradingSubmission(null);
            handleRefresh();
          }}
          onCancel={() => setGradingSubmission(null)}
        />
      );
    }

    switch (activeTab) {
      case 'assignments':
        return (
          <AssignmentList
            onSelectAssignment={setSelectedAssignment}
            onEditAssignment={setEditingAssignment}
            refreshTrigger={refreshTrigger}
          />
        );

      case 'create':
        return (
          <AssignmentForm
            onSave={(assignment) => {
              setActiveTab('assignments');
              handleRefresh();
            }}
            onCancel={() => setActiveTab('assignments')}
          />
        );

      case 'submissions':
        return user?.role === 'professor' ? (
          <SubmissionsList
            onGradeSubmission={setGradingSubmission}
          />
        ) : (
          <SubmissionsList />
        );

      case 'grading':
      case 'grades':
        return <GradesList />;

      default:
        return (
          <Card className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">Welcome!</h3>
            <p className="text-gray-500 mt-2">
              Select a tab from the sidebar to get started.
            </p>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const AuthWrapper: React.FC = () => {
  const { user, loading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        {isLoginMode ? (
          <LoginForm onSwitchToRegister={() => setIsLoginMode(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setIsLoginMode(true)} />
        )}
      </div>
    );
  }

  return <Dashboard />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
};

export default App;