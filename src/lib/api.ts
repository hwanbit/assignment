// src/lib/api.ts
import axios from 'axios';
import { Assignment, Submission, Grade, User, AssignmentFile, QALog } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// 토큰 자동 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
);

export const authApi = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getCurrentUser: () => api.get<{ user: User }>('/auth/me'),
};

export const assignmentApi = {
  getAll: () => api.get<Assignment[]>('/assignments/'),
  getById: (id: string) => api.get<Assignment>(`/assignments/${id}`),
  create: (data: FormData) => api.post<Assignment>('/assignments/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id: string, data: Partial<Assignment>) => api.put<Assignment>(`/assignments/${id}`, data),
  delete: (id: string) => api.delete(`/assignments/${id}`),
  getFiles: (assignmentId: string) => api.get<AssignmentFile[]>(`/assignments/${assignmentId}/files`),
};

// 제출 관련 API
export const submissionApi = {
  // 학생의 모든 제출물 가져오기
  getMySubmissions: () => api.get<Submission[]>('/submissions/my-submissions'),
  // 특정 과제에 대한 모든 제출물 가져오기 (교수용)
  getSubmissionsForAssignment: (assignmentId: string) =>
      api.get<Submission[]>(`/assignments/${assignmentId}/submissions`),
  // 모든 제출물 가져오기 (관리자/교수용)
  getAllSubmissions: () => api.get<Submission[]>('/submissions'),
  // 특정 과제에 대한 학생 제출물 가져오기
  getStudentSubmissionForAssignment: (assignmentId: string) =>
      api.get<Submission>(`/assignments/${assignmentId}/my-submission`), // 예시 엔드포인트
  create: (assignmentId: string, data: FormData) =>
      api.post<Submission>(`/assignments/${assignmentId}/submit-with-files`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  getAllSubmissions: () => api.get<Submission[]>('/submissions/'),
};

export const gradeApi = {
  // 학생의 모든 성적 가져오기
  getMyGrades: () => api.get<Submission[]>('/grades/my-grades'), // 제출물에 성적이 포함되어 반환
  // 특정 제출물 채점하기
  gradeSubmission: (submissionId: string, data: { score: number, feedback: string }) => api.post<Grade>(`/submissions/${submissionId}/grade`, data),
};

// Q&A 관련 API
export const qaLogApi = {
  // 특정 과제에 대한 Q&A 기록 가져오는 엔드포인트 추가
  getByAssignmentId: (assignmentId: number) => api.get(`/qa-logs/assignments/${assignmentId}`),
  // Q&A 질문을 생성하는 엔드포인트 추가
  create: (data: any) => api.post('/qa-logs', data),
};

// 파일 관련 API
export const fileApi = {
  download: async (type: string, filePath: string): Promise<Blob> => {
    try {
      // POST -> GET으로 변경, 요청 본문(body) -> URL 파라미터(params)로 변경
      const response = await api.get('/files/download', {
        params: { type, filePath },
        responseType: 'blob',
      });
      // URL.createObjectURL(response.data) 대신 받은 데이터 자체를 반환
      return response.data;
    } catch (error) {
      console.error('File download failed:', error);
      throw error;
    }
  },
};

export const adminApi = {
  getPendingUsers: () => api.get<any[]>('/admin/pending-users'),
  approveUser: (userId: string) => api.post(`/admin/users/${userId}/approve`),
  rejectUser: (userId: string) => api.post(`/admin/users/${userId}/reject`),
};