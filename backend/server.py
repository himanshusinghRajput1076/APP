"""
IDEACON Backend - Startup Ecosystem Platform
FastAPI + MongoDB + JWT Auth + WebSocket Chat + Razorpay
"""
import os
import uuid
import logging
import asyncio
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any, Literal
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Query
from fastapi.security import OAuth2PasswordBearer
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy import text as sql_text
from db import sqlite as sqlite_db
from pydantic import BaseModel, Field, EmailStr
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "ideacon")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-me-in-prod")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@ideacon.in")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@Ideacon2026")
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_placeholder")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "placeholder_secret")
PAYMENT_MODE = os.environ.get("PAYMENT_MODE", "mock")  # mock | live

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Roles
ROLE_STUDENT = "student"
ROLE_INVESTOR = "investor"
ROLE_GROWING = "growing_startup"
ROLE_ADMIN = "admin"
ALL_ROLES = {ROLE_STUDENT, ROLE_INVESTOR, ROLE_GROWING, ROLE_ADMIN}

# Subscription plans (amount in paise for razorpay compatibility)
DEFAULT_PLANS = {
    "student_basic": {
        "role": ROLE_STUDENT, "tier": "basic", "amount": 20500, "credits": 50, "limit": 10, "days": 30, "ignite_tokens": 5,
        "name": "Founder Basic", "features": ["10 investor profiles", "Unlimited pitching", "In-app chat", "Digital ID Card", "40+ sector browse"]
    },
    "student_pro": {
        "role": ROLE_STUDENT, "tier": "pro", "amount": 54900, "credits": 150, "limit": 30, "days": 30, "ignite_tokens": 20,
        "name": "Founder Pro", "features": ["30 investor profiles", "Priority pitch review", "1-on-1 mentorship sessions", "Pro Digital ID", "Company setup assist", "End-to-end fundraising help"]
    },
    "investor_basic": {
        "role": ROLE_INVESTOR, "tier": "basic", "amount": 54900, "credits": 150, "limit": 50, "days": 30, "ignite_tokens": 50,
        "name": "Partner Basic", "features": ["55 founder profiles", "Sector-based discovery", "In-app chat", "Pro Digital ID", "40+ sector filters"]
    },
    "startup_basic": {
        "role": ROLE_GROWING, "tier": "basic", "amount": 54900, "credits": 150, "limit": 40, "days": 30, "ignite_tokens": 15,
        "name": "Startup Basic", "features": ["40 investor profiles", "Company pitch feed", "In-app chat", "Digital ID Card", "Growth analytics"]
    },
    "startup_pro": {
        "role": ROLE_GROWING, "tier": "pro", "amount": 74900, "credits": 250, "limit": 60, "days": 30, "ignite_tokens": 30,
        "name": "Startup Pro", "features": ["60 investor profiles", "Priority visibility", "Investment intro help", "End-to-end services", "Compliance assist", "Pro Digital ID"]
    },
}

REFERRAL_BONUS_CREDITS = 100  # both referrer & referee get this on successful subscription

# Achievement definitions
ACHIEVEMENTS = {
    "welcome_aboard": {"name": "Welcome Aboard", "desc": "Joined IDEACON", "icon": "rocket", "color": "primary"},
    "verified_founder": {"name": "Verified", "desc": "Completed KYC verification", "icon": "shield-checkmark", "color": "secondary"},
    "first_pitch": {"name": "First Pitch", "desc": "Posted your first idea", "icon": "bulb", "color": "primary"},
    "hot_pitch": {"name": "Hot Pitch", "desc": "Got 10+ ignites on a pitch", "icon": "flame", "color": "primary"},
    "connector": {"name": "Connector", "desc": "Started 5 conversations", "icon": "chatbubbles", "color": "secondary"},
    "premium_member": {"name": "Premium", "desc": "Subscribed to a plan", "icon": "star", "color": "primary"},
    "pro_member": {"name": "Pro Elite", "desc": "Subscribed to Pro tier", "icon": "diamond", "color": "secondary"},
    "referrer": {"name": "Ambassador", "desc": "Referred 1+ paying user", "icon": "people", "color": "secondary"},
    "angel_touch": {"name": "Angel Touch", "desc": "Gifted 5+ ignites to founders", "icon": "gift", "color": "primary"},
}

# 40 sectors
SECTORS = [
    "Information Technology / IT Services", "Software Development",
    "Artificial Intelligence & Automation", "Cybersecurity", "Digital Marketing",
    "E-commerce", "Healthcare & Medical", "Education & EdTech",
    "Finance & FinTech", "Banking & Insurance", "Real Estate",
    "Construction & Infrastructure", "Manufacturing", "Retail & Wholesale",
    "Food & Beverage", "Agriculture & AgriTech", "Travel & Tourism",
    "Transportation & Logistics", "Media & Entertainment", "Fashion & Apparel",
    "Automobile", "Energy & Renewable Energy", "Telecommunication",
    "Legal & Consulting Services", "Human Resource / Recruitment",
    "Event Management", "Hospitality / Hotels", "Beauty & Wellness",
    "Sports & Fitness", "Research & Development", "Defence Technology",
    "Cloud Computing", "SaaS / Product-Based Business", "B2B Services",
    "B2C Services", "Startup & Entrepreneurship", "Import & Export",
    "NGO / Social Impact", "Gaming & Esports", "Environmental Services"
]


# --------------------------------------------------------------------------- #
# Utilities
# --------------------------------------------------------------------------- #
def uid() -> str:
    return str(uuid.uuid4())

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()

def hash_pw(p: str) -> str:
    return pwd_context.hash(p)

