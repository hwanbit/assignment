import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'professor' | 'student',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    const passwordRegEx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,20}$/;

    if (!passwordRegEx.test(formData.password)) {
      setError('Password must be 8-20 characters long and include at least one uppercase letter, one lowercase letter, and one number.');
      setIsLoading(false);
      return;
    }

    try {
      await signUp(formData.email, formData.password, formData.fullName, formData.role);
      alert('회원 가입을 성공적으로 요청했습니다! 관리자가 계정을 승인할 때까지 기다려 주세요.'); // 메시지 변경
      onSwitchToLogin();
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Card className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">회원가입</h2>
        <p className="text-gray-600 mt-2">아래 필드를 전부 입력하세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <Input
          label="성명"
          type="text"
          value={formData.fullName}
          onChange={handleChange('fullName')}
          placeholder="이미선"
          required
        />

        <Input
          label="학교 이메일 주소"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          placeholder="2401110257@office.kopo.ac.kr"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            역할
          </label>
          <select
            value={formData.role}
            onChange={handleChange('role')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="student">학생</option>
            <option value="professor">교수</option>
          </select>
        </div>

        <Input
          label="비밀번호"
          type="password"
          value={formData.password}
          onChange={handleChange('password')}
          placeholder="8~20자의 영문 대소문자와 숫자를 입력하세요."
          required
        />

        <Input
          label="비밀번호 확인"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange('confirmPassword')}
          placeholder="같은 비밀번호를 다시 입력하세요."
          required
        />

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
        >
          {isLoading ? '회원가입 중...' : '회원가입'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          이미 계정을 가지고 계신가요?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            로그인 하러 가기
          </button>
        </p>
      </div>
    </Card>
  );
};