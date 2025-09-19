import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

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
    <Card className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">로그인</h2>
        <p className="text-gray-600 mt-2">과제를 연달아 내시는 교수님의 심리는 무엇일까?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <Input
          label="아이디"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="학교 이메일 주소를 입력하세요."
          required
        />

        <Input
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호를 입력하세요."
          required
        />

        <div className="flex items-center justify-end">
          <div className="text-sm">
            <button
                type="button"
                onClick={() => alert('Password reset feature is not yet implemented.')}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
            >
              비밀번호를 잊어버리셨나요?
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
          disabled={!email || !password}
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          계정이 없으신가요?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            회원가입
          </button>
        </p>
      </div>
    </Card>
  );
};