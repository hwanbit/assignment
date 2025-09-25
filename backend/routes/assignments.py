import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from sqlalchemy.orm import joinedload
from backend.extensions import db
from backend.models import User, Assignment, Attachment, Submission, Grade, Enrollment, Course
from backend.routes.auth import authenticate, authorize

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
    """
    모든 과제를 조회합니다.
    - ADMIN: 모든 과제를 조회합니다.
    - PROFESSOR: 자신이 생성한 과제만 조회합니다.
    - STUDENT: 모든 과제를 조회합니다.
    """
    try:
        user_role = g.user_role
        user_id = g.user_id
        query = Assignment.query.options(joinedload(Assignment.teacher))

        if user_role == 'PROFESSOR':
            # 교수는 자신이 가르치는 강의의 과제만 조회
            query = query.join(Course).filter(Course.teacherId == user_id)
        elif user_role == 'STUDENT':
            # 학생은 자신이 수강하는 강의의 과제만 조회
            enrolled_course_ids = [e.courseId for e in Enrollment.query.filter_by(studentId=user_id).all()]
            query = query.filter(Assignment.courseId.in_(enrolled_course_ids))

        assignments = query.order_by(Assignment.dueDate).all()
        return jsonify([assignment_to_dict(a) for a in assignments])
    except Exception as e:
        current_app.logger.error(f"Error fetching assignments: {e}")
        return jsonify(error="Internal server error"), 500

@assignments_bp.route('/', methods=['POST'])
@authorize(allowed_roles=['PROFESSOR', 'ADMIN'])
def create_assignment():
    try:
        data = request.form
        files = request.files.getlist('files')

        due_date_str = data['due_date']
        if due_date_str.endswith('Z'):
            due_date_str = due_date_str[:-1] + '+00:00'

        due_date_obj = datetime.fromisoformat(due_date_str)

        course_id = data.get('courseId')
        if not course_id:
            return jsonify(error="Course ID is required"), 400

        new_assignment = Assignment(
            title=data['title'],
            description=data['description'],
            dueDate=due_date_obj,
            maxScore=int(data['max_points']),
            teacherId=g.user_id,
            courseId=course_id,
        )
        db.session.add(new_assignment)
        db.session.commit()

        if files:
            for file in files:
                if file:
                    filename = secure_filename(file.filename)
                    unique_filename = f"{uuid.uuid4()}_{filename}"
                    directory_path = os.path.join(current_app.root_path, UPLOAD_FOLDER, new_assignment.id)
                    os.makedirs(directory_path, exist_ok=True)
                    file_path = os.path.join(directory_path, unique_filename)
                    file.save(file_path)

                    new_attachment = Attachment(
                        assignmentId=new_assignment.id,
                        fileName=filename,
                        fileUrl=os.path.join(new_assignment.id, unique_filename),
                        fileSize=os.path.getsize(file_path),
                        mimeType=file.mimetype,
                    )
                    db.session.add(new_attachment)

            db.session.commit()

        return jsonify(assignment_to_dict(new_assignment)), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating assignment: {e}")
        return jsonify(error="Internal server error"), 500

@assignments_bp.route('/<id>', methods=['GET'])
@authenticate
def get_assignment(id):
    """
    특정 과제를 조회합니다.
    - PROFESSOR는 자신이 생성한 과제만 조회할 수 있습니다.
    """
    try:
        assignment = Assignment.query.options(joinedload(Assignment.teacher)).filter_by(id=id).first()
        if not assignment:
            return jsonify(error="Assignment not found"), 404

        if g.user_role == 'PROFESSOR' and assignment.teacherId != g.user_id:
            return jsonify(error="Forbidden"), 403

        return jsonify(assignment_to_dict(assignment))
    except Exception as e:
        current_app.logger.error(f"Error fetching assignment: {e}")
        return jsonify(error="Internal server error"), 500

