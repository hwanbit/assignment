import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

# --- 로컬 모듈 및 확장 기능 import ---
from backend.config import Config
from backend.extensions import db, bcrypt, jwt
from backend.routes.auth import auth_bp
from backend.routes.assignments import assignments_bp
from backend.routes.submissions import submissions_bp
from backend.routes.grades import grades_bp
from backend.routes.admin import admin_bp
from backend.routes.qa_logs import qa_logs_bp
from backend.routes.files import files_bp
from backend.routes.courses import courses_bp

def create_app(config_class=Config):
    """
    Application Factory 함수: Flask 애플리케이션을 생성하고 설정합니다.
    """
    app = Flask(__name__)

    # --- 1. 설정 로드 ---
    app.config.from_object(config_class)

    # --- 2. 확장(Extensions) 초기화 ---
    # CORS는 credentials를 지원하도록 명확하게 설정해야 합니다.
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app) # JWT 초기화가 필수입니다.

    # --- 3. 블루프린트(Routes) 등록 ---
    # 모든 API 엔드포인트를 등록합니다.
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(assignments_bp, url_prefix='/api/assignments')
    app.register_blueprint(submissions_bp, url_prefix='/api/submissions')
    app.register_blueprint(grades_bp, url_prefix='/api/grades')
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(qa_logs_bp, url_prefix='/api/qa-logs')
    app.register_blueprint(courses_bp, url_prefix='/api/courses')

    # --- 4. 업로드 디렉토리 생성 ---
    with app.app_context():
        os.makedirs(app.config.get('ASSIGNMENT_UPLOAD_FOLDER', 'uploads/assignments'), exist_ok=True)
        os.makedirs(app.config.get('SUBMISSION_UPLOAD_FOLDER', 'uploads/submissions'), exist_ok=True)

    # --- 5. 전역 에러 핸들러 ---
    @app.errorhandler(404)
    def page_not_found(e):
        return jsonify(error="The requested resource was not found."), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        app.logger.error(f"Internal Server Error: {e}")
        return jsonify(error="An internal server error occurred."), 500

    return app

# --- 개발 서버 실행 ---
if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)