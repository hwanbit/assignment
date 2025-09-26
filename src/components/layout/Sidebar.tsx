import React from 'react';
import { NavLink } from 'react-router-dom'; // button 대신 NavLink를 사용합니다.
import { useAuth } from '../../contexts/AuthContext';
import {
  BookOpen,
  Plus,
  FileText,
  Users,
  BarChart3,
  Library // 강의 관리 아이콘 추가
} from 'lucide-react';

// 이제 props가 필요 없으므로 SidebarProps 인터페이스를 제거합니다.
const Sidebar = () => {
  const { user } = useAuth();

  // 각 탭의 id를 URL 경로(path)로 변경합니다.
  const studentTabs = [
    { path: '/assignments', label: '과제', icon: BookOpen },
    { path: '/submissions', label: '제출 완료', icon: FileText },
    { path: '/grades', label: '성적', icon: BarChart3 },
  ];

  const professorTabs = [
    { path: '/assignments', label: '과제 목록', icon: BookOpen },
    { path: '/assignments/new', label: '과제 할당', icon: Plus },
    { path: '/courses', label: '강의 관리', icon: Library }, // 강의 관리 메뉴 추가
    { path: '/submissions', label: '학생 제출/채점', icon: Users },
  ];

  const adminTabs = [
    ...professorTabs,
    { path: '/user-management', label: '유저 관리', icon: Users },
  ];

  const tabs = user?.role === 'ADMIN' ? adminTabs : (user?.role === 'PROFESSOR' ? professorTabs : studentTabs);

  // NavLink의 className prop은 함수를 받아 활성 상태(isActive)에 따라 다른 스타일을 적용할 수 있습니다.
  const linkClassName = ({ isActive }: { isActive: boolean }) =>
      `w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
          isActive
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-gray-700 hover:bg-gray-50'
      }`;

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

              return (
                  // button을 NavLink로 변경하고, to 속성에 경로를 지정합니다.
                  <NavLink
                      key={tab.path}
                      to={tab.path}
                      className={linkClassName}
                  >
                    {({ isActive }) => (
                        <>
                          <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                          <span className="font-medium">{tab.label}</span>
                        </>
                    )}
                  </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>
  );
};

export default Sidebar;