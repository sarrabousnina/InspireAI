from sqlalchemy import Column, Integer, String
from db import Base
import auth

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    def verify_password(self, pwd):
        return auth.verify_password(pwd, self.hashed_password)
