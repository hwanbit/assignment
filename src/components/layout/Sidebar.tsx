import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BookOpen, 
  Plus, 
  FileText, 
  Users, 
  BarChart3,
  MessageSquare 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { user } = useAuth();

  const studentTabs = [
    { id: 'assignments', label: '과제', icon: BookOpen },
    { id: 'submissions', label: '제출 완료', icon: FileText },
    { id: 'grades', label: '성적', icon: BarChart3 },
  ];

  const professorTabs = [
    { id: 'assignments', label: '과제', icon: BookOpen },
    { id: 'create', label: '과제 할당', icon: Plus },
    { id: 'submissions', label: '학생 제출', icon: Users },
    { id: 'grading', label: '과제 채점', icon: BarChart3 },
  ];

  const adminTabs = [
    ...professorTabs,
    { id: 'userManagement', label: '유저 관리', icon: Users },
  ]

  const tabs = user?.role === 'ADMIN' ? adminTabs : (user?.role === 'PROFESSOR' ? professorTabs : studentTabs);

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 h-full">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {user?.role === 'ADMIN' ? '관리자 모드' : (user?.role === 'STUDENT' ? '메뉴' : '어서오세요, 교수님!')}
            </h2>
          </div>
        </div>
        
        <nav className="space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};