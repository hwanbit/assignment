# backend/routes/qa_logs.py

from flask import Blueprint, request, jsonify, g, current_app
from sqlalchemy.orm import joinedload
from backend.extensions import db
from backend.models import QALog, Assignment
from backend.routes.auth import authenticate

qa_logs_bp = Blueprint('qa_logs', __name__)

def qa_log_to_dict(qa_log):
    """QALog 객체를 딕셔너리로 변환합니다."""
    return {
        'id': qa_log.id,
        'assignmentId': qa_log.assignmentId,
        'userId': qa_log.userId,
        'question': qa_log.question,
        'answer': qa_log.answer,
        'createdAt': qa_log.createdAt.isoformat(),
        'updatedAt': qa_log.updatedAt.isoformat(),
        'user': {
            'id': qa_log.user.id,
            'full_name': qa_log.user.name
        } if qa_log.user else None
    }

@qa_logs_bp.route('/assignments/<assignment_id>', methods=['GET'])
@authenticate
def get_qa_logs_for_assignment(assignment_id):
    """특정 과제의 모든 Q&A 로그를 조회합니다."""
    try:
        logs = QALog.query.options(joinedload(QALog.user)).filter_by(assignmentId=assignment_id).order_by(QALog.createdAt).all()
        return jsonify([qa_log_to_dict(log) for log in logs])
    except Exception as e:
        current_app.logger.error(f"Error fetching Q&A logs: {e}")
        return jsonify(error="Internal server error"), 500

@qa_logs_bp.route('/', methods=['POST'])
@authenticate
def create_qa_log():
    """새로운 Q&A 질문을 생성합니다."""
    data = request.json
    try:
        assignment_id = data.get('assignmentId')
        question = data.get('question')

        if not all([assignment_id, question]):
            return jsonify(error="Missing required fields"), 400

        assignment = Assignment.query.get(assignment_id)
        if not assignment:
            return jsonify(error="Assignment not found"), 404

        new_log = QALog(
            assignmentId=assignment_id,
            userId=g.user_id,
            question=question
        )
        db.session.add(new_log)
        db.session.commit()

        # user 정보를 포함하여 반환하기 위해 다시 조회
        log_with_user = QALog.query.options(joinedload(QALog.user)).filter_by(id=new_log.id).first()

        return jsonify(qa_log_to_dict(log_with_user)), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating Q&A log: {e}")
        return jsonify(error="Internal server error"), 500