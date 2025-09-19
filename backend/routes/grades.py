from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app
from sqlalchemy.orm import joinedload
from app import db
from models import Grade, Submission, Assignment, SubmissionStatus, User
from .auth import authenticate, authorize

grades_bp = Blueprint('grades', __name__)

def grade_to_dict(grade):
    """Grade 객체를 JSON 응답을 위한 딕셔너리로 변환합니다."""
    return {
        'id': grade.id,
        'submission_id': grade.submissionId,
        'professor_id': grade.gradedBy,
        'points': grade.score,
        'feedback': grade.feedback,
        'graded_at': grade.gradedAt.isoformat(),
        'professor': {
            'full_name': grade.grader.name
        } if grade.grader else None
    }

def submission_with_grade_to_dict(submission):
    """성적 정보가 포함된 Submission 객체를 딕셔너리로 변환합니다."""
    grade_data = grade_to_dict(submission.grade) if submission.grade else None

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

    return {
        'id': submission.id,
        'assignment_id': submission.assignmentId,
        'student_id': submission.studentId,
        'submitted_at': submission.submittedAt.isoformat(),
        'assignment': assignment_data,
        'student': student_data,
        'grade': grade_data
    }

@grades_bp.route('/submissions/<submissionId>/grade', methods=['POST'])
@authorize(allowed_roles=['TEACHER', 'ADMIN'])
def grade_submission(submissionId):
    data = request.json
    score = data.get('score')
    feedback = data.get('feedback')

    if score is None or not isinstance(score, int) or score < 0:
        return jsonify(error='점수는 0 이상의 정수여야 합니다.'), 400

    submission = Submission.query.options(joinedload(Submission.assignment)).filter_by(id=submissionId).first()
    if not submission:
        return jsonify(error='유효한 제출물 ID가 아닙니다.'), 400

    if score > submission.assignment.maxScore:
        return jsonify(error=f"점수는 최대 점수({submission.assignment.maxScore})를 초과할 수 없습니다."), 400

    try:
        grade = Grade.query.filter_by(submissionId=submissionId).first()
        if grade:
            grade.score = score
            grade.feedback = feedback
            grade.gradedAt = datetime.utcnow()
            db.session.commit()
        else:
            new_grade = Grade(
                submissionId=submissionId,
                score=score,
                feedback=feedback,
                gradedBy=g.user_id
            )
            db.session.add(new_grade)
            db.session.commit()
            grade = new_grade

        submission.status = SubmissionStatus.GRADED
        db.session.commit()

        return jsonify(grade_to_dict(grade)), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error grading submission: {e}")
        return jsonify(error="Internal server error"), 500

@grades_bp.route('/my-grades', methods=['GET'])
@authorize(allowed_roles=['STUDENT'])
def get_my_grades():
    try:
        # 학생은 자신의 제출물 중 채점된 것만 볼 수 있습니다.
        submissions = Submission.query.filter(
            Submission.studentId == g.user_id,
            Submission.grade != None
        ).options(
            joinedload(Submission.assignment),
            joinedload(Submission.grade).joinedload(Grade.grader)
        ).order_by(Submission.submittedAt.desc()).all()

        return jsonify([submission_with_grade_to_dict(s) for s in submissions])
    except Exception as e:
        current_app.logger.error(f"Error fetching my grades: {e}")
        return jsonify(error="Internal server error"), 500

@grades_bp.route('/assignments/<assignmentId>/grades', methods=['GET'])
@authorize(allowed_roles=['TEACHER', 'ADMIN'])
def get_assignment_grades(assignmentId):
    try:
        submissions = Submission.query.filter_by(assignmentId=assignmentId).options(
            joinedload(Submission.assignment),
            joinedload(Submission.student),
            joinedload(Submission.grade)
        ).order_by(Submission.submittedAt.desc()).all()

        return jsonify([submission_with_grade_to_dict(s) for s in submissions])
    except Exception as e:
        current_app.logger.error(f"Error fetching assignment grades: {e}")
        return jsonify(error="Internal server error"), 500

@grades_bp.route('/<gradeId>', methods=['PUT'])
@authorize(allowed_roles=['TEACHER', 'ADMIN'])
def update_grade(gradeId):
    data = request.json
    score = data.get('score')
    feedback = data.get('feedback')

    grade = Grade.query.filter_by(id=gradeId).first()
    if not grade:
        return jsonify(error="Grade not found"), 404

    submission = Submission.query.options(joinedload(Submission.assignment)).filter_by(id=grade.submissionId).first()
    if not submission:
        return jsonify(error="Associated submission not found"), 404

    if score is not None:
        if not isinstance(score, int) or score < 0:
            return jsonify(error='점수는 0 이상의 정수여야 합니다.'), 400
        if score > submission.assignment.maxScore:
            return jsonify(error=f"점수는 최대 점수({submission.assignment.maxScore})를 초과할 수 없습니다."), 400
        grade.score = score

    if feedback is not None:
        grade.feedback = feedback

    try:
        db.session.commit()
        return jsonify(grade_to_dict(grade)), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating grade: {e}")
        return jsonify(error="Internal server error"), 500

@grades_bp.route('/<gradeId>', methods=['DELETE'])
@authorize(allowed_roles=['TEACHER', 'ADMIN'])
def delete_grade(gradeId):
    grade = Grade.query.filter_by(id=gradeId).first()
    if not grade:
        return jsonify(error="Grade not found"), 404

    try:
        db.session.delete(grade)
        db.session.commit()
        return jsonify(message="Grade deleted successfully"), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting grade: {e}")
        return jsonify(error="Internal server error"), 500