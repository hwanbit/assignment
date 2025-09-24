import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types/index.ts';
import axios from 'axios';

// API 기본 설정
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_URL,
});

// 토큰 자동 추가 인터셉터
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 (401 에러 처리)
api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // 토큰 만료 시 처리
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
);

// 타입 정의
interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'PROFESSOR' | 'STUDENT' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'admin' | 'professor' | 'student') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 앱 시작 시 저장된 토큰과 사용자 정보 확인
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        // 저장된 사용자 정보로 일단 설정
        setUser(JSON.parse(savedUser));

        // 토큰 유효성 확인 (선택적)
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        } catch (error) {
          // 토큰이 유효하지 않으면 로컬 스토리지 클리어
          console.error('Token validation failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'PROFESSOR' | 'STUDENT') => {
    try {
      const response = await api.post<AuthResponse>('/auth/register', {
        email,
        password,
        fullName,
        role,
      });

      const { token, user } = response.data;

      // 토큰과 사용자 정보 저장
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // 상태 업데이트
      setUser(user);

      // axios 디폴트 헤더에 토큰 설정
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('회원가입에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', {
        email,
        password,
      });

      const { token, user } = response.data;

      // 토큰과 사용자 정보 저장
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // 상태 업데이트
      setUser(user);

      // axios 디폴트 헤더에 토큰 설정
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.status === 401) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        throw new Error('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const signOut = async () => {
    try {
      // 선택적: 서버에 로그아웃 요청 (서버에서 토큰 무효화 등)
      // await api.post('/auth/logout');

      // 로컬 스토리지 클리어
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // axios 헤더에서 토큰 제거
      delete api.defaults.headers.common['Authorization'];

      // 상태 초기화
      setUser(null);

    } catch (error) {
      console.error('Sign out error:', error);
      // 에러가 발생해도 로컬은 클리어
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateUser,
  };

  return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
  );
};

// API 인스턴스 export (다른 컴포넌트에서 사용)
export { api };