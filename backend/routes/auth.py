import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify, g
from backend.extensions import db, bcrypt
from backend.models import User, UserStatus, Role
import os
import re

auth_bp = Blueprint('auth', __name__)

def generate_tokens(user_id, role, email):
    # 액세스 토큰 생성
    access_payload = {
        'userId': user_id,
        'role': role.value,
        'email': email,
        'exp': datetime.utcnow() + timedelta(minutes=15)
    }
    access_token = jwt.encode(access_payload, os.environ.get("SECRET_KEY"), algorithm='HS256')

    # 리프레시 토큰 생성
    refresh_payload = {
        'userId': user_id,
        'role': role.value,
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    refresh_token = jwt.encode(refresh_payload, os.environ.get("SECRET_KEY"), algorithm='HS256')

    return access_token, refresh_token

def authenticate(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify(error='인증 토큰이 제공되지 않았습니다.'), 401

        token = auth_header.split(' ')[1]
        try:
            decoded = jwt.decode(token, os.environ.get("SECRET_KEY"), algorithms=['HS256'])
            g.user_id = decoded['userId']
            g.user_role = decoded['role']
            g.user_email = decoded['email']
        except jwt.ExpiredSignatureError:
            return jsonify(error='토큰이 만료되었습니다.', code='TOKEN_EXPIRED'), 401
        except jwt.InvalidTokenError:
            return jsonify(error='유효하지 않은 토큰입니다.'), 401

        return f(*args, **kwargs)
    return decorated

def authorize(allowed_roles):
    def wrapper(f):
        @wraps(f)
        @authenticate
        def decorated(*args, **kwargs):
            if g.user_role not in allowed_roles:
                return jsonify(error='이 작업을 수행할 권한이 없습니다.', requiredRoles=allowed_roles, currentRole=g.user_role), 403
            return f(*args, **kwargs)
        return decorated
    return wrapper

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('fullName')
    role_str = data.get('role') # 'role' 대신 'role_str'로 변경하여 혼동 방지

    # 필드 입력 확인
    if not all([email, password, full_name, role_str]):
        return jsonify(error='모든 필드를 입력해주세요.'), 400

    # 이름 유효성 검사 (한글, 영문 대소문자만 허용)
    if not re.match(r'^[가-힣a-zA-Z]+$', full_name):
        return jsonify(error='이름은 한글 또는 영문으로만 구성되어야 합니다.'), 400

    # 비밀번호 유효성 검사 (8~20자, 영문 대문자, 소문자, 숫자 각 1개 이상 필수)
    if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,20}$', password):
        return jsonify(error='비밀번호는 8~20자 길이의 영문 대소문자, 숫자를 모두 포함해야 합니다.'), 400

    # 이메일 도메인 검사
    if not email.endswith('@office.kopo.ac.kr'):
        return jsonify(error='이메일은 @office.kopo.ac.kr 도메인만 사용할 수 있습니다.'), 400

    # 이메일 ID(@ 앞부분) 형식 검사
    local_part = email.split('@')[0]
    if not re.match(r'^[A-Za-z0-9]([-_.]?[A-Za-z0-9])*$', local_part):
        return jsonify(error='이메일 주소의 ID 형식이 올바르지 않습니다.'), 400

    # 이메일 중복 확인
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify(error='이미 사용 중인 이메일입니다.'), 409

    # [수정] 프론트엔드 역할(professor)을 백엔드 역할(TEACHER)로 변환
    role_to_save = role_str.upper()
    if role_to_save == 'PROFESSOR':
        role_to_save = 'TEACHER'

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(
        email=email,
        password=hashed_password,
        name=full_name,
        role=Role[role_to_save] # 변환된 값으로 저장
    )

    db.session.add(new_user)
    db.session.commit()

    access_token, refresh_token = generate_tokens(new_user.id, new_user.role, new_user.email)

    return jsonify({
            'message': '회원가입 요청이 완료되었습니다. 관리자의 승인을 기다려주세요.',
        }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    # 사용자 상태 확인 로직 추가
    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify(error='이메일 또는 비밀번호가 올바르지 않습니다.'), 401

    if user.status != UserStatus.APPROVED:
        return jsonify(error='아직 승인되지 않은 계정이거나 거부된 계정입니다.'), 403

    access_token, refresh_token = generate_tokens(user.id, user.role, user.email)

    return jsonify({
        'message': '로그인되었습니다.',
        'token': access_token,
        'refreshToken': refresh_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'fullName': user.name,
            'role': user.role.value,
        }
    }), 200

@auth_bp.route('/me', methods=['GET'])
@authenticate
def get_current_user():
    user = User.query.filter_by(id=g.user_id).first()
    if not user:
        return jsonify(error='사용자를 찾을 수 없습니다.'), 404

    return jsonify({
        'user': {
            'id': user.id,
            'email': user.email,
            'fullName': user.name,
            'role': user.role.value,
            'createdAt': user.createdAt,
            'updatedAt': user.updatedAt,
        }
    }), 200

@auth_bp.route('/update-profile', methods=['PUT'])
@authorize(allowed_roles=["STUDENT", "PROFESSOR", "ADMIN"])
def update_profile():
    data = request.json
    full_name = data.get('fullName')
    email = data.get('email')

    user = User.query.filter_by(id=g.user_id).first()
    if not user:
        return jsonify(error='사용자를 찾을 수 없습니다.'), 404

    if full_name:
        user.name = full_name

    if email and email != user.email:
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify(error='이미 사용 중인 이메일입니다.'), 409
        user.email = email

    db.session.commit()

    return jsonify({
        'message': '프로필이 업데이트되었습니다.',
        'user': {
            'id': user.id,
            'email': user.email,
            'fullName': user.name,
            'role': user.role.value,
            'updatedAt': user.updatedAt,
        }
    }), 200

@auth_bp.route('/change-password', methods=['POST'])
@authenticate
def change_password():
    data = request.json
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')

    if not all([current_password, new_password]) or len(new_password) < 6:
        return jsonify(error='유효하지 않은 입력값입니다.'), 400

    user = User.query.filter_by(id=g.user_id).first()
    if not user:
        return jsonify(error='사용자를 찾을 수 없습니다.'), 404

    if not bcrypt.check_password_hash(user.password, current_password):
        return jsonify(error='현재 비밀번호가 올바르지 않습니다.'), 401

    user.password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()

    return jsonify(message='비밀번호가 변경되었습니다.'), 200

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    data = request.json
    refresh_token = data.get('refreshToken')

    if not refresh_token:
        return jsonify(error='리프레시 토큰이 필요합니다.'), 401

    try:
        decoded = jwt.decode(refresh_token, os.environ.get("SECRET_KEY"), algorithms=['HS256'])
        new_access_token, new_refresh_token = generate_tokens(decoded['userId'], Role[decoded['role']], decoded['email'])
        return jsonify(token=new_access_token, refreshToken=new_refresh_token), 200
    except jwt.ExpiredSignatureError:
        return jsonify(error='리프레시 토큰이 만료되었습니다.'), 401
    except jwt.InvalidTokenError:
        return jsonify(error='유효하지 않은 리프레시 토큰입니다.'), 401

@auth_bp.route('/logout', methods=['POST'])
@authenticate
def logout():
    # 서버 측에서는 별도 작업 없이 성공 응답만 반환
    return jsonify(message='로그아웃되었습니다.'), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    # TODO: Implement email sending for password reset
    return jsonify(message='이메일로 비밀번호 재설정 링크가 발송됩니다.'), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    # TODO: Implement password reset logic
    return jsonify(message='비밀번호가 재설정되었습니다.'), 200