def verify_pw(p: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(p, hashed)
    except Exception:
        return False

def create_token(sub: dict) -> str:
    payload = sub.copy()
    payload["exp"] = now_utc() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["iat"] = now_utc()
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


# --------------------------------------------------------------------------- #
# DB setup
# --------------------------------------------------------------------------- #
USE_SQLITE = os.environ.get("USE_SQLITE", "1") == "1"

if USE_SQLITE:
    # initialize sqlite and provide simple sync helpers for tests/local runs
    sqlite_db.init_db()
    engine = sqlite_db.get_engine()

    class _SqliteUpdateResult:
        def __init__(self, matched_count: int = 0, modified_count: int = 0):
            self.matched_count = matched_count
            self.modified_count = modified_count

    class _SqliteCollection:
        def __init__(self, table):
            self.table = table

        def _row_to_doc(self, row):
            if not row:
                return None
            try:
                data = row._mapping["doc"]
            except Exception:
                try:
                    data = row["doc"]
                except Exception:
                    data = row[0]
            return json.loads(data)

        def _apply_projection(self, doc, projection):
            if projection is None or not isinstance(projection, dict) or doc is None:
                return doc
            doc = dict(doc)
            include = any(bool(v) for v in projection.values())
            exclude = any(v == 0 for v in projection.values())
            if include and not exclude:
                result = {}
                for key, value in projection.items():
                    if bool(value) and key in doc:
                        result[key] = doc[key]
                if "id" in doc and "id" not in projection:
                    result["id"] = doc["id"]
                return result
            for key, value in projection.items():
                if value == 0 and key in doc:
                    doc.pop(key)
            return doc

        def _build_where(self, q, params):
            where = ["collection = :collection"]
            for k, v in (q or {}).items():
                if isinstance(v, dict):
                    for op, val in v.items():
                        if op == "$ne":
                            if val is None:
                                where.append(f"json_extract(doc, '$.{k}') IS NOT NULL")
                            else:
                                params[f"{k}_ne"] = val
                                where.append(f"json_extract(doc, '$.{k}') != :{k}_ne")
                        elif op == "$gte":
                            params[f"{k}_gte"] = val
                            where.append(f"json_extract(doc, '$.{k}') >= :{k}_gte")
                        elif op == "$gt":
                            params[f"{k}_gt"] = val
                            where.append(f"json_extract(doc, '$.{k}') > :{k}_gt")
                        elif op == "$lte":
                            params[f"{k}_lte"] = val
                            where.append(f"json_extract(doc, '$.{k}') <= :{k}_lte")
                        elif op == "$lt":
                            params[f"{k}_lt"] = val
                            where.append(f"json_extract(doc, '$.{k}') < :{k}_lt")
                        elif op == "$in":
                            if not isinstance(val, (list, tuple)):
                                raise ValueError("$in requires a list")
                            placeholders = []
                            for idx, item in enumerate(val):
                                key_name = f"{k}_in_{idx}"
                                params[key_name] = item
                                placeholders.append(f":{key_name}")
                            where.append(f"json_extract(doc, '$.{k}') IN ({', '.join(placeholders)})")
                        elif op == "$nin":
                            if not isinstance(val, (list, tuple)):
                                raise ValueError("$nin requires a list")
                            placeholders = []
                            for idx, item in enumerate(val):
                                key_name = f"{k}_nin_{idx}"
                                params[key_name] = item
                                placeholders.append(f":{key_name}")
                            where.append(f"json_extract(doc, '$.{k}') NOT IN ({', '.join(placeholders)})")
                        elif op == "$exists":
                            if val:
                                where.append(f"json_extract(doc, '$.{k}') IS NOT NULL")
                            else:
                                where.append(f"json_extract(doc, '$.{k}') IS NULL")
                        else:
                            raise ValueError(f"Unsupported query operator: {op}")
                else:
                    if v is None:
                        where.append(f"json_extract(doc, '$.{k}') IS NULL")
                    else:
                        params[k] = v
                        where.append(f"json_extract(doc, '$.{k}') = :{k}")
            return where

        async def create_index(self, *args, **kwargs):
            return

        async def find_one(self, q, projection=None):
            params = {"collection": self.table}
            where = self._build_where(q, params)
            sql = sql_text(f"SELECT doc FROM docs WHERE {' AND '.join(where)} LIMIT 1")
            with engine.connect() as conn:
                res = conn.execute(sql, params).first()
                doc = self._row_to_doc(res)
                return self._apply_projection(doc, projection)

        async def insert_one(self, doc):
            if "id" not in doc:
                doc["id"] = uid()
            payload = json.dumps(doc, default=str)
            with engine.begin() as conn:
                conn.execute(sql_text("INSERT INTO docs (collection, id, doc) VALUES (:collection, :id, :doc)"), {"collection": self.table, "id": doc["id"], "doc": payload})

        async def update_one(self, q, update, upsert=False):
            existing = await self.find_one(q)
            if not existing and upsert:
                new = {}
                if "$set" in update:
                    new.update(update["$set"])
                if "id" in q:
                    new["id"] = q["id"]
                await self.insert_one(new)
                return _SqliteUpdateResult(matched_count=1, modified_count=1)
            if not existing:
                return _SqliteUpdateResult(matched_count=0, modified_count=0)
            doc = dict(existing)
            if "$set" in update:
                doc.update(update["$set"])
            if "$inc" in update:
                for k, v in update["$inc"].items():
                    doc[k] = doc.get(k, 0) + v
            if "$addToSet" in update:
                for k, v in update["$addToSet"].items():
                    arr = list(doc.get(k, []))
                    if isinstance(v, list):
                        for item in v:
                            if item not in arr: arr.append(item)
                    else:
                        if v not in arr: arr.append(v)
                    doc[k] = arr
            payload = json.dumps(doc, default=str)
            with engine.begin() as conn:
                conn.execute(sql_text("UPDATE docs SET doc = :doc WHERE collection = :collection AND id = :id"), {"doc": payload, "collection": self.table, "id": doc["id"]})
            return _SqliteUpdateResult(matched_count=1, modified_count=1)

        async def count_documents(self, q):
            params = {"collection": self.table}
            where = self._build_where(q, params)
            sql = sql_text(f"SELECT COUNT(*) as c FROM docs WHERE {' AND '.join(where)}")
            with engine.connect() as conn:
                res = conn.execute(sql, params).first()
                if not res:
                    return 0
                try:
                    return res._mapping["c"]
                except Exception:
                    return res[0]

        def find(self, q, projection=None):
            params = {"collection": self.table}
            where = self._build_where(q, params)
            collection = self

            class _Cursor:
                def __init__(self, engine, where_sql, params, projection=None):
                    self.engine = engine
                    self.where_sql = where_sql
                    self.params = params
                    self.projection = projection
                    self._limit = None
                    self._sort = None

                def sort(self, *args):
                    if len(args) == 1:
                        arg = args[0]
                        if isinstance(arg, str):
                            self._sort = [(arg, 1)]
                        elif isinstance(arg, (tuple, list)) and len(arg) == 2 and isinstance(arg[0], str):
                            self._sort = [arg]
                        else:
                            self._sort = list(arg)
                    else:
                        self._sort = [(args[0], args[1])]
                    return self

                def limit(self, n):
                    self._limit = n
                    return self

                async def to_list(self, length=100):
                    sql = f"SELECT doc FROM docs WHERE {self.where_sql}"
                    if self._sort:
                        fld, dir = self._sort[0]
                        dir_sql = "DESC" if dir < 0 else "ASC"
                        sql += f" ORDER BY json_extract(doc, '$.{fld}') {dir_sql}"
                    if self._limit:
                        sql += f" LIMIT {self._limit}"
                    with self.engine.connect() as conn:
                        res = conn.execute(sql_text(sql), self.params).fetchall()
                        docs = [collection._apply_projection(collection._row_to_doc(r), self.projection) for r in res]
                        if length is not None:
                            return docs[:length]
                        return docs

            return _Cursor(engine, " AND ".join(where), params, projection)



        async def distinct(self, key, q=None):
            params = {"collection": self.table}
            where = self._build_where(q, params)
            sql = sql_text(f"SELECT DISTINCT json_extract(doc, '$.{key}') FROM docs WHERE {' AND '.join(where)}")
            with engine.connect() as conn:
                res = conn.execute(sql, params).fetchall()
                values = []
                for r in res:
                    val = r[0]
                    if val is not None:
                        if isinstance(val, str) and (val.startswith("{") or val.startswith("[")):
                            try:
                                val = json.loads(val)
                            except Exception:
                                pass
                        values.append(val)
                return values


        def aggregate(self, pipeline):
            with engine.connect() as conn:
                res = conn.execute(sql_text("SELECT doc FROM docs WHERE collection = :collection"), {"collection": self.table}).fetchall()
            docs = [json.loads(r[0]) for r in res]

            def _match(doc, filt):
                if "$or" in filt:
                    return any(_match(doc, clause) for clause in filt["$or"])
                for key, value in filt.items():
                    if isinstance(value, dict):
                        for op, val in value.items():
                            field_value = doc.get(key)
                            if op == "$ne":
                                if val is None:
                                    if field_value is None:
                                        return False
                                else:
                                    if field_value == val:
                                        return False
                            elif op == "$gte":
                                if field_value is None or field_value < val:
                                    return False
                            elif op == "$gt":
                                if field_value is None or field_value <= val:
                                    return False
                            elif op == "$lte":
                                if field_value is None or field_value > val:
                                    return False
                            elif op == "$lt":
                                if field_value is None or field_value >= val:
                                    return False
                            elif op == "$in":
                                if field_value not in val:
                                    return False
                            elif op == "$nin":
                                if field_value in val:
                                    return False
                            elif op == "$exists":
                                exists = key in doc and doc.get(key) is not None
                                if val and not exists:
                                    return False
                                if not val and exists:
                                    return False
                            else:
                                raise ValueError(f"Unsupported aggregate operator: {op}")
                    else:
                        if doc.get(key) != value:
                            return False
                return True

            def _sort(docs_list, sort_spec):
                if isinstance(sort_spec, dict):
                    items = list(sort_spec.items())
                else:
                    items = [(sort_spec, 1)]
                def keyfunc(doc):
                    return tuple((doc.get(k),) if v >= 0 else (_neg_for_sort(doc.get(k)),) for k, v in items)
                return sorted(docs_list, key=keyfunc, reverse=False)

            def _neg_for_sort(value):
                if value is None:
                    return value
                if isinstance(value, (int, float)):
                    return -value
                return value

            def _group(docs_list, group_spec):
                by = group_spec.get("_id")
                if isinstance(by, str) and by.startswith("$"):
                    group_key = by[1:]
                else:
                    group_key = None
                groups = {}
                for doc in docs_list:
                    key = doc.get(group_key) if group_key else None
                    groups.setdefault(key, []).append(doc)
                output = []
                for key, items in groups.items():
                    row = {"_id": key}
                    for out_key, expr in group_spec.items():
                        if out_key == "_id":
                            continue
                        if isinstance(expr, dict):
                            if "$first" in expr:
                                field = expr["$first"]
                                if isinstance(field, str) and field.startswith("$"):
                                    row[out_key] = items[0].get(field[1:])
                                else:
                                    row[out_key] = field
                            elif "$sum" in expr:
                                arg = expr["$sum"]
                                if isinstance(arg, str) and arg.startswith("$"):
                                    field = arg[1:]
                                    row[out_key] = sum((item.get(field) or 0) for item in items)
                                elif isinstance(arg, int):
                                    row[out_key] = sum(arg for _ in items)
                                else:
                                    row[out_key] = 0
                            else:
                                raise ValueError(f"Unsupported group accumulator: {expr}")
                        else:
                            row[out_key] = expr
                    output.append(row)
                return output

            results = docs
            for stage in pipeline:
                if "$match" in stage:
                    results = [doc for doc in results if _match(doc, stage["$match"])]
                elif "$sort" in stage:
                    sort_spec = stage["$sort"]
                    if isinstance(sort_spec, dict):
                        for key, direction in reversed(list(sort_spec.items())):
                            results = sorted(results, key=lambda d, k=key: (d.get(k) is None, d.get(k) or ""), reverse=(direction < 0))
                    else:
                        results = sorted(results, key=lambda d: d.get(sort_spec))
                elif "$group" in stage:
                    results = _group(results, stage["$group"])
                elif "$limit" in stage:
                    results = results[: stage["$limit"]]
                else:
                    raise ValueError(f"Unsupported aggregate stage: {stage}")

            class _AggregateCursor:
                def __init__(self, docs):
                    self.docs = docs

                async def to_list(self, length=100):
                    return self.docs[:length]

            return _AggregateCursor(results)

    users_c = _SqliteCollection("users")
    kyc_c = _SqliteCollection("kyc")
    subs_c = _SqliteCollection("subscriptions")
    portfolios_c = _SqliteCollection("portfolios")
    pitches_c = _SqliteCollection("pitches")
    chats_c = _SqliteCollection("chats")
    messages_c = _SqliteCollection("messages")
    support_c = _SqliteCollection("support")
    payments_c = _SqliteCollection("payments")
    credits_c = _SqliteCollection("credits")
    settings_c = _SqliteCollection("settings")
    plans_c = _SqliteCollection("plans")
    pabbly_c = _SqliteCollection("pabbly")
    seedforge_c = _SqliteCollection("seedforge")
else:
    mongo_client: AsyncIOMotorClient = AsyncIOMotorClient(MONGO_URL)
    db = mongo_client[DB_NAME]

    users_c = db["users"]
    kyc_c = db["kyc"]
    subs_c = db["subscriptions"]
    portfolios_c = db["portfolios"]
    pitches_c = db["pitches"]
    chats_c = db["chats"]
    messages_c = db["messages"]
    support_c = db["support"]
    payments_c = db["payments"]
    credits_c = db["credits"]
    settings_c = db["settings"]
    plans_c = db["plans"]
    pabbly_c = db["pabbly"]
    seedforge_c = db["seedforge"]


DEFAULT_SETTINGS = {
    "id": "global",
    "company_name": "IDEACON",
    "company_logo": "",  # Empty logo means default UI branding
    "bank_details": {
        "account_name": "IDEACON Technologies Pvt Ltd",
        "bank_name": "ICICI Bank",
        "account_number": "123456789012",
        "ifsc_code": "ICIC0001234",
    },
    "upi_id": "ideacon@icici",
    "qr_code_url": "",  # Empty means auto-generate QR from UPI ID
}

async def get_plans_dict():
    plans_list = await plans_c.find({}).to_list(length=100)
    if not plans_list:
        for pid, p in DEFAULT_PLANS.items():
            await plans_c.insert_one({"id": pid, **p})
        plans_list = await plans_c.find({}).to_list(length=100)
    return {p["id"]: {k: v for k, v in p.items() if k != "_id"} for p in plans_list}

async def get_settings():
    doc = await settings_c.find_one({"id": "global"})
    if not doc:
        await settings_c.insert_one(DEFAULT_SETTINGS)
        doc = await settings_c.find_one({"id": "global"})
    return doc


async def seed_admin():
    existing = await users_c.find_one({"email": ADMIN_EMAIL})
    now = now_utc()
    doc = {
        "email": ADMIN_EMAIL,
        "hashed_password": hash_pw(ADMIN_PASSWORD),
        "role": ROLE_ADMIN,
        "name": "Admin",
        "created_at": iso(now),
        "kyc_status": "approved",
        "trial_expires_at": iso(now + timedelta(days=365 * 5)),
        "credits": 9999,
        "active": True,
    }
    if existing is None:
        doc["id"] = uid()
        await users_c.insert_one(doc)
        logging.info("Admin user seeded: %s", ADMIN_EMAIL)
    else:
        # Ensure admin password always matches env (idempotent reset)
        await users_c.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"role": ROLE_ADMIN, "active": True}},
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not USE_SQLITE:
        await users_c.create_index("email", unique=True)
        await users_c.create_index("id", unique=True)
        await messages_c.create_index([("chat_id", 1), ("created_at", 1)])
    await seed_admin()
    await get_plans_dict()
    await get_settings()
    yield
    if not USE_SQLITE:
        mongo_client.close()


