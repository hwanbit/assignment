import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from backend.app import db

# UserStatus Enum 추가
class UserStatus(db.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

# MySQL ENUM 타입 정의
class Role(db.Enum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    ADMIN = "ADMIN"

class SubmissionStatus(db.Enum):
    PENDING = "PENDING"
    GRADED = "GRADED"
    RETURNED = "RETURNED"

class QALogSource(db.Enum):
    LLM = "LLM"
    PROFESSOR = "PROFESSOR"

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(191), unique=True, nullable=False)
    password = db.Column(db.String(191), nullable=False)
    name = db.Column(db.String(191), nullable=False)
    role = db.Column(Role, default=Role.STUDENT, nullable=False)
    status = db.Column(UserStatus, default=UserStatus.PENDING, nullable=False)
    createdAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime(3), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    assignments = db.relationship('Assignment', backref='teacher', lazy=True)
    submissions = db.relationship('Submission', backref='student', lazy=True)
    grades = db.relationship('Grade', backref='grader', lazy=True)
    qa_logs = db.relationship('QALog', backref='student', lazy=True)

class Assignment(db.Model):
    __tablename__ = 'assignments'
    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(191), nullable=False)
    description = db.Column(db.Text, nullable=False)
    dueDate = db.Column(db.DateTime(3), nullable=False)
    maxScore = db.Column(db.Integer, nullable=False)
    teacherId = db.Column(db.String(191), db.ForeignKey('users.id'), nullable=False)
    createdAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime(3), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    submissions = db.relationship('Submission', backref='assignment', lazy=True)
    attachments = db.relationship('Attachment', backref='assignment', lazy=True)
    qa_logs = db.relationship('QALog', backref='assignment', lazy=True)

class Submission(db.Model):
    __tablename__ = 'submissions'
    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignmentId = db.Column(db.String(191), db.ForeignKey('assignments.id'), nullable=False)
    studentId = db.Column(db.String(191), db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=True)
    submittedAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)
    status = db.Column(SubmissionStatus, default=SubmissionStatus.PENDING, nullable=False)

    __table_args__ = (db.UniqueConstraint('assignmentId', 'studentId', name='uq_submission'),)

    files = db.relationship('SubmissionFile', backref='submission', lazy=True)
    grade = db.relationship('Grade', backref='submission', uselist=False, lazy=True)

class Grade(db.Model):
    __tablename__ = 'grades'
    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    submissionId = db.Column(db.String(191), db.ForeignKey('submissions.id'), unique=True, nullable=False)
    score = db.Column(db.Integer, nullable=False)
    feedback = db.Column(db.Text, nullable=True)
    gradedBy = db.Column(db.String(191), db.ForeignKey('users.id'), nullable=False)
    gradedAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)

class Attachment(db.Model):
    __tablename__ = 'attachments'
    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignmentId = db.Column(db.String(191), db.ForeignKey('assignments.id'), nullable=False)
    fileName = db.Column(db.String(191), nullable=False)
    fileUrl = db.Column(db.String(191), nullable=False)
    fileSize = db.Column(db.Integer, nullable=False)
    mimeType = db.Column(db.String(191), nullable=False)
    uploadedAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)

class SubmissionFile(db.Model):
    __tablename__ = 'submission_files'
    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    submissionId = db.Column(db.String(191), db.ForeignKey('submissions.id'), nullable=False)
    fileName = db.Column(db.String(191), nullable=False)
    fileUrl = db.Column(db.String(191), nullable=False)
    fileSize = db.Column(db.Integer, nullable=False)
    mimeType = db.Column(db.String(191), nullable=False)
    uploadedAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)

class QALog(db.Model):
    __tablename__ = 'qa_logs'
    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignmentId = db.Column(db.String(191), db.ForeignKey('assignments.id'), nullable=False)
    studentId = db.Column(db.String(191), db.ForeignKey('users.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    source = db.Column(QALogSource, nullable=False)
    createdAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)