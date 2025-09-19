from flask import Blueprint, jsonify, g
from backend.app import db
from backend.models import User, UserStatus
from backend.routes.auth import authorize

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/pending-users', methods=['GET'])
@authorize(allowed_roles=['ADMIN'])
def get_pending_users():
    pending_users = User.query.filter_by(status=UserStatus.PENDING).all()
    return jsonify([{
        'id': user.id,
        'email': user.email,
        'fullName': user.name,
        'role': user.role.value,
        'createdAt': user.createdAt
    } for user in pending_users])

@admin_bp.route('/users/<user_id>/approve', methods=['POST'])
@authorize(allowed_roles=['ADMIN'])
def approve_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify(error="User not found"), 404
    user.status = UserStatus.APPROVED
    db.session.commit()
    return jsonify(message="User approved successfully"), 200

@admin_bp.route('/users/<user_id>/reject', methods=['POST'])
@authorize(allowed_roles=['ADMIN'])
def reject_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify(error="User not found"), 404
    user.status = UserStatus.REJECTED
    db.session.commit()
    return jsonify(message="User rejected successfully"), 200