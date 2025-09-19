from flask import Blueprint, request, jsonify, current_app, send_from_directory
import os
from .auth import authenticate, authorize
from models import SubmissionFile

files_bp = Blueprint('files', __name__)

@files_bp.route('/download', methods=['GET'])
@authenticate
def download_file():
    file_path = request.args.get('filePath')
    file_type = request.args.get('type')
    filename_original = request.args.get('filename')

    if not file_path or not file_type:
        return jsonify(error="filePath and type are required query parameters."), 400

    try:
        # 파일 경로 유효성 검사 (상위 디렉토리 접근 방지)
        if '..' in file_path or '/' in file_path and file_path.startswith('/'):
            return jsonify(error="Invalid file path."), 400

        # 백엔드 파일 시스템의 실제 저장 경로
        if file_type == 'assignment-files':
            full_path = os.path.join(current_app.root_path, 'uploads/assignments', file_path)
            # 파일 존재 여부 및 권한 확인은 이미 프론트엔드에서 처리되므로,
            # 여기서는 파일 경로의 유효성만 확인하고 전송합니다.
        elif file_type == 'submission-files':
            # submission_files의 경우, 제출자나 교수/관리자만 다운로드 가능
            submission_file = SubmissionFile.query.filter_by(fileUrl=file_path).first()
            if not submission_file:
                return jsonify(error="File not found in database."), 404

            submission = submission_file.submission
            is_teacher_or_admin = g.user_role in ['TEACHER', 'ADMIN']
            is_owner = submission.studentId == g.user_id

            if not (is_teacher_or_admin or is_owner):
                return jsonify(error="You don't have permission to download this file."), 403

            full_path = os.path.join(current_app.root_path, 'uploads/submissions', file_path)
        else:
            return jsonify(error="Invalid file type."), 400

        if not os.path.exists(full_path):
            return jsonify(error="File not found on server."), 404

        # 파일을 다운로드할 수 있도록 전송
        return send_from_directory(os.path.dirname(full_path), os.path.basename(full_path), as_attachment=True, download_name=filename_original)

    except Exception as e:
        current_app.logger.error(f"Error downloading file: {e}")
        return jsonify(error="Internal server error"), 500