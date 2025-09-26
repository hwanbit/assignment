# backend/routes/courses.py

from flask import Blueprint, request, jsonify
from backend.models import Course, User, Enrollment, Role
from backend.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity

# 'courses_bp' 라는 이름으로 블루프린트 객체를 생성합니다.
courses_bp = Blueprint('courses', __name__)

# [GET] 모든 강의 목록 조회
@courses_bp.route('/api/courses', methods=['GET'])
@jwt_required()
def get_courses():
    courses = Course.query.all()
    return jsonify([{
        'id': course.id,
        'name': course.name,
        'teacherId': course.teacherId
    } for course in courses]), 200

# [POST] 새 강의 생성
@courses_bp.route('/api/courses', methods=['POST'])
@jwt_required()
def create_course():
    data = request.get_json()
    current_user_id = get_jwt_identity()

    new_course = Course(
        name=data['name'],
        teacherId=current_user_id
    )
    db.session.add(new_course)
    db.session.commit()

    return jsonify({'id': new_course.id, 'name': new_course.name, 'teacherId': new_course.teacherId}), 201

# [GET] 특정 강의 정보 조회 (수강생 포함)
@courses_bp.route('/api/courses/<course_id>', methods=['GET'])
@jwt_required()
def get_course_details(course_id):
    course = Course.query.get_or_404(course_id)
    enrollments = Enrollment.query.filter_by(courseId=course_id).all()

    students = []
    for enrollment in enrollments:
        student = User.query.get(enrollment.studentId)
        if student:
            students.append({
                'id': student.id,
                'name': student.name,
                'email': student.email
            })

    return jsonify({
        'id': course.id,
        'name': course.name,
        'teacherId': course.teacherId,
        'students': students
    }), 200

# [PUT] 강의 정보 수정
@courses_bp.route('/api/courses/<course_id>', methods=['PUT'])
@jwt_required()
def update_course(course_id):
    course = Course.query.get_or_404(course_id)
    data = request.get_json()

    current_user_id = get_jwt_identity()
    if course.teacherId != current_user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    course.name = data.get('name', course.name)
    db.session.commit()

    return jsonify({'message': 'Course updated successfully'}), 200

# [DELETE] 강의 삭제
@courses_bp.route('/api/courses/<course_id>', methods=['DELETE'])
@jwt_required()
def delete_course(course_id):
    course = Course.query.get_or_404(course_id)

    current_user_id = get_jwt_identity()
    if course.teacherId != current_user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    Enrollment.query.filter_by(courseId=course_id).delete()
    db.session.delete(course)
    db.session.commit()

    return jsonify({'message': 'Course deleted successfully'}), 200

# [POST] 강의에 학생 등록
@courses_bp.route('/api/courses/<course_id>/enroll', methods=['POST'])
@jwt_required()
def enroll_student(course_id):
    data = request.get_json()
    student_id = data.get('studentId')

    if not student_id:
        return jsonify({'message': 'Student ID is required'}), 400

    existing_enrollment = Enrollment.query.filter_by(courseId=course_id, studentId=student_id).first()
    if existing_enrollment:
        return jsonify({'message': 'Student already enrolled'}), 409

    new_enrollment = Enrollment(courseId=course_id, studentId=student_id)
    db.session.add(new_enrollment)
    db.session.commit()

    return jsonify({'message': 'Student enrolled successfully'}), 201

# [DELETE] 강의에서 학생 삭제
@courses_bp.route('/api/courses/<course_id>/unenroll', methods=['DELETE'])
@jwt_required()
def unenroll_student(course_id):
    data = request.get_json()
    student_id = data.get('studentId')

    if not student_id:
        return jsonify({'message': 'Student ID is required'}), 400

    enrollment = Enrollment.query.filter_by(courseId=course_id, studentId=student_id).first()
    if enrollment:
        db.session.delete(enrollment)
        db.session.commit()
        return jsonify({'message': 'Student unenrolled successfully'}), 200

    return jsonify({'message': 'Enrollment record not found'}), 404

# [GET] 모든 학생 목록 조회 (교수/관리자용)
@courses_bp.route('/api/users/students', methods=['GET'])
@jwt_required()
def get_all_students():
    students = User.query.filter_by(role=Role.STUDENT).all()
    return jsonify([{
        'id': student.id,
        'name': student.name,
        'email': student.email
    } for student in students]), 200