# --------------------------------------------------------------------------- #
# App
# --------------------------------------------------------------------------- #
app = FastAPI(title="IDEACON API", version="1.0.0", lifespan=lifespan)
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://10.25.54.44:8000",
        "http://10.25.54.44:8081",
        "https://plan-b-ee2d2.web.app",
        "https://plan-b-ee2d2.firebaseapp.com",
    ],
    allow_origin_regex=r"https://.*\.serveousercontent\.com|https://.*\.lhr\.life",  # tunnel origins
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ideacon")


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: Literal["student", "investor", "growing_startup"]
    referral_code: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    kyc_status: str
    trial_expires_at: Optional[str] = None
    subscription: Optional[Dict[str, Any]] = None
    credits: int = 0
    photo: Optional[str] = None
    active: bool = True

class KYCRequest(BaseModel):
    pan: str
    aadhar: str
    mobile: str
    id_photo: str  # base64
    id_card_type: str  # "college" | "school"
    id_card_number: Optional[str] = None
    college_or_school_name: Optional[str] = None
    address: Optional[str] = None

class DigilockerRequest(BaseModel):
    digilocker_code: str
    aadhaar_number: str
    full_name: str
    dob: str
    verified_mobile: str

class PabblyConfigRequest(BaseModel):
    webhook_url: str
    events: List[str]

