export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/zip',
  'application/x-zip-compressed',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not allowed. Please upload PDF, Word, text, or image files.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: 'File size too large. Maximum size is 10MB.',
    };
  }

  return { isValid: true };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};