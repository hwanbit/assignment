import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { AssignmentList } from './components/assignments/AssignmentList';
import { AssignmentDetails } from './components/assignments/AssignmentDetails';
import { AssignmentForm } from './components/assignments/AssignmentForm';
import { SubmissionsList } from './components/submissions/SubmissionsList';
import { GradesList } from './components/grades/GradesList';
import { UserApproval } from './components/admin/UserApproval';
import CourseList from './components/courses/CourseList';
import CourseForm from './components/courses/CourseForm';
import CourseDetails from './components/courses/CourseDetails';
import { Card } from './components/ui/Card';

// 대시보드 레이아웃 컴포넌트
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="flex h-[calc(100vh-64px)]">
                {/* 이제 Sidebar는 activeTab 상태가 필요 없습니다. react-router-dom의 NavLink를 사용하게 됩니다. */}
                <Sidebar />
                <main className="flex-1 overflow-y-auto">
                    <div className="p-8">{children}</div>
                </main>
            </div>
        </div>
    );
};

// 환영 메시지를 보여주는 기본 대시보드 페이지
const WelcomeDashboard = () => (
    <Card className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">환영합니다!</h3>
        <p className="text-gray-500 mt-2">
            과제를 제출하러 오셨군요!
            <br />
            시작하려면 사이드바에서 메뉴를 선택하세요.
        </p>
    </Card>
);

// 로그인/회원가입 페이지 레이아웃
const AuthPage: React.FC = () => {
    const [isLoginMode, setIsLoginMode] = useState(true);

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
            <div className="bg-white flex items-center justify-center p-8">
                {isLoginMode ? (
                    <LoginForm onSwitchToRegister={() => setIsLoginMode(false)} />
                ) : (
                    <RegisterForm onSwitchToLogin={() => setIsLoginMode(true)} />
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

// 라우팅 및 인증을 관리하는 메인 앱 컴포넌트
const AppContent: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <Routes>
            {!user ? (
                <>
                    <Route path="/login" element={<AuthPage />} />
                    {/* 사용자가 로그인하지 않은 경우 모든 경로를 /login으로 리디렉션 */}
                    <Route path="*" element={<Navigate to="/login" />} />
                </>
            ) : (
                // 사용자가 로그인한 경우 대시보드 레이아웃 내에서 라우팅 처리
                <Route
                    path="*"
                    element={
                        <DashboardLayout>
                            <Routes>
                                <Route path="/" element={<WelcomeDashboard />} />

                                {/* Assignment Routes */}
                                <Route path="/assignments" element={<AssignmentList />} />
                                <Route path="/assignments/new" element={<AssignmentForm />} />
                                <Route path="/assignments/:id" element={<AssignmentDetails />} />
                                <Route path="/assignments/edit/:id" element={<AssignmentForm />} />

                                {/* Course Routes (Professor/Admin only) */}
                                {(user.role === 'PROFESSOR' || user.role === 'ADMIN') && (
                                    <>
                                        <Route path="/courses" element={<CourseList />} />
                                        <Route path="/courses/new" element={<CourseForm />} />
                                        <Route path="/courses/edit/:id" element={<CourseForm />} />
                                        <Route path="/courses/:id" element={<CourseDetails />} />
                                    </>
                                )}

                                {/* Submission & Grade Routes */}
                                <Route path="/submissions" element={<SubmissionsList />} />
                                <Route path="/grades" element={<GradesList />} />

                                {/* Admin Routes */}
                                {user.role === 'ADMIN' && (
                                    <Route path="/user-management" element={<UserApproval />} />
                                )}

                                {/* 다른 모든 경로가 일치하지 않을 경우 홈으로 리디렉션 */}
                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </DashboardLayout>
                    }
                />
            )}
        </Routes>
    );
};

// 최종 App 래퍼
const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;