class SeedForgeRoundRequest(BaseModel):
    round_name: str
    amount_raised: float
    valuation: float
    date: str
    investors: List[str]

class PortfolioRequest(BaseModel):
    bio: Optional[str] = None
    sector: Optional[str] = None
    website: Optional[str] = None
    company_name: Optional[str] = None
    investment_amount: Optional[float] = None  # for investors
    skills: Optional[List[str]] = None
    photo: Optional[str] = None  # base64
    linkedin: Optional[str] = None

class PitchRequest(BaseModel):
    title: str
    description: str
    sector: str
    funding_ask: Optional[float] = None
    image: Optional[str] = None

class PaymentOrderRequest(BaseModel):
    plan_id: str  # e.g., student_basic

class PaymentVerifyRequest(BaseModel):
    order_id: str
    payment_id: Optional[str] = None
    signature: Optional[str] = None

class MessageRequest(BaseModel):
    receiver_id: str
    text: str

class SupportRequest(BaseModel):
    subject: str
    category: str  # pitching | company_registration | general
    message: str


# --------------------------------------------------------------------------- #
# Auth dependencies
# --------------------------------------------------------------------------- #
async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Dict[str, Any]:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await users_c.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user or not user.get("active", True):
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_roles(*roles: str):
    async def checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker


# --------------------------------------------------------------------------- #
# Utility helpers
# --------------------------------------------------------------------------- #
def public_user(u: Dict[str, Any]) -> Dict[str, Any]:
    """Strip sensitive fields; used in discovery."""
    return {
        "id": u["id"],
        "name": u.get("name"),
        "role": u["role"],
        "photo": u.get("photo"),
        "sector": u.get("sector"),
        "investment_amount": u.get("investment_amount"),
        "company_name": u.get("company_name"),
        "website": u.get("website"),
        "bio": u.get("bio"),
        "subscription_tier": (u.get("subscription") or {}).get("tier"),
    }

def sanitize_user(u: Dict[str, Any]) -> Dict[str, Any]:
    """Remove _id and hashed_password from user doc."""
    u = dict(u)
    u.pop("_id", None)
    u.pop("hashed_password", None)
    return u

async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    return await users_c.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})


# --------------------------------------------------------------------------- #
# Auth endpoints
# --------------------------------------------------------------------------- #
@api.get("/")
async def root():
    return {"app": "IDEACON", "version": "1.0.0", "status": "ok"}

def generate_referral_code(user_id: str) -> str:
    # 8-char code based on user id, alphanumeric uppercase
    import hashlib
    h = hashlib.sha1(user_id.encode()).hexdigest().upper()
    # Skip visually confusing chars
    return "".join(c for c in h if c not in "0O1IL")[:8]


async def award_achievement(user_id: str, achievement_key: str) -> bool:
    if achievement_key not in ACHIEVEMENTS:
        return False
    r = await users_c.update_one(
        {"id": user_id, "achievements": {"$ne": achievement_key}},
        {"$addToSet": {"achievements": achievement_key}},
    )
    if r is None:
        return True
    return getattr(r, "modified_count", 1) > 0

@api.post("/auth/signup", response_model=TokenResponse)
async def signup(req: SignupRequest):
    email = req.email.lower()
    if await users_c.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")

    now = now_utc()
    user_id = uid()
    user_doc = {
        "id": user_id,
        "email": email,
        "name": req.name,
        "role": req.role,
        "hashed_password": hash_pw(req.password),
        "kyc_status": "pending",
        "active": True,
        "credits": 0,
        "ignite_tokens": 0,
        "achievements": ["welcome_aboard"],
        "created_at": iso(now),
        "trial_expires_at": iso(now + timedelta(days=1)),
        "referral_code": generate_referral_code(user_id),
    }

    if req.referral_code:
        referrer = await users_c.find_one({"referral_code": req.referral_code})
        if referrer:
            user_doc["referred_by"] = referrer["id"]

    if req.role == ROLE_INVESTOR:
        # No free premium subscription; start with default limits just like startups/students.
        pass

    await users_c.insert_one(user_doc)
    token = create_token({"sub": user_doc["id"], "email": user_doc["email"], "role": user_doc["role"]})
    return {"access_token": token, "token_type": "bearer", "user": sanitize_user(user_doc)}

