from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

# 확장 인스턴스를 여기서 생성합니다.
# 이 파일은 app 객체에 의존하지 않으므로 순환 참조가 발생하지 않습니다.
db = SQLAlchemy()
bcrypt = Bcrypt()