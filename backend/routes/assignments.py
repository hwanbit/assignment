import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from sqlalchemy.orm import joinedload
from app import db
from models import User, Assignment, Attachment
from .auth import authenticate, authorize

assignments_bp = Blueprint('assignments', __name__)

UPLOAD_FOLDER = 'uploads/assignments'

def assignment_to_dict(assignment):
    """Assignment 객체를 JSON 응답을 위한 딕셔너리로 변환합니다."""
    return {
        'id': assignment.id,
        'title': assignment.title,
        'description': assignment.description,
        'due_date': assignment.dueDate.isoformat(),
        'max_points': assignment.maxScore,
        'professor_id': assignment.teacherId,
        'created_at': assignment.createdAt.isoformat(),
        'updated_at': assignment.updatedAt.isoformat(),
        'professor': {
            'full_name': assignment.teacher.name
        } if assignment.teacher else None,
        'attachment_count': len(assignment.attachments)
    }

def attachment_to_dict(attachment):
    """Attachment 객체를 JSON 응답을 위한 딕셔너리로 변환합니다."""
    return {
        'id': attachment.id,
        'assignment_id': attachment.assignmentId,
        'filename': attachment.fileName,
        'file_path': attachment.fileUrl,
        'file_size': attachment.fileSize,
        'content_type': attachment.mimeType,
        'uploaded_at': attachment.uploadedAt.isoformat(),
    }

@assignments_bp.route('/', methods=['GET'])
@authenticate
def get_all_assignments():
    try:
        assignments = Assignment.query.options(joinedload(Assignment.teacher)).order_by(Assignment.dueDate).all()
        return jsonify([assignment_to_dict(a) for a in assignments])
    except Exception as e:
        current_app.logger.error(f"Error fetching assignments: {e}")
        return jsonify(error="Internal server error"), 500

@assignments_bp.route('/', methods=['POST'])
@authorize(allowed_roles=['TEACHER', 'ADMIN'])
def create_assignment():
    data = request.json
    try:
        new_assignment = Assignment(
            title=data['title'],
            description=data['description'],
            dueDate=datetime.fromisoformat(data['due_date']),
            maxScore=data['max_points'],
            teacherId=g.user_id,
        )
        db.session.add(new_assignment)
        db.session.commit()
        return jsonify(assignment_to_dict(new_assignment)), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating assignment: {e}")
        return jsonify(error="Internal server error"), 500

@assignments_bp.route('/<id>', methods=['GET'])
@authenticate
def get_assignment(id):
    try:
        assignment = Assignment.query.options(joinedload(Assignment.teacher)).filter_by(id=id).first()
        if not assignment:
            return jsonify(error="Assignment not found"), 404
        return jsonify(assignment_to_dict(assignment))
    except Exception as e:
        current_app.logger.error(f"Error fetching assignment: {e}")
        return jsonify(error="Internal server error"), 500

@assignments_bp.route('/<id>/files', methods=['GET'])
@authenticate
def get_assignment_files(id):
    try:
        files = Attachment.query.filter_by(assignmentId=id).all()
        return jsonify([attachment_to_dict(f) for f in files])
    except Exception as e:
        current_app.logger.error(f"Error fetching assignment files: {e}")
        return jsonify(error="Internal server error"), 500

@assignments_bp.route('/<id>', methods=['PUT'])
@authorize(allowed_roles=['TEACHER', 'ADMIN'])
def update_assignment(id):
    data = request.json
    try:
        assignment = Assignment.query.filter_by(id=id, teacherId=g.user_id).first()
        if not assignment:
            return jsonify(error="Assignment not found or you don't have permission"), 404

        assignment.title = data.get('title', assignment.title)
        assignment.description = data.get('description', assignment.description)
        if 'due_date' in data:
            assignment.dueDate = datetime.fromisoformat(data['due_date'])
        assignment.maxScore = data.get('max_points', assignment.maxScore)
        assignment.updatedAt = datetime.utcnow()

        db.session.commit()
        return jsonify(assignment_to_dict(assignment))
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating assignment: {e}")
        return jsonify(error="Internal server error"), 500

@assignments_bp.route('/<id>', methods=['DELETE'])
@authorize(allowed_roles=['TEACHER', 'ADMIN'])
def delete_assignment(id):
    try:
        assignment = Assignment.query.filter_by(id=id, teacherId=g.user_id).first()
        if not assignment:
            return jsonify(error="Assignment not found or you don't have permission"), 404

        # 첨부 파일 삭제 (로컬 및 DB)
        for attachment in assignment.attachments:
            file_path = os.path.join(UPLOAD_FOLDER, attachment.fileUrl)
            if os.path.exists(file_path):
                os.remove(file_path)
            db.session.delete(attachment)

        db.session.delete(assignment)
        db.session.commit()
        return jsonify(message="Assignment deleted successfully"), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting assignment: {e}")
        return jsonify(error="Internal server error"), 500

@assignments_bp.route('/<id>/upload', methods=['POST'])
@authorize(allowed_roles=['TEACHER', 'ADMIN'])
def upload_attachment(id):
    if 'file' not in request.files:
        return jsonify(error='No file part'), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify(error='No selected file'), 400

    assignment = Assignment.query.get(id)
    if not assignment:
        return jsonify(error='Assignment not found'), 404

    # 파일 유효성 검사 (프론트엔드와 동일하게)
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'zip'}
    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    if file and allowed_file(file.filename):
        try:
            # 안전한 파일명 생성 및 저장 경로 구성
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            directory_path = os.path.join(current_app.root_path, UPLOAD_FOLDER, id)
            os.makedirs(directory_path, exist_ok=True)
            file_path = os.path.join(directory_path, unique_filename)
            file.save(file_path)

            # 데이터베이스에 파일 정보 저장
            new_attachment = Attachment(
                assignmentId=id,
                fileName=filename,
                fileUrl=os.path.join(id, unique_filename),
                fileSize=os.path.getsize(file_path),
                mimeType=file.mimetype,
            )
            db.session.add(new_attachment)
            db.session.commit()

            return jsonify(attachment_to_dict(new_attachment)), 201
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error uploading file: {e}")
            return jsonify(error="File upload failed"), 500
    else:
        return jsonify(error="File type not allowed"), 400