import os

class Config:
    """Flask 앱의 기본 설정"""
    SECRET_KEY = os.environ.get("SECRET_KEY") or "a-secret-key"
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or "mysql+mysqlconnector://sun:1234@localhost/assignment_db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT 설정
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET") or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES") or 15)  # in minutes
    JWT_REFRESH_TOKEN_EXPIRES = int(os.environ.get("JWT_REFRESH_TOKEN_EXPIRES") or 7)   # in days

    # 파일 업로드 설정
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024 * 1024  # 5GB