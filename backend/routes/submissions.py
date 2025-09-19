import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app, send_from_directory
from werkzeug.utils import secure_filename
from sqlalchemy.orm import joinedload
from backend.app import db
from backend.models import Assignment, Submission, SubmissionStatus, SubmissionFile, User
from backend.routes.auth import authenticate, authorize

submissions_bp = Blueprint('submissions', __name__)

UPLOAD_FOLDER = 'uploads/submissions'
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'zip'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def submission_to_dict(submission):
    """Submission 객체를 JSON 응답을 위한 딕셔너리로 변환합니다."""
    assignment_data = None
    if submission.assignment:
        assignment_data = {
            'title': submission.assignment.title,
            'max_points': submission.assignment.maxScore
        }

    student_data = None
    if submission.student:
        student_data = {
            'full_name': submission.student.name,
            'email': submission.student.email
        }

    grade_data = None
    if submission.grade:
        grade_data = {
            'id': submission.grade.id,
            'points': submission.grade.score,
            'feedback': submission.grade.feedback,
            'graded_at': submission.grade.gradedAt.isoformat(),
        }

    files_data = [submission_file_to_dict(f) for f in submission.files] if submission.files else []

    return {
        'id': submission.id,
        'assignment_id': submission.assignmentId,
        'student_id': submission.studentId,
        'content': submission.content,
        'submitted_at': submission.submittedAt.isoformat(),
        'status': submission.status.value,
        'assignment': assignment_data,
        'student': student_data,
        'files': files_data,
        'grade': grade_data
    }

def submission_file_to_dict(submission_file):
    """SubmissionFile 객체를 JSON 응답을 위한 딕셔너리로 변환합니다."""
    return {
        'id': submission_file.id,
        'submission_id': submission_file.submissionId,
        'filename': submission_file.fileName,
        'file_path': submission_file.fileUrl,
        'file_size': submission_file.fileSize,
        'content_type': submission_file.mimeType,
        'uploaded_at': submission_file.uploadedAt.isoformat(),
    }

@submissions_bp.route('/assignments/<assignmentId>/submit', methods=['POST'])
@authorize(allowed_roles=['STUDENT'])
def submit_assignment(assignmentId):
    data = request.json
    content = data.get('content')

    if not content:
        return jsonify(error="제출 내용을 입력해주세요."), 400

    assignment = Assignment.query.get(assignmentId)
    if not assignment:
        return jsonify(error="유효한 과제 ID가 아닙니다."), 400

    if assignment.dueDate < datetime.utcnow():
        return jsonify(error="제출 마감일이 지났습니다."), 400

    try:
        existing_submission = Submission.query.filter_by(assignmentId=assignmentId, studentId=g.user_id).first()

        if existing_submission:
            existing_submission.content = content
            existing_submission.submittedAt = datetime.utcnow()
            db.session.commit()
            return jsonify(submission_to_dict(existing_submission)), 200
        else:
            new_submission = Submission(
                assignmentId=assignmentId,
                studentId=g.user_id,
                content=content,
            )
            db.session.add(new_submission)
            db.session.commit()
            return jsonify(submission_to_dict(new_submission)), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error submitting assignment: {e}")
        return jsonify(error="Internal server error"), 500


@submissions_bp.route('/assignments/<assignmentId>/submit-with-files', methods=['POST'])
@authorize(allowed_roles=['STUDENT'])
def submit_assignment_with_files(assignmentId):
    # 파일 및 텍스트 제출
    content = request.form.get('content', None)
    files = request.files.getlist('files[]')

    if not content and not files:
        return jsonify(error='제출 내용 또는 파일을 업로드해주세요.'), 400

    assignment = Assignment.query.get(assignmentId)
    if not assignment:
        return jsonify(error="유효한 과제 ID가 아닙니다."), 400

    if assignment.dueDate < datetime.utcnow():
        return jsonify(error="제출 마감일이 지났습니다."), 400

    try:
        existing_submission = Submission.query.filter_by(assignmentId=assignmentId, studentId=g.user_id).first()

        if existing_submission:
            submission = existing_submission
            submission.content = content
            submission.submittedAt = datetime.utcnow()
        else:
            submission = Submission(
                assignmentId=assignmentId,
                studentId=g.user_id,
                content=content,
            )
            db.session.add(submission)

        db.session.commit() # 먼저 submission을 저장하여 id를 확보

        # 파일 처리
        if files:
            for file in files:
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    unique_filename = f"{uuid.uuid4()}_{filename}"
                    directory_path = os.path.join(current_app.root_path, UPLOAD_FOLDER, submission.id)
                    os.makedirs(directory_path, exist_ok=True)
                    file_path = os.path.join(directory_path, unique_filename)
                    file.save(file_path)

                    new_file = SubmissionFile(
                        submissionId=submission.id,
                        fileName=filename,
                        fileUrl=os.path.join(submission.id, unique_filename),
                        fileSize=os.path.getsize(file_path),
                        mimeType=file.mimetype,
                    )
                    db.session.add(new_file)
            db.session.commit()

        return jsonify(submission_to_dict(submission)), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error submitting assignment with files: {e}")
        return jsonify(error="Internal server error"), 500

