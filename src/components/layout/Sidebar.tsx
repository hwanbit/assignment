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
    { id: 'assignments', label: 'My Assignments', icon: BookOpen },
    { id: 'submissions', label: 'My Submissions', icon: FileText },
    { id: 'grades', label: 'Grades', icon: BarChart3 },
  ];

  const professorTabs = [
    { id: 'assignments', label: 'All Assignments', icon: BookOpen },
    { id: 'create', label: 'Create Assignment', icon: Plus },
    { id: 'submissions', label: 'Student Submissions', icon: Users },
    { id: 'grading', label: 'Grading', icon: BarChart3 },
  ];

  const tabs = user?.role === 'professor' ? professorTabs : studentTabs;

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 h-full">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {user?.role === 'professor' ? 'Professor Dashboard' : 'Student Dashboard'}
        </h2>
        
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