@assignments_bp.route('/<assignment_id>/files', methods=['GET'])
@authenticate
def get_assignment_files(assignment_id):
    try:
        assignment = Assignment.query.filter_by(id=assignment_id).first()
        if not assignment:
            return jsonify(error="Assignment not found"), 404

        if g.user_role == 'PROFESSOR' and assignment.teacherId != g.user_id:
            return jsonify(error="Forbidden"), 403

        files = Attachment.query.filter_by(assignmentId=assignment_id).all()
        return jsonify([attachment_to_dict(f) for f in files])
    except Exception as e:
        current_app.logger.error(f"Error fetching assignment files: {e}")
        return jsonify(error="Internal server error"), 500

@assignments_bp.route('/<id>', methods=['PUT'])
@authorize(allowed_roles=['PROFESSOR', 'ADMIN'])
def update_assignment(id):
    """
    과제를 수정합니다.
    - ADMIN은 모든 과제를 수정할 수 있습니다.
    - PROFESSOR는 자신이 생성한 과제만 수정할 수 있습니다.
    """
    data = request.json
    try:
        assignment = Assignment.query.filter_by(id=id).first()
        if not assignment:
            return jsonify(error="Assignment not found"), 404

        if g.user_role == 'PROFESSOR' and assignment.teacherId != g.user_id:
            return jsonify(error="You don't have permission to edit this assignment"), 403

        graded_submission_exists = db.session.query(Grade.id).join(Submission).filter(Submission.assignmentId == id).first()
        if graded_submission_exists:
            return jsonify(error="Cannot edit an assignment that has already been graded."), 403

        assignment.title = data.get('title', assignment.title)
        assignment.description = data.get('description', assignment.description)

        if 'due_date' in data:
            due_date_str = data['due_date']
            if due_date_str.endswith('Z'):
                due_date_str = due_date_str[:-1] + '+00:00'
            assignment.dueDate = datetime.fromisoformat(due_date_str)

        assignment.maxScore = data.get('max_points', assignment.maxScore)
        assignment.updatedAt = datetime.utcnow()

        db.session.commit()
        return jsonify(assignment_to_dict(assignment))
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating assignment: {e}")
        return jsonify(error="Internal server error"), 500

@assignments_bp.route('/<id>', methods=['DELETE'])
@authorize(allowed_roles=['PROFESSOR', 'ADMIN'])
def delete_assignment(id):
    """
    과제를 삭제합니다.
    - ADMIN은 모든 과제를 삭제할 수 있습니다.
    - PROFESSOR는 자신이 생성한 과제만 삭제할 수 있습니다.
    """
    try:
        assignment = Assignment.query.filter_by(id=id).first()
        if not assignment:
            return jsonify(error="Assignment not found"), 404

        if g.user_role == 'PROFESSOR' and assignment.teacherId != g.user_id:
            return jsonify(error="You don't have permission to delete this assignment"), 403

        graded_submission_exists = db.session.query(Grade.id).join(Submission).filter(Submission.assignmentId == id).first()
        if graded_submission_exists:
            return jsonify(error="Cannot delete an assignment that has already been graded."), 403

        for attachment in assignment.attachments:
            file_path = os.path.join(current_app.root_path, UPLOAD_FOLDER, attachment.fileUrl)
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
@authorize(allowed_roles=['PROFESSOR', 'ADMIN'])
def upload_attachment(id):
    if 'file' not in request.files:
        return jsonify(error='No file part'), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify(error='No selected file'), 400

    assignment = Assignment.query.get(id)
    if not assignment:
        return jsonify(error='Assignment not found'), 404

    if g.user_role == 'PROFESSOR' and assignment.teacherId != g.user_id:
        return jsonify(error="You don't have permission to upload files to this assignment"), 403

    if file:
        try:
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            directory_path = os.path.join(current_app.root_path, UPLOAD_FOLDER, id)
            os.makedirs(directory_path, exist_ok=True)
            file_path = os.path.join(directory_path, unique_filename)
            file.save(file_path)

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
        return jsonify(error="File not provided"), 400