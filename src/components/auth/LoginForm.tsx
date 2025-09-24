import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="flex flex-col justify-between h-screen p-10 sm:p-12">
        <header>
          <Button
              variant="outline"
              onClick={onSwitchToRegister}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800">
            회원가입
          </Button>
        </header>

        <main className="w-full max-w-sm mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mt-4">돌아오신 것을 환영합니다!</h1>
            <p className="text-gray-500 mt-2">계정 정보를 입력하여 로그인하세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
            )}

            <Input
                label="이메일"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="2401110257@office.kopo.ac.kr"
                required
            />

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  비밀번호
                </label>
                <a href="#" className="text-sm text-blue-600 hover:underline">
                  비밀번호를 잊어버리셨나요?
                </a>
              </div>
              <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8자 이상, 대문자, 소문자, 숫자 포함"
                  required
                  className="mt-0"
              />
            </div>

            <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white mt-6" isLoading={isLoading}>
              로그인
            </Button>
          </form>
        </main>

        <footer className="text-center text-xs text-gray-400">
          <p>administrator: admin@office.kopo.ac.kr</p>
          <p className="mt-1">© 2025 Sun. All rights reserved.</p>
        </footer>
      </div>
  );
};