@submissions_bp.route('/my-submissions', methods=['GET'])
@authorize(allowed_roles=['STUDENT'])
def get_my_submissions():
    try:
        submissions = Submission.query.filter_by(studentId=g.user_id).options(
            joinedload(Submission.assignment),
            joinedload(Submission.files),
            joinedload(Submission.grade)
        ).order_by(Submission.submittedAt.desc()).all()
        return jsonify([submission_to_dict(s) for s in submissions])
    except Exception as e:
        current_app.logger.error(f"Error fetching my submissions: {e}")
        return jsonify(error="Internal server error"), 500

@submissions_bp.route('/assignments/<assignmentId>/submissions', methods=['GET'])
@authorize(allowed_roles=['TEACHER', 'ADMIN'])
def get_assignment_submissions(assignmentId):
    try:
        submissions = Submission.query.filter_by(assignmentId=assignmentId).options(
            joinedload(Submission.student),
            joinedload(Submission.files),
            joinedload(Submission.grade)
        ).order_by(Submission.submittedAt.desc()).all()
        return jsonify([submission_to_dict(s) for s in submissions])
    except Exception as e:
        current_app.logger.error(f"Error fetching assignment submissions: {e}")
        return jsonify(error="Internal server error"), 500

@submissions_bp.route('/<submissionId>/files/<fileId>', methods=['DELETE'])
@authorize(allowed_roles=['STUDENT'])
def remove_file_from_submission(submissionId, fileId):
    try:
        submission = Submission.query.filter_by(id=submissionId, studentId=g.user_id).first()
        if not submission:
            return jsonify(error="Submission not found or you don't have permission"), 404

        file_to_delete = SubmissionFile.query.filter_by(id=fileId, submissionId=submissionId).first()
        if not file_to_delete:
            return jsonify(error="File not found"), 404

        # 로컬 파일 시스템에서 파일 삭제
        full_path = os.path.join(current_app.root_path, UPLOAD_FOLDER, file_to_delete.fileUrl)
        if os.path.exists(full_path):
            os.remove(full_path)

        db.session.delete(file_to_delete)
        db.session.commit()

        return jsonify(message="File deleted successfully"), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting file from submission: {e}")
        return jsonify(error="Internal server error"), 500

@submissions_bp.route('/files/<fileId>/download', methods=['GET'])
@authenticate
def download_file(fileId):
    try:
        submission_file = SubmissionFile.query.filter_by(id=fileId).first()
        if not submission_file:
            return jsonify(error="File not found"), 404

        # 제출물 소유자, 교수, 관리자만 다운로드 가능
        submission = submission_file.submission
        is_teacher_or_admin = g.user_role in ['TEACHER', 'ADMIN']
        is_owner = submission.studentId == g.user_id

        if not (is_teacher_or_admin or is_owner):
            return jsonify(error="You don't have permission to download this file."), 403

        file_url = submission_file.fileUrl
        directory = os.path.join(current_app.root_path, UPLOAD_FOLDER, os.path.dirname(file_url))
        filename = os.path.basename(file_url)

        return send_from_directory(directory, filename, as_attachment=True, download_name=submission_file.fileName)

    except Exception as e:
        current_app.logger.error(f"Error downloading file: {e}")
        return jsonify(error="Internal server error"), 500