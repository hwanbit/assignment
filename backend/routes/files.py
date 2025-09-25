import os
from flask import Blueprint, request, jsonify, current_app, send_from_directory, g
from backend.routes.auth import authenticate

files_bp = Blueprint('files', __name__)

UPLOAD_FOLDER_ASSIGNMENTS = 'uploads/assignments'
UPLOAD_FOLDER_SUBMISSIONS = 'uploads/submissions'

@files_bp.route('/download', methods=['GET'])
@authenticate
def download_file():
    from backend.models import Attachment, SubmissionFile
    file_path = request.args.get('filePath')
    file_type = request.args.get('type')
    filename_original = request.args.get('filename')

    if not file_path or not file_type:
        return jsonify(error="filePath and type are required query parameters."), 400

    attachment = None
    base_folder = ''
    if file_type == 'assignment-files':
        base_folder = UPLOAD_FOLDER_ASSIGNMENTS
        attachment = Attachment.query.filter_by(fileUrl=file_path).first()
    elif file_type == 'submission-files':
        base_folder = UPLOAD_FOLDER_SUBMISSIONS
        attachment = SubmissionAttachment.query.filter_by(fileUrl=file_path).first()
    else:
        return jsonify(error="Invalid file type"), 400

    if not attachment:
        return jsonify(error="File not found in database"), 404

    # fileUrl에서 디렉토리(ex: 과제ID)와 실제 파일명(ex: UUID_파일명) 분리
    directory, filename = os.path.split(file_path)

    try:
        return send_from_directory(
            directory=os.path.join(current_app.root_path, base_folder, directory),
            path=filename,
            as_attachment=True,
            download_name=attachment.fileName
        )
    except FileNotFoundError:
        current_app.logger.error(f"File not found on disk: {file_path}")
        return jsonify(error="File not found on server"), 404
    except Exception as e:
        current_app.logger.error(f"Error downloading file: {e}")
        return jsonify(error="Internal server error"), 500