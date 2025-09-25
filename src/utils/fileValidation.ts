// 모든 파일 타입을 업로드 허용하도록 빈 배열로 둠
export const ALLOWED_FILE_TYPES: string[] = [];

// 최대 업로드 파일 크기를 5GB로 설정
export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: '파일 크기가 너무 큽니다. 최대 5GB까지 업로드 가능합니다.',
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