"""
IDEACON Backend - Startup Ecosystem Platform
FastAPI + MongoDB + JWT Auth + WebSocket Chat + Razorpay
"""
import os
import uuid
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any, Literal
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Query
from fastapi.security import OAuth2PasswordBearer
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "ideacon")
JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@ideacon.in")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@Ideacon2026")
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_placeholder")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "placeholder_secret")
PAYMENT_MODE = os.environ.get("PAYMENT_MODE", "mock")  # mock | live

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Roles
ROLE_STUDENT = "student"
ROLE_INVESTOR = "investor"
ROLE_GROWING = "growing_startup"
ROLE_ADMIN = "admin"
ALL_ROLES = {ROLE_STUDENT, ROLE_INVESTOR, ROLE_GROWING, ROLE_ADMIN}

# Subscription plans (amount in paise for razorpay compatibility)
PLANS = {
    "student_basic": {"role": ROLE_STUDENT, "tier": "basic", "amount": 20500, "credits": 50, "limit": 10, "days": 30},
    "student_pro": {"role": ROLE_STUDENT, "tier": "pro", "amount": 54900, "credits": 150, "limit": 30, "days": 30},
    "investor_basic": {"role": ROLE_INVESTOR, "tier": "basic", "amount": 54900, "credits": 150, "limit": 50, "days": 30},
    "startup_basic": {"role": ROLE_GROWING, "tier": "basic", "amount": 54900, "credits": 150, "limit": 40, "days": 30},
    "startup_pro": {"role": ROLE_GROWING, "tier": "pro", "amount": 74900, "credits": 250, "limit": 60, "days": 30},
}

# 42 sectors
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
            {"$set": {"hashed_password": doc["hashed_password"], "role": ROLE_ADMIN, "active": True}},
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    await users_c.create_index("email", unique=True)
    await users_c.create_index("id", unique=True)
    await messages_c.create_index([("chat_id", 1), ("created_at", 1)])
    await seed_admin()
    yield
    mongo_client.close()


# --------------------------------------------------------------------------- #
# App
# --------------------------------------------------------------------------- #
app = FastAPI(title="IDEACON API", version="1.0.0", lifespan=lifespan)
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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

@api.post("/auth/signup", response_model=TokenResponse)
async def signup(req: SignupRequest):
    existing = await users_c.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    now = now_utc()
    user_id = uid()
    doc = {
        "id": user_id,
        "email": req.email.lower(),
        "hashed_password": hash_pw(req.password),
        "name": req.name,
        "role": req.role,
        "kyc_status": "pending",
        "created_at": iso(now),
        "trial_expires_at": iso(now + timedelta(hours=24)),  # 24 hr free trial
        "credits": 10,  # signup bonus
        "photo": None,
        "active": True,
        "subscription": None,
    }
    await users_c.insert_one(doc)
    token = create_token({"sub": user_id, "email": req.email.lower(), "role": req.role})
    user_out = sanitize_user(doc)
    return {"access_token": token, "token_type": "bearer", "user": user_out}

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
    doc = req.dict()
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


# --------------------------------------------------------------------------- #
# Portfolio
# --------------------------------------------------------------------------- #
@api.post("/portfolio/update")
async def update_portfolio(req: PortfolioRequest, current: Dict[str, Any] = Depends(get_current_user)):
    updates = {k: v for k, v in req.dict().items() if v is not None}
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

    cursor = users_c.find(query, {"_id": 0, "hashed_password": 0}).limit(max(limit, 0) if limit > 0 else 0)
    docs = await cursor.to_list(length=max(limit, 0))
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
        **req.dict(),
        "likes": 0,
        "created_at": iso(now_utc()),
    }
    await pitches_c.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/pitch")
async def list_pitches(sector: Optional[str] = None, current: Dict[str, Any] = Depends(get_current_user)):
    query = {}
    if sector:
        query["sector"] = sector
    cursor = pitches_c.find(query, {"_id": 0}).sort("created_at", -1).limit(100)
    return {"pitches": await cursor.to_list(length=100)}

@api.post("/pitch/{pitch_id}/like")
async def like_pitch(pitch_id: str, current: Dict[str, Any] = Depends(get_current_user)):
    r = await pitches_c.update_one({"id": pitch_id}, {"$inc": {"likes": 1}})
    if r.matched_count == 0:
        raise HTTPException(404, "Pitch not found")
    return {"status": "ok"}


# --------------------------------------------------------------------------- #
# Payment (Razorpay)
# --------------------------------------------------------------------------- #
@api.get("/payment/plans")
async def get_plans(current: Dict[str, Any] = Depends(get_current_user)):
    """Return plans applicable to current user's role."""
    plans = []
    for pid, p in PLANS.items():
        if p["role"] == current["role"] or current["role"] == ROLE_ADMIN:
            plans.append({"id": pid, **p, "amount_rupees": p["amount"] / 100})
    return {"plans": plans, "razorpay_key_id": RAZORPAY_KEY_ID, "mode": PAYMENT_MODE}

@api.post("/payment/create-order")
async def create_order(req: PaymentOrderRequest, current: Dict[str, Any] = Depends(get_current_user)):
    plan = PLANS.get(req.plan_id)
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

    plan = PLANS[order["plan_id"]]
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
        {"$set": {"subscription": subscription}, "$inc": {"credits": plan["credits"]}},
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
    user = await get_user_by_id(current["id"])
    return {"status": "success", "subscription": subscription, "user": user, "credits_added": plan["credits"]}


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
        **req.dict(),
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


# --------------------------------------------------------------------------- #
# Include router
# --------------------------------------------------------------------------- #
app.include_router(api)
