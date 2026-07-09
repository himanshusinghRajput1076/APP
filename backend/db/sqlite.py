from pathlib import Path
import json
from typing import Any

from sqlalchemy import create_engine, text as sql_text

DB_PATH = Path(__file__).parent.parent / "data" / "ideacon.sqlite"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

ENGINE = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})

def init_db():
    # single table storing collection, id, and JSON doc
    with ENGINE.begin() as conn:
        conn.execute(sql_text(
            "CREATE TABLE IF NOT EXISTS docs (collection TEXT NOT NULL, id TEXT NOT NULL, doc TEXT NOT NULL, PRIMARY KEY(collection,id))"
        ))

def get_engine():
    return ENGINE

def json_load(s: str) -> Any:
    return json.loads(s)

def json_dump(obj: Any) -> str:
    return json.dumps(obj, default=str)

