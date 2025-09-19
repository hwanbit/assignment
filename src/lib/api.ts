// src/lib/api.ts
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

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

export const authApi = {
  login: (email: string, password: string) =>
      api.post('/auth/login', { email, password }),
  register: (data: any) =>
      api.post('/auth/register', data),
};

export const assignmentApi = {
  getAll: () => api.get('/assignments'),
  getById: (id: string) => api.get(`/assignments/${id}`),
  create: (data: any) => api.post('/assignments', data),
  update: (id: string, data: any) => api.put(`/assignments/${id}`, data),
  delete: (id: string) => api.delete(`/assignments/${id}`),
  // 과제 파일 목록을 가져오는 엔드포인트 추가
  getFiles: (assignmentId: number) => api.get(`/assignments/${assignmentId}/files`),
};

// 제출 관련 API
export const submissionApi = {
  // 학생의 특정 과제 제출물 가져오는 엔드포인트 추가
  getStudentSubmission: (assignmentId: number, studentId: string) =>
      api.get(`/submissions/assignments/${assignmentId}/student/${studentId}`),
  create: (data: any) => api.post('/submissions', data),
  // 제출 파일 업로드 로직은 별도로 구현해야 함
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
  // 파일 다운로드 URL을 받아오는 엔드포인트 추가
  // 실제 파일 다운로드 로직은 백엔드에서 처리
  download: async (type: string, filePath: string): Promise<string> => {
    try {
      const response = await api.post('/files/download', { type, filePath }, { responseType: 'blob' });
      return URL.createObjectURL(response.data);
    } catch (error) {
      console.error('File download failed:', error);
      throw error;
    }
  },
};