import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import jwt

# Environment variables setup
from dotenv import load_dotenv
load_dotenv(override=True)

db = SQLAlchemy()
bcrypt = Bcrypt()

def create_app():
    app = Flask(__name__)
    CORS(app) # CORS 설정

    # Configuration
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or "a-secret-key"
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL") or "mysql+mysqlconnector://sun:1234@localhost/assignment_db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)

    # Ensure uploads directory exists
    os.makedirs('uploads/assignments', exist_ok=True)
    os.makedirs('uploads/submissions', exist_ok=True)

    # Register blueprints for routes
    from .routes.auth import auth_bp
    from .routes.assignments import assignments_bp
    from .routes.submissions import submissions_bp
    from .routes.grades import grades_bp
    from .routes.files import files_bp
    from .routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(assignments_bp, url_prefix='/api/assignments')
    app.register_blueprint(submissions_bp, url_prefix='/api/submissions')
    app.register_blueprint(grades_bp, url_prefix='/api/grades')
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Handle global errors
    @app.errorhandler(404)
    def page_not_found(e):
        return jsonify(error="Not found"), 404

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        # Create database tables
        db.create_all()
    app.run(debug=True)