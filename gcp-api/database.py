from sqlmodel import SQLModel, Field, create_engine, Session, select
from typing import Optional, List
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/traceroute")

engine = create_engine(DATABASE_URL)

class HopResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    origin: str
    destination: str
    ping_time: Optional[int] = None
    region: str # Region that performed the traceroute

class TargetStatus(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    target: str
    region: str
    status: str = "pending" # pending, in-progress, completed
    last_updated: Optional[float] = None

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
