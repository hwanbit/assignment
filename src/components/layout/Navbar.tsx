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
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">AssignmentHub</h1>
              <p className="text-xs text-gray-500">University Assignment System</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user.full_name}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-500">{user.email}</p>
                    <Badge
                      variant={user.role === 'professor' ? 'info' : 'default'}
                    >
                      {user.role === 'professor' ? 'Professor' : 'Student'}
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
                <span>Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};