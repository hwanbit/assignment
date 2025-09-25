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
import { UserApproval } from './components/admin/UserApproval';

// ... (Dashboard component remains the same)
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
                  setActiveTab('assignment');
                  handleRefresh();
                }}
                onCancel={() => setActiveTab('assignment')}
            />
        );

        case 'submissions':
            return <SubmissionsList onGradeSubmission={setGradingSubmission} />;

        case 'grading':
            return user?.role === 'PROFESSOR' ? (
                <SubmissionsList onGradeSubmission={setGradingSubmission} />
            ) : (
                <GradesList />
            );

        case 'grades':
            return <GradesList />;

      case 'userManagement':
        return user?.role === 'ADMIN' ? <UserApproval /> : null;

      default:
        return (
            <Card className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">환영합니다!</h3>
              <p className="text-gray-500 mt-2">
                  과제를 제출하러 오셨군요!
                  <br />
                  시작하려면 사이드바에서 메뉴를 선택하세요.
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
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
          <div className="bg-white">
            {isLoginMode ? (
                <LoginForm onSwitchToRegister={() => setIsLoginMode(false)} />
            ) : (
                // The RegisterForm will also appear in the left column.
                // For a consistent look, it should also be adapted to this layout.
                // This is a basic integration.
                <div className="flex items-center justify-center h-full p-8">
                  <RegisterForm onSwitchToLogin={() => setIsLoginMode(true)} />
                </div>
            )}
          </div>
          <div className="hidden md:flex flex-col items-center justify-center bg-black text-white p-12">
            <img
                src="/image/weblogo.svg"
                alt="Web Logo"
                className="w-32 h-32 mb-8"
            />
            <h2 className="text-4xl font-bold mb-4">AISW 과제 업로드를 위한 웹 프로젝트</h2>
            <p className="text-lg text-gray-300 text-center">
              과제를 연달아 내시는 교수님의 의도는 무엇일까
            </p>
          </div>
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