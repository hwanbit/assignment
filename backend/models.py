import uuid
from datetime import datetime
import enum
from sqlalchemy import Enum as SqlEnum
from backend.extensions import db

# Using standard Python enums
class UserStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Role(enum.Enum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    ADMIN = "ADMIN"

class SubmissionStatus(enum.Enum):
    PENDING = "PENDING"
    GRADED = "GRADED"
    RETURNED = "RETURNED"

class QALogSource(enum.Enum):
    LLM = "LLM"
    PROFESSOR = "PROFESSOR"


# =========================
# User
# =========================
class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(191), unique=True, nullable=False)
    password = db.Column(db.String(191), nullable=False)
    name = db.Column(db.String(191), nullable=False)
    role = db.Column(db.Enum(Role), default=Role.STUDENT, nullable=False)
    status = db.Column(db.Enum(UserStatus), default=UserStatus.PENDING, nullable=False)
    createdAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime(3), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    assignments = db.relationship("Assignment", foreign_keys="[Assignment.teacherId]", back_populates="teacher")
    submissions = db.relationship("Submission", foreign_keys="[Submission.studentId]", back_populates="student")
    grades = db.relationship("Grade", foreign_keys="[Grade.gradedBy]", back_populates="grader")
    qa_logs = db.relationship("QALog", foreign_keys="[QALog.studentId]", back_populates="student")


# =========================
# Assignment
# =========================
class Assignment(db.Model):
    __tablename__ = 'assignment'

    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(191), nullable=False)
    description = db.Column(db.Text, nullable=False)
    dueDate = db.Column(db.DateTime(3), nullable=False)
    maxScore = db.Column(db.Integer, nullable=False)
    teacherId = db.Column(db.String(191), db.ForeignKey('user.id'), nullable=False)
    createdAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime(3), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    teacher = db.relationship("User", back_populates="assignments")
    submissions = db.relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")
    attachments = db.relationship("Attachment", back_populates="assignment", cascade="all, delete-orphan")
    qa_logs = db.relationship("QALog", back_populates="assignment", cascade="all, delete-orphan")


# =========================
# Submission
# =========================
class Submission(db.Model):
    __tablename__ = 'submission'

    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignmentId = db.Column(db.String(191), db.ForeignKey('assignment.id'), nullable=False)
    studentId = db.Column(db.String(191), db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=True)
    submittedAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)
    status = db.Column(db.Enum(SubmissionStatus), default=SubmissionStatus.PENDING, nullable=False)

    __table_args__ = (db.UniqueConstraint('assignmentId', 'studentId', name='uq_submission'),)

    # Relationships
    student = db.relationship("User", back_populates="submissions")
    assignment = db.relationship("Assignment", back_populates="submissions")
    files = db.relationship("SubmissionFile", back_populates="submission", cascade="all, delete-orphan")
    grade = db.relationship("Grade", back_populates="submission", uselist=False, cascade="all, delete-orphan")


# =========================
# Grade
# =========================
class Grade(db.Model):
    __tablename__ = 'grade'

    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    submissionId = db.Column(db.String(191), db.ForeignKey('submission.id'), unique=True, nullable=False)
    score = db.Column(db.Integer, nullable=False)
    feedback = db.Column(db.Text, nullable=True)
    gradedBy = db.Column(db.String(191), db.ForeignKey('user.id'), nullable=False)
    gradedAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)

    # Relationships
    grader = db.relationship("User", back_populates="grades")
    submission = db.relationship("Submission", back_populates="grade")


# =========================
# Attachment
# =========================
class Attachment(db.Model):
    __tablename__ = 'attachment'

    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignmentId = db.Column(db.String(191), db.ForeignKey('assignment.id'), nullable=False)
    fileName = db.Column(db.String(191), nullable=False)
    fileUrl = db.Column(db.String(191), nullable=False)
    fileSize = db.Column(db.Integer, nullable=False)
    mimeType = db.Column(db.String(191), nullable=False)
    uploadedAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)

    # Relationships
    assignment = db.relationship("Assignment", back_populates="attachments")


# =========================
# SubmissionFile
# =========================
class SubmissionFile(db.Model):
    __tablename__ = 'submissionfile'

    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    submissionId = db.Column(db.String(191), db.ForeignKey('submission.id'), nullable=False)
    fileName = db.Column(db.String(191), nullable=False)
    fileUrl = db.Column(db.String(191), nullable=False)
    fileSize = db.Column(db.Integer, nullable=False)
    mimeType = db.Column(db.String(191), nullable=False)
    uploadedAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)

    # Relationships
    submission = db.relationship("Submission", back_populates="files")


# =========================
# QALog
# =========================
class QALog(db.Model):
    __tablename__ = 'QALog'

    id = db.Column(db.String(191), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignmentId = db.Column(db.String(191), db.ForeignKey('assignment.id'), nullable=False)
    studentId = db.Column(db.String(191), db.ForeignKey('user.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    source = db.Column(db.Enum(QALogSource), nullable=False)
    createdAt = db.Column(db.DateTime(3), default=datetime.utcnow, nullable=False)

    # Relationships
    student = db.relationship("User", back_populates="qa_logs")
    assignment = db.relationship("Assignment", back_populates="qa_logs")