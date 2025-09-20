import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# extensions.py에서 db와 bcrypt 인스턴스를 가져옵니다.
from backend.extensions import db, bcrypt

# .env 파일 로드
load_dotenv(override=True)

def create_app():
    """
    Application Factory Function.
    Creates and configures the Flask app.
    """
    app = Flask(__name__)

    # Configuration
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "a-default-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "mysql+mysqlconnector://sun:1234@localhost/assignment_db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # CORS configuration
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize extensions with the app instance
    db.init_app(app)
    bcrypt.init_app(app)

    # Ensure upload directories exist
    os.makedirs('uploads/assignments', exist_ok=True)
    os.makedirs('uploads/submissions', exist_ok=True)

    # Import and register blueprints within the app context to avoid circular imports
    with app.app_context():
        from backend.routes.auth import auth_bp
        from backend.routes.assignments import assignments_bp
        from backend.routes.submissions import submissions_bp
        from backend.routes.grades import grades_bp
        from backend.routes.files import files_bp
        from backend.routes.admin import admin_bp

        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(assignments_bp, url_prefix='/api/assignments')
        app.register_blueprint(submissions_bp, url_prefix='/api/submissions')
        app.register_blueprint(grades_bp, url_prefix='/api/grades')
        app.register_blueprint(files_bp, url_prefix='/api/files')
        app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Global error handlers
    @app.errorhandler(404)
    def page_not_found(e):
        return jsonify(error="Not found"), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        # In debug mode, Flask will still show the detailed debugger
        app.logger.error(f"Internal Server Error: {e}")
        return jsonify(error="Internal server error occurred"), 500

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)