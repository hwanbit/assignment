export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'PROFESSOR' | 'STUDENT' | 'ADMIN';
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_points: number;
  professor_id: string;
  created_at: string;
  updated_at: string;
  professor?: User;
  attachment_count?: number;
}

export interface AssignmentFile {
  id: string;
  assignment_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  submitted_at: string;
  updated_at: string;
  assignment?: Assignment;
  student?: User;
  files?: SubmissionFile[];
  grade?: Grade;
}

export interface SubmissionFile {
  id: string;
  submission_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
}

export interface Grade {
  id: string;
  submission_id: string;
  professor_id: string;
  points: number;
  feedback: string | null;
  graded_at: string;
  professor?: User;
}

export interface QALog {
  id: string;
  assignment_id: string;
  student_id: string;
  question: string;
  answer: string;
  source: 'llm' | 'professor';
  created_at: string;
  assignment?: Assignment;
  student?: User;
}

export interface Course {
  id: string;
  name: string;
  teacherId: string;
  students?: User[]; // 학생 목록은 상세 조회 시에만 포함
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
}