@api.post("/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = await users_c.find_one({"email": req.email.lower()})
    if not user:
        raise HTTPException(401, "Invalid credentials")
    if not verify_pw(req.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid credentials")
    if not user.get("active", True):
        raise HTTPException(401, "Account disabled")
    token = create_token({"sub": user["id"], "email": user["email"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": sanitize_user(user)}

@api.get("/auth/me")
async def me(current: Dict[str, Any] = Depends(get_current_user)):
    return {"user": current}


# --------------------------------------------------------------------------- #
# Sectors
# --------------------------------------------------------------------------- #
@api.get("/sectors")
async def get_sectors():
    return {"sectors": SECTORS}


# --------------------------------------------------------------------------- #
# KYC
# --------------------------------------------------------------------------- #
@api.post("/kyc/submit")
async def submit_kyc(req: KYCRequest, current: Dict[str, Any] = Depends(get_current_user)):
    doc = req.model_dump()
    doc["user_id"] = current["id"]
    doc["submitted_at"] = iso(now_utc())
    doc["status"] = "submitted"
    await kyc_c.update_one({"user_id": current["id"]}, {"$set": doc}, upsert=True)
    await users_c.update_one({"id": current["id"]}, {"$set": {"kyc_status": "submitted"}})
    return {"status": "submitted", "message": "KYC submitted for review"}

@api.get("/kyc/status")
async def kyc_status(current: Dict[str, Any] = Depends(get_current_user)):
    doc = await kyc_c.find_one({"user_id": current["id"]}, {"_id": 0})
    return {"status": current.get("kyc_status", "pending"), "kyc": doc}

@api.post("/kyc/digilocker/verify")
async def digilocker_verify(req: DigilockerRequest, current: Dict[str, Any] = Depends(get_current_user)):
    """
    Secure endpoint for DigiLocker OAuth callback verification.
    In production, digilocker_code should be exchanged for an access token via the gateway provider (Setu/Signzy).
    """
    # Simulate gateway exchange delay
    await asyncio.sleep(1)

    doc = req.model_dump()
    doc["user_id"] = current["id"]
    doc["submitted_at"] = iso(now_utc())
    doc["status"] = "approved"
    doc["method"] = "digilocker"

    # Upsert the verified KYC record
    await kyc_c.update_one({"user_id": current["id"]}, {"$set": doc}, upsert=True)
    
    # Update the user's root status
    await users_c.update_one({"id": current["id"]}, {"$set": {"kyc_status": "approved", "digilocker_verified": True}})
    
    # Award the verified founder achievement
    await award_achievement(current["id"], "verified_founder")
    
    return {"status": "approved", "message": "KYC instantly verified via DigiLocker"}


# --------------------------------------------------------------------------- #
# Portfolio
# --------------------------------------------------------------------------- #
@api.post("/portfolio/update")
async def update_portfolio(req: PortfolioRequest, current: Dict[str, Any] = Depends(get_current_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = iso(now_utc())
    if updates:
        await users_c.update_one({"id": current["id"]}, {"$set": updates})
    user = await get_user_by_id(current["id"])
    return {"user": user}

@api.get("/portfolio/{user_id}")
async def get_portfolio(user_id: str, current: Dict[str, Any] = Depends(get_current_user)):
    u = await get_user_by_id(user_id)
    if not u:
        raise HTTPException(404, "User not found")
    return public_user(u)


# --------------------------------------------------------------------------- #
# Discover (with plan-based limits)
# --------------------------------------------------------------------------- #
def get_discovery_limit(user: Dict[str, Any]) -> int:
    """How many opposite-side profiles this user can see."""
    # Trial (24h) users: 5 profiles
    trial = user.get("trial_expires_at")
    if trial:
        try:
            trial_dt = datetime.fromisoformat(trial)
            if trial_dt > now_utc() and not user.get("subscription"):
                return 5
        except Exception:
            pass
    sub = user.get("subscription") or {}
    if not sub or (sub.get("expires_at") and datetime.fromisoformat(sub["expires_at"]) < now_utc()):
        return 0
    return sub.get("limit", 0)

@api.get("/discover")
async def discover(
    sector: Optional[str] = None,
    current: Dict[str, Any] = Depends(get_current_user),
):
    """
    Students & Growing Startups see Investors.
    Investors see Students & Growing Startups.
    Admin sees all.
    """
    limit = get_discovery_limit(current)
    if current["role"] == ROLE_ADMIN:
        target_roles = [ROLE_STUDENT, ROLE_INVESTOR, ROLE_GROWING]
        limit = 200
    elif current["role"] == ROLE_INVESTOR:
        target_roles = [ROLE_STUDENT, ROLE_GROWING]
    else:
        target_roles = [ROLE_INVESTOR]

    query: Dict[str, Any] = {"role": {"$in": target_roles}, "active": True, "id": {"$ne": current["id"]}}
    if sector:
        query["sector"] = sector

    if limit <= 0:
        return {"profiles": [], "limit": 0}

    cursor = users_c.find(query, {"_id": 0, "hashed_password": 0}).limit(limit)
    docs = await cursor.to_list(length=limit)
    return {
        "profiles": [public_user(d) for d in docs],
        "limit": limit,
        "has_access": limit > 0,
    }


# --------------------------------------------------------------------------- #
# Idea Pitches
# --------------------------------------------------------------------------- #
@api.post("/pitch")
async def create_pitch(req: PitchRequest, current: Dict[str, Any] = Depends(get_current_user)):
    if current["role"] not in [ROLE_STUDENT, ROLE_GROWING]:
        raise HTTPException(403, "Only founders and startups can pitch ideas")
    doc = {
        "id": uid(),
        "user_id": current["id"],
        "user_name": current.get("name"),
        "user_role": current["role"],
        "user_photo": current.get("photo"),
        **req.model_dump(),
        "likes": 0,
        "ignites": 0,
        "ignite_investors": [],
        "created_at": iso(now_utc()),
    }
    await pitches_c.insert_one(doc)
    doc.pop("_id", None)
    # Award first pitch achievement
    await award_achievement(current["id"], "first_pitch")
    return doc

@api.get("/pitch")
async def list_pitches(sector: Optional[str] = None, current: Dict[str, Any] = Depends(get_current_user)):
    query = {}
    if sector:
        query["sector"] = sector
    # Sort by ignites first (feed boost), then recency
    cursor = pitches_c.find(query, {"_id": 0}).sort([("ignites", -1), ("created_at", -1)]).limit(100)
    return {"pitches": await cursor.to_list(length=100)}

@api.post("/pitch/{pitch_id}/like")
async def like_pitch(pitch_id: str, current: Dict[str, Any] = Depends(get_current_user)):
    r = await pitches_c.update_one({"id": pitch_id}, {"$inc": {"likes": 1}})
    if r.matched_count == 0:
        raise HTTPException(404, "Pitch not found")
    return {"status": "ok"}


class IgniteRequest(BaseModel):
    amount: int = Field(ge=1, le=100, default=1)

@api.post("/pitch/{pitch_id}/ignite")
async def ignite_pitch(pitch_id: str, req: IgniteRequest, current: Dict[str, Any] = Depends(get_current_user)):
    """Investors gift ignite tokens to a pitch — boosts feed ranking + unlocks priority chat with founder."""
    if current["role"] != ROLE_INVESTOR:
        raise HTTPException(403, "Only investors can ignite pitches")
    pitch = await pitches_c.find_one({"id": pitch_id})
    if not pitch:
        raise HTTPException(404, "Pitch not found")
    balance = current.get("ignite_tokens", 0) or 0
    if balance < req.amount:
        raise HTTPException(400, f"Insufficient ignite tokens (you have {balance})")

    now = now_utc()
    await users_c.update_one({"id": current["id"]}, {"$inc": {"ignite_tokens": -req.amount}})
    await pitches_c.update_one(
        {"id": pitch_id},
        {"$inc": {"ignites": req.amount},
         "$addToSet": {"ignite_investors": current["id"]}},
    )
    await credits_c.insert_one({
        "id": uid(), "type": "ignite",
        "from_user_id": current["id"], "to_user_id": pitch["user_id"], "pitch_id": pitch_id,
        "amount": req.amount, "created_at": iso(now),
    })

    # Achievements
    total_ignited_docs = await credits_c.count_documents({"type": "ignite", "from_user_id": current["id"]})
    if total_ignited_docs >= 5:
        await award_achievement(current["id"], "angel_touch")

    updated = await pitches_c.find_one({"id": pitch_id}, {"_id": 0})
    if updated and (updated.get("ignites") or 0) >= 10:
        await award_achievement(pitch["user_id"], "hot_pitch")

    return {"status": "ok", "ignites": updated.get("ignites", 0), "remaining_tokens": balance - req.amount}


# --------------------------------------------------------------------------- #
# Referral
# --------------------------------------------------------------------------- #
@api.get("/referral")
async def get_referral_stats(current: Dict[str, Any] = Depends(get_current_user)):
    code = current.get("referral_code")
    if not code:
        # backfill for users created before referral feature
        code = generate_referral_code(current["id"])
        await users_c.update_one({"id": current["id"]}, {"$set": {"referral_code": code}})
    referred = await users_c.count_documents({"referred_by": current["id"]})
    paid_refs = await credits_c.count_documents({"type": "referral", "referrer_id": current["id"]})
    credits_earned = paid_refs * REFERRAL_BONUS_CREDITS
    return {
        "code": code,
        "total_referred": referred,
        "paid_referrals": paid_refs,
        "credits_earned": credits_earned,
        "bonus_per_referral": REFERRAL_BONUS_CREDITS,
    }


# --------------------------------------------------------------------------- #
# Achievements
# --------------------------------------------------------------------------- #
@api.get("/achievements")
async def get_achievements(current: Dict[str, Any] = Depends(get_current_user)):
    unlocked = set(current.get("achievements", []))
    result = []
    for key, meta in ACHIEVEMENTS.items():
        result.append({
            "key": key,
            **meta,
            "unlocked": key in unlocked,
        })
    return {"achievements": result, "unlocked_count": len(unlocked), "total": len(ACHIEVEMENTS)}


# --------------------------------------------------------------------------- #
# Payment (Razorpay)
# --------------------------------------------------------------------------- #
@api.get("/payment/plans")
async def get_plans(current: Dict[str, Any] = Depends(get_current_user)):
    """Return plans applicable to current user's role."""
    plans_dict = await get_plans_dict()
    plans = []
    for pid, p in plans_dict.items():
        if p.get("role") == current["role"] or current["role"] == ROLE_ADMIN:
            plans.append({"id": pid, **p, "amount_rupees": p["amount"] / 100})
    return {"plans": plans, "razorpay_key_id": RAZORPAY_KEY_ID, "mode": PAYMENT_MODE}

@api.post("/payment/create-order")
async def create_order(req: PaymentOrderRequest, current: Dict[str, Any] = Depends(get_current_user)):
    plans_dict = await get_plans_dict()
    plan = plans_dict.get(req.plan_id)
    if not plan:
        raise HTTPException(400, "Invalid plan")
    if plan["role"] != current["role"] and current["role"] != ROLE_ADMIN:
        raise HTTPException(403, "Plan not applicable to your role")

    order_id = f"order_{uid().replace('-', '')[:16]}"
    now = now_utc()
    order_doc = {
        "id": order_id,
        "user_id": current["id"],
        "plan_id": req.plan_id,
        "amount": plan["amount"],
        "currency": "INR",
        "status": "created",
        "mode": PAYMENT_MODE,
        "created_at": iso(now),
    }

    # Try real Razorpay if not in mock mode
    if PAYMENT_MODE == "live" and RAZORPAY_KEY_ID and not RAZORPAY_KEY_ID.startswith("rzp_test_placeholder"):
        try:
            import razorpay
            client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
            rp_order = client.order.create({
                "amount": plan["amount"],
                "currency": "INR",
                "receipt": order_id[:40],
                "payment_capture": 1,
            })
            order_doc["razorpay_order_id"] = rp_order["id"]
        except Exception as e:
            logger.error("Razorpay error: %s", e)
            raise HTTPException(500, "Payment gateway error")

    await payments_c.insert_one(order_doc)
    return {
        "order_id": order_id,
        "razorpay_order_id": order_doc.get("razorpay_order_id"),
        "amount": plan["amount"],
        "amount_rupees": plan["amount"] / 100,
        "currency": "INR",
        "plan_id": req.plan_id,
        "key_id": RAZORPAY_KEY_ID,
        "mode": PAYMENT_MODE,
    }

@api.post("/payment/verify")
async def verify_payment(req: PaymentVerifyRequest, current: Dict[str, Any] = Depends(get_current_user)):
    order = await payments_c.find_one({"id": req.order_id, "user_id": current["id"]})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["status"] == "success":
        raise HTTPException(400, "Order already processed")

    plans_dict = await get_plans_dict()
    plan = plans_dict[order["plan_id"]]
    verified = False

    if PAYMENT_MODE == "live" and req.signature:
        try:
            import razorpay
            client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
            client.utility.verify_payment_signature({
                "razorpay_order_id": order.get("razorpay_order_id"),
                "razorpay_payment_id": req.payment_id,
                "razorpay_signature": req.signature,
            })
            verified = True
        except Exception as e:
            logger.error("Signature verify failed: %s", e)
            raise HTTPException(400, "Payment verification failed")
    else:
        # Mock success
        verified = True

    if not verified:
        raise HTTPException(400, "Not verified")

    now = now_utc()
    expires_at = now + timedelta(days=plan["days"])
    subscription = {
        "plan_id": order["plan_id"],
        "tier": plan["tier"],
        "limit": plan["limit"],
        "started_at": iso(now),
        "expires_at": iso(expires_at),
        "amount_paid": plan["amount"],
    }
    await users_c.update_one(
        {"id": current["id"]},
        {"$set": {"subscription": subscription}, "$inc": {"credits": plan["credits"], "ignite_tokens": plan["ignite_tokens"]}},
    )
    await payments_c.update_one(
        {"id": req.order_id},
        {"$set": {"status": "success", "payment_id": req.payment_id, "verified_at": iso(now)}},
    )
    await subs_c.insert_one({
        "id": uid(),
        "user_id": current["id"],
        "plan_id": order["plan_id"],
        "amount": plan["amount"],
        "started_at": iso(now),
        "expires_at": iso(expires_at),
    })

    # Achievements
    await award_achievement(current["id"], "premium_member")
    if plan["tier"] == "pro":
        await award_achievement(current["id"], "pro_member")

    # Referral bonus — pay out to both parties on FIRST paid subscription only.
    referred_by = current.get("referred_by")
    referral_awarded = False
    if referred_by:
        # Check if referrer bonus already awarded for this referee
        existing_ref = await credits_c.find_one({"type": "referral", "referee_id": current["id"]})
        if not existing_ref:
            await users_c.update_one({"id": referred_by}, {"$inc": {"credits": REFERRAL_BONUS_CREDITS}})
            await users_c.update_one({"id": current["id"]}, {"$inc": {"credits": REFERRAL_BONUS_CREDITS}})
            await credits_c.insert_one({
                "id": uid(), "type": "referral",
                "referrer_id": referred_by, "referee_id": current["id"],
                "amount": REFERRAL_BONUS_CREDITS,
                "created_at": iso(now),
            })
            await award_achievement(referred_by, "referrer")
            referral_awarded = True

    user = await get_user_by_id(current["id"])
    return {
        "status": "success",
        "subscription": subscription,
        "user": user,
        "credits_added": plan["credits"] + (REFERRAL_BONUS_CREDITS if referral_awarded else 0),
        "ignite_tokens_added": plan["ignite_tokens"],
        "referral_bonus": referral_awarded,
    }


# --------------------------------------------------------------------------- #
# Digital ID Card
# --------------------------------------------------------------------------- #
@api.get("/id-card")
async def id_card(current: Dict[str, Any] = Depends(get_current_user)):
    sub = current.get("subscription") or {}
    tier = sub.get("tier", "free")
    return {
        "id": current["id"],
        "name": current.get("name"),
        "email": current["email"],
        "role": current["role"],
        "photo": current.get("photo"),
        "sector": current.get("sector"),
        "tier": tier,
        "kyc_status": current.get("kyc_status"),
        "credits": current.get("credits", 0),
        "issued_at": current.get("created_at"),
        "expires_at": sub.get("expires_at"),
        "member_id": f"IDC-{current['id'][:8].upper()}",
    }


# --------------------------------------------------------------------------- #
# Chat
# --------------------------------------------------------------------------- #
def chat_id_for(a: str, b: str) -> str:
    return "_".join(sorted([a, b]))

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def send(self, user_id: str, data: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                pass

manager = ConnectionManager()

@api.post("/chat/send")
async def send_message(req: MessageRequest, current: Dict[str, Any] = Depends(get_current_user)):
    receiver = await get_user_by_id(req.receiver_id)
    if not receiver:
        raise HTTPException(404, "Receiver not found")
    cid = chat_id_for(current["id"], req.receiver_id)
    now = now_utc()
    msg = {
        "id": uid(),
        "chat_id": cid,
        "sender_id": current["id"],
        "sender_name": current.get("name"),
        "receiver_id": req.receiver_id,
        "text": req.text,
        "created_at": iso(now),
        "read": False,
    }
    await messages_c.insert_one(msg)
    msg.pop("_id", None)
    # push via websocket if online
    await manager.send(req.receiver_id, {"type": "message", "message": msg})

    # Award "Connector" achievement (5+ distinct conversations initiated)
    distinct_convos = await messages_c.distinct("chat_id", {"sender_id": current["id"]})
    if len(distinct_convos) >= 5:
        await award_achievement(current["id"], "connector")

    return msg

@api.get("/chat/list")
async def chat_list(current: Dict[str, Any] = Depends(get_current_user)):
    """Return list of unique conversations for the current user."""
    pipeline = [
        {"$match": {"$or": [{"sender_id": current["id"]}, {"receiver_id": current["id"]}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$chat_id",
            "last_message": {"$first": "$text"},
            "last_at": {"$first": "$created_at"},
            "last_sender": {"$first": "$sender_id"},
            "sender_id": {"$first": "$sender_id"},
            "receiver_id": {"$first": "$receiver_id"},
        }},
        {"$sort": {"last_at": -1}},
        {"$limit": 100},
    ]
    convos = await messages_c.aggregate(pipeline).to_list(length=100)
    result = []
    for c in convos:
        other_id = c["receiver_id"] if c["sender_id"] == current["id"] else c["sender_id"]
        other = await get_user_by_id(other_id)
        if not other:
            continue
        result.append({
            "chat_id": c["_id"],
            "other": public_user(other),
            "last_message": c["last_message"],
            "last_at": c["last_at"],
        })
    return {"chats": result}

@api.get("/chat/{other_user_id}")
async def chat_history(other_user_id: str, current: Dict[str, Any] = Depends(get_current_user)):
    cid = chat_id_for(current["id"], other_user_id)
    msgs = await messages_c.find({"chat_id": cid}, {"_id": 0}).sort("created_at", 1).limit(500).to_list(length=500)
    other = await get_user_by_id(other_user_id)
    return {"messages": msgs, "other": public_user(other) if other else None}


@app.websocket("/api/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, token: str = Query(...)):
    # verify token
    try:
        payload = decode_token(token)
        if payload.get("sub") != user_id:
            await websocket.close(code=1008)
            return
    except JWTError:
        await websocket.close(code=1008)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # allow ping/echo
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue
            if data.get("type") == "message":
                receiver_id = data.get("receiver_id")
                text = data.get("text", "")
                if not receiver_id or not text:
                    continue
                cid = chat_id_for(user_id, receiver_id)
                msg = {
                    "id": uid(),
                    "chat_id": cid,
                    "sender_id": user_id,
                    "receiver_id": receiver_id,
                    "text": text,
                    "created_at": iso(now_utc()),
                    "read": False,
                }
                await messages_c.insert_one(msg)
                msg.pop("_id", None)
                await manager.send(receiver_id, {"type": "message", "message": msg})
                await websocket.send_json({"type": "message", "message": msg})
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        logger.error("WS error: %s", e)
        manager.disconnect(user_id)


# --------------------------------------------------------------------------- #
# Support
# --------------------------------------------------------------------------- #
@api.post("/support")
async def create_support(req: SupportRequest, current: Dict[str, Any] = Depends(get_current_user)):
    doc = {
        "id": uid(),
        "user_id": current["id"],
        "user_name": current.get("name"),
        "user_email": current["email"],
        **req.model_dump(),
        "status": "open",
        "created_at": iso(now_utc()),
    }
    await support_c.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/support")
async def list_support(current: Dict[str, Any] = Depends(get_current_user)):
    q = {} if current["role"] == ROLE_ADMIN else {"user_id": current["id"]}
    tickets = await support_c.find(q, {"_id": 0}).sort("created_at", -1).limit(200).to_list(length=200)
    return {"tickets": tickets}


# --------------------------------------------------------------------------- #
# Admin
# --------------------------------------------------------------------------- #
@api.get("/admin/analytics", dependencies=[Depends(require_roles(ROLE_ADMIN))])
async def admin_analytics():
    total_users = await users_c.count_documents({})
    by_role = {}
    for role in [ROLE_STUDENT, ROLE_INVESTOR, ROLE_GROWING, ROLE_ADMIN]:
        by_role[role] = await users_c.count_documents({"role": role})
    active_subs = await users_c.count_documents({"subscription": {"$ne": None}})
    kyc_submitted = await users_c.count_documents({"kyc_status": "submitted"})
    kyc_approved = await users_c.count_documents({"kyc_status": "approved"})
    kyc_rejected = await users_c.count_documents({"kyc_status": "rejected"})
    total_pitches = await pitches_c.count_documents({})
    total_messages = await messages_c.count_documents({})
    total_tickets = await support_c.count_documents({})

    # revenue
    rev_cursor = payments_c.aggregate([
        {"$match": {"status": "success"}},
        {"$group": {"_id": "$plan_id", "count": {"$sum": 1}, "revenue": {"$sum": "$amount"}}},
    ])
    revenue_by_plan = await rev_cursor.to_list(length=100)
    total_revenue = sum(r["revenue"] for r in revenue_by_plan) / 100

    # 7-day signups (time-series for chart)
    now = now_utc()
    signups_7d = []
    revenue_7d = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        c_signup = await users_c.count_documents({
            "created_at": {"$gte": iso(day_start), "$lt": iso(day_end)}
        })
        rev_agg = await payments_c.aggregate([
            {"$match": {"status": "success", "verified_at": {"$gte": iso(day_start), "$lt": iso(day_end)}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]).to_list(length=1)
        c_rev = (rev_agg[0]["total"] / 100) if rev_agg else 0
        label = day_start.strftime("%d %b")
        signups_7d.append({"day": label, "count": c_signup})
        revenue_7d.append({"day": label, "revenue": c_rev})

    # Sector distribution (top sectors by user count)
    sector_pipeline = [
        {"$match": {"sector": {"$ne": None, "$exists": True}}},
        {"$group": {"_id": "$sector", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    sector_dist = await users_c.aggregate(sector_pipeline).to_list(length=8)
    sector_dist = [{"sector": s["_id"], "count": s["count"]} for s in sector_dist]

    # Top pitches by ignites
    top_pitches = await pitches_c.find({}, {"_id": 0, "title": 1, "ignites": 1, "user_name": 1, "sector": 1}).sort("ignites", -1).limit(5).to_list(length=5)

    # Referral stats
    total_referrals = await credits_c.count_documents({"type": "referral"})
    referral_credits_paid = total_referrals * REFERRAL_BONUS_CREDITS * 2  # both parties get bonus

    return {
        "total_users": total_users,
        "users_by_role": by_role,
        "active_subscriptions": active_subs,
        "kyc": {"submitted": kyc_submitted, "approved": kyc_approved, "rejected": kyc_rejected},
        "total_pitches": total_pitches,
        "total_messages": total_messages,
        "total_tickets": total_tickets,
        "revenue_by_plan": revenue_by_plan,
        "total_revenue_inr": total_revenue,
        "signups_7d": signups_7d,
        "revenue_7d": revenue_7d,
        "sector_distribution": sector_dist,
        "top_pitches": top_pitches,
        "referrals": {
            "total": total_referrals,
            "credits_paid_out": referral_credits_paid,
        },
    }

@api.get("/admin/users", dependencies=[Depends(require_roles(ROLE_ADMIN))])
async def admin_users(role: Optional[str] = None, kyc_status: Optional[str] = None):
    q: Dict[str, Any] = {}
    if role:
        q["role"] = role
    if kyc_status:
        q["kyc_status"] = kyc_status
    users = await users_c.find(q, {"_id": 0, "hashed_password": 0}).sort("created_at", -1).limit(500).to_list(length=500)
    return {"users": users}

@api.get("/admin/kyc/{user_id}", dependencies=[Depends(require_roles(ROLE_ADMIN))])
async def admin_get_kyc(user_id: str):
    kyc = await kyc_c.find_one({"user_id": user_id}, {"_id": 0})
    user = await get_user_by_id(user_id)
    return {"kyc": kyc, "user": user}

@api.post("/admin/kyc/{user_id}/approve", dependencies=[Depends(require_roles(ROLE_ADMIN))])
async def admin_approve_kyc(user_id: str):
    await users_c.update_one({"id": user_id}, {"$set": {"kyc_status": "approved"}})
    await kyc_c.update_one({"user_id": user_id}, {"$set": {"status": "approved"}})
    await award_achievement(user_id, "verified_founder")
    return {"status": "approved"}

@api.post("/admin/kyc/{user_id}/reject", dependencies=[Depends(require_roles(ROLE_ADMIN))])
async def admin_reject_kyc(user_id: str):
    await users_c.update_one({"id": user_id}, {"$set": {"kyc_status": "rejected"}})
    await kyc_c.update_one({"user_id": user_id}, {"$set": {"status": "rejected"}})
    return {"status": "rejected"}

@api.post("/admin/user/{user_id}/toggle-active", dependencies=[Depends(require_roles(ROLE_ADMIN))])
async def admin_toggle_active(user_id: str):
    u = await users_c.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "Not found")
    new_active = not u.get("active", True)
    await users_c.update_one({"id": user_id}, {"$set": {"active": new_active}})
    return {"active": new_active}


# --- Settings / Branding / Plans / Custom User edit ---

@api.get("/settings/public")
async def public_settings():
    settings = await get_settings()
    return {
        "company_name": settings.get("company_name", "IDEACON"),
        "company_logo": settings.get("company_logo", ""),
        "bank_details": settings.get("bank_details", {}),
        "upi_id": settings.get("upi_id", ""),
        "qr_code_url": settings.get("qr_code_url", ""),
    }

class AdminSettingsUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    bank_details: Optional[dict] = None
    upi_id: Optional[str] = None
    qr_code_url: Optional[str] = None

@api.put("/admin/settings", dependencies=[Depends(require_roles(ROLE_ADMIN))])
async def admin_update_settings(req: AdminSettingsUpdateRequest):
    update_data = {}
    if req.company_name is not None:
        update_data["company_name"] = req.company_name
    if req.company_logo is not None:
        update_data["company_logo"] = req.company_logo
    if req.bank_details is not None:
        update_data["bank_details"] = req.bank_details
    if req.upi_id is not None:
        update_data["upi_id"] = req.upi_id
    if req.qr_code_url is not None:
        update_data["qr_code_url"] = req.qr_code_url
    
    await settings_c.update_one({"id": "global"}, {"$set": update_data})
    return {"status": "ok", "settings": await get_settings()}

@api.get("/admin/plans", dependencies=[Depends(require_roles(ROLE_ADMIN))])
async def admin_get_plans():
    plans_dict = await get_plans_dict()
    return {"plans": [{"id": pid, **p} for pid, p in plans_dict.items()]}

class AdminPlanUpdateRequest(BaseModel):
    name: Optional[str] = None
    amount: Optional[int] = None
    credits: Optional[int] = None
    limit: Optional[int] = None
    days: Optional[int] = None
    ignite_tokens: Optional[int] = None
    features: Optional[List[str]] = None

@api.put("/admin/plans/{plan_id}", dependencies=[Depends(require_roles(ROLE_ADMIN))])
async def admin_update_plan(plan_id: str, req: AdminPlanUpdateRequest):
    plans_dict = await get_plans_dict()
    if plan_id not in plans_dict:
        raise HTTPException(404, "Plan not found")
    
    update_data = {}
    if req.name is not None:
        update_data["name"] = req.name
    if req.amount is not None:
        update_data["amount"] = req.amount
    if req.credits is not None:
        update_data["credits"] = req.credits
    if req.limit is not None:
        update_data["limit"] = req.limit
    if req.days is not None:
        update_data["days"] = req.days
    if req.ignite_tokens is not None:
        update_data["ignite_tokens"] = req.ignite_tokens
    if req.features is not None:
        update_data["features"] = req.features
        
    await plans_c.update_one({"id": plan_id}, {"$set": update_data})
    return {"status": "ok", "plan": {**plans_dict[plan_id], **update_data, "id": plan_id}}

class AdminUserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    credits: Optional[int] = None
    active: Optional[bool] = None
    kyc_status: Optional[str] = None
    subscription: Optional[dict] = None  # None or {"plan_id": str, "expires_at": str}

@api.put("/admin/users/{user_id}", dependencies=[Depends(require_roles(ROLE_ADMIN))])
async def admin_update_user(user_id: str, req: AdminUserUpdateRequest):
    user = await users_c.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
        
    update_data = {}
    if req.name is not None:
        update_data["name"] = req.name
    if req.email is not None:
        # Check uniqueness if changed
        if req.email != user["email"]:
            exists = await users_c.find_one({"email": req.email})
            if exists:
                raise HTTPException(400, "Email already taken")
        update_data["email"] = req.email
    if req.role is not None:
        if req.role not in ALL_ROLES:
            raise HTTPException(400, "Invalid role")
        update_data["role"] = req.role
    if req.credits is not None:
        update_data["credits"] = req.credits
    if req.active is not None:
        update_data["active"] = req.active
    if req.kyc_status is not None:
        update_data["kyc_status"] = req.kyc_status
    if req.subscription is not None:
        update_data["subscription"] = req.subscription
    elif req.subscription == {}:
        update_data["subscription"] = None
        
    await users_c.update_one({"id": user_id}, {"$set": update_data})
    updated = await users_c.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    return {"status": "ok", "user": updated}


import httpx

async def trigger_pabbly_webhook(user_id: str, event_name: str, payload: dict):
    """
    Checks if the user has a configured Pabbly webhook, and fires it.
    """
    config = await pabbly_c.find_one({"user_id": user_id})
    if config and config.get("webhook_url") and event_name in config.get("events", []):
        data = {
            "event": event_name,
            "user_id": user_id,
            "timestamp": iso(now_utc()),
            "data": payload
        }
        try:
            async with httpx.AsyncClient() as client:
                # We don't await the full response to prevent blocking
                asyncio.create_task(client.post(config["webhook_url"], json=data, timeout=5.0))
        except Exception as e:
            logging.error(f"Pabbly Webhook Error: {e}")

# --------------------------------------------------------------------------- #
# Pabbly Connect
# --------------------------------------------------------------------------- #
@api.get("/pabbly/config")
async def get_pabbly_config(current: Dict[str, Any] = Depends(get_current_user)):
    doc = await pabbly_c.find_one({"user_id": current["id"]}, {"_id": 0})
    return doc or {"user_id": current["id"], "webhook_url": "", "events": []}

@api.post("/pabbly/config")
async def save_pabbly_config(req: PabblyConfigRequest, current: Dict[str, Any] = Depends(get_current_user)):
    doc = req.model_dump()
    doc["user_id"] = current["id"]
    doc["updated_at"] = iso(now_utc())
    await pabbly_c.update_one({"user_id": current["id"]}, {"$set": doc}, upsert=True)
    return {"status": "ok", "message": "Pabbly Configuration Saved"}


# --------------------------------------------------------------------------- #
# SeedForge
# --------------------------------------------------------------------------- #
@api.get("/seedforge/rounds")
async def get_seedforge_rounds(current: Dict[str, Any] = Depends(get_current_user)):
    doc = await seedforge_c.find_one({"user_id": current["id"]}, {"_id": 0})
    return doc or {"user_id": current["id"], "rounds": []}

@api.post("/seedforge/rounds")
async def add_seedforge_round(req: SeedForgeRoundRequest, current: Dict[str, Any] = Depends(get_current_user)):
    round_doc = req.model_dump()
    round_doc["id"] = str(uuid.uuid4())
    round_doc["created_at"] = iso(now_utc())
    
    await seedforge_c.update_one(
        {"user_id": current["id"]},
        {"$push": {"rounds": round_doc}},
        upsert=True
    )
    # Trigger a webhook if the user has Pabbly configured
    await trigger_pabbly_webhook(current["id"], "funding_round_added", round_doc)
    
    return {"status": "ok", "message": "Funding round added"}


# --------------------------------------------------------------------------- #
# Include router
# --------------------------------------------------------------------------- #
app.include_router(api)
