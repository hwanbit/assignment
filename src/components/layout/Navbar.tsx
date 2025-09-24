import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { User, LogOut, BookOpen } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3 -ml-80">
            <img
                src="/image/weblogo.svg"
                alt="Web Logo"
                className="w-12 h-12"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">POLY AISW</h1>
              <p className="text-xs text-gray-500">과제 업로드 시스템</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-4 -mr-72">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user.fullName}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-500">{user.email}</p>
                    <Badge
                      variant={user.role === 'PROFESSOR' ? 'info' : 'default'}
                    >
                      {user.role === 'ADMIN' ? '관리자' : (user.role === 'PROFESSOR' ? '교수' : '학생')}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center space-x-1"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};