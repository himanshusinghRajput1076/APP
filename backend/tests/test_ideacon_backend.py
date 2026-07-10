"""IDEACON backend comprehensive test suite."""
import os
import time
import uuid
import json
import base64
import asyncio
import pytest
import requests
import websockets

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
WS_BASE = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws"

ADMIN_EMAIL = "admin@ideacon.in"
ADMIN_PASSWORD = "Admin@Ideacon2026"

RUN_ID = uuid.uuid4().hex[:6]


def _signup(role: str, prefix: str):
    email = f"TEST_{prefix}_{RUN_ID}@example.com"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "password": "test1234", "name": f"Test {prefix}", "role": role,
    }, timeout=15)
    assert r.status_code == 200, r.text
    return r.json(), email


# Session-scoped fixtures caching created users
@pytest.fixture(scope="module")
def student():
    data, email = _signup("student", "stu")
    return {**data, "email": email, "password": "test1234"}


@pytest.fixture(scope="module")
def investor():
    data, email = _signup("investor", "inv")
    return {**data, "email": email, "password": "test1234"}


@pytest.fixture(scope="module")
def growing():
    data, email = _signup("growing_startup", "grw")
    return {**data, "email": email, "password": "test1234"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Health ----------
def test_health():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    assert r.json()["app"] == "IDEACON"


# ---------- Auth ----------
def test_signup_duplicate_email(student):
    r = requests.post(f"{API}/auth/signup", json={
        "email": student["email"], "password": "test1234", "name": "dup", "role": "student"
    }, timeout=15)
    assert r.status_code == 400


def test_login_and_me(student):
    r = requests.post(f"{API}/auth/login", json={"email": student["email"], "password": "test1234"}, timeout=15)
    assert r.status_code == 200
    tok = r.json()["access_token"]
    m = requests.get(f"{API}/auth/me", headers=_auth(tok), timeout=15)
    assert m.status_code == 200
    assert m.json()["user"]["email"].lower() == student["email"].lower()


def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": "nouser@nope.com", "password": "x"}, timeout=15)
    assert r.status_code == 401


def test_admin_login(admin_token):
    r = requests.get(f"{API}/auth/me", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "admin"


# ---------- Sectors ----------
def test_sectors():
    r = requests.get(f"{API}/sectors", timeout=15)
    assert r.status_code == 200
    sectors = r.json()["sectors"]
    assert isinstance(sectors, list) and len(sectors) >= 40, f"got {len(sectors)}"


# ---------- KYC ----------
def test_kyc_submit_and_status(student):
    tok = student["access_token"]
    b64 = base64.b64encode(b"fake").decode()
    r = requests.post(f"{API}/kyc/submit", headers=_auth(tok), json={
        "pan": "ABCDE1234F", "aadhar": "123412341234", "mobile": "9999999999",
        "id_photo": b64, "id_card_type": "college", "id_card_number": "C1", "college_or_school_name": "IIT"
    }, timeout=15)
    assert r.status_code == 200
    s = requests.get(f"{API}/kyc/status", headers=_auth(tok), timeout=15)
    assert s.status_code == 200
    assert s.json()["status"] == "submitted"


# ---------- Payment ----------
def test_payment_plans_scoped(student, investor):
    r1 = requests.get(f"{API}/payment/plans", headers=_auth(student["access_token"]), timeout=15)
    assert r1.status_code == 200
    for p in r1.json()["plans"]:
        assert p["role"] == "student"
    r2 = requests.get(f"{API}/payment/plans", headers=_auth(investor["access_token"]), timeout=15)
    for p in r2.json()["plans"]:
        assert p["role"] == "investor"


def test_payment_flow_mock(investor):
    tok = investor["access_token"]
    r = requests.post(f"{API}/payment/create-order", headers=_auth(tok),
                     json={"plan_id": "investor_basic"}, timeout=15)
    assert r.status_code == 200, r.text
    order_id = r.json()["order_id"]
    v = requests.post(f"{API}/payment/verify", headers=_auth(tok),
                     json={"order_id": order_id, "payment_id": "pay_mock"}, timeout=15)
    assert v.status_code == 200, v.text
    assert v.json()["status"] == "success"
    # verify subscription set
    m = requests.get(f"{API}/auth/me", headers=_auth(tok), timeout=15).json()["user"]
    assert m.get("subscription") and m["subscription"]["plan_id"] == "investor_basic"


def test_payment_wrong_role(student):
    tok = student["access_token"]
    r = requests.post(f"{API}/payment/create-order", headers=_auth(tok),
                     json={"plan_id": "investor_basic"}, timeout=15)
    assert r.status_code == 403


# ---------- Portfolio & Discover ----------
def test_portfolio_update_and_get(student):
    tok = student["access_token"]
    r = requests.post(f"{API}/portfolio/update", headers=_auth(tok), json={
        "bio": "Founder bio", "sector": "E-commerce", "skills": ["python"], "linkedin": "x"
    }, timeout=15)
    assert r.status_code == 200
    user = r.json()["user"]
    assert user["bio"] == "Founder bio"
    # public get - ensure no email/mobile leak
    p = requests.get(f"{API}/portfolio/{user['id']}", headers=_auth(tok), timeout=15).json()
    assert "email" not in p and "hashed_password" not in p and "mobile" not in p


def test_discover_investor_sees_founders(investor, student):
    # Ensure student has a sector; already set above
    tok = investor["access_token"]
    r = requests.get(f"{API}/discover", headers=_auth(tok), timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["has_access"] is True
    assert data["limit"] >= 50  # investor_basic
    for p in data["profiles"]:
        assert p["role"] in ("student", "growing_startup")
        assert "email" not in p


def test_discover_trial_student(growing):
    # growing without subscription -> trial, limit 5
    tok = growing["access_token"]
    r = requests.get(f"{API}/discover", headers=_auth(tok), timeout=15)
    assert r.status_code == 200
    assert r.json()["limit"] == 5


# ---------- Pitch ----------
@pytest.fixture(scope="module")
def pitch_id(student):
    r = requests.post(f"{API}/pitch", headers=_auth(student["access_token"]), json={
        "title": "TEST Pitch", "description": "desc", "sector": "E-commerce", "funding_ask": 100000,
    }, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_pitch_list_and_like(student, pitch_id):
    tok = student["access_token"]
    r = requests.get(f"{API}/pitch", headers=_auth(tok), timeout=15)
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()["pitches"]]
    assert pitch_id in ids
    l_resp = requests.post(f"{API}/pitch/{pitch_id}/like", headers=_auth(tok), timeout=15)
    assert l_resp.status_code == 200


def test_pitch_investor_forbidden(investor):
    r = requests.post(f"{API}/pitch", headers=_auth(investor["access_token"]), json={
        "title": "x", "description": "y", "sector": "E-commerce"
    }, timeout=15)
    assert r.status_code == 403


# ---------- Chat HTTP ----------
def test_chat_http_send_list_history(student, investor):
    stu_tok = student["access_token"]
    inv_id = investor["user"]["id"]
    r = requests.post(f"{API}/chat/send", headers=_auth(stu_tok),
                     json={"receiver_id": inv_id, "text": "TEST hello"}, timeout=15)
    assert r.status_code == 200, r.text
    l_resp = requests.get(f"{API}/chat/list", headers=_auth(stu_tok), timeout=15)
    assert l_resp.status_code == 200 and len(l_resp.json()["chats"]) >= 1
    # ensure "other" is public_user only (no email)
    assert "email" not in l_resp.json()["chats"][0]["other"]
    h = requests.get(f"{API}/chat/{inv_id}", headers=_auth(stu_tok), timeout=15)
    assert h.status_code == 200
    assert any(m["text"] == "TEST hello" for m in h.json()["messages"])


# ---------- WebSocket ----------
def test_websocket_ping_and_message(student, investor):
    async def run():
        stu_tok = student["access_token"]
        inv_tok = investor["access_token"]
        stu_id = student["user"]["id"]
        inv_id = investor["user"]["id"]
        uri_s = f"{WS_BASE}/{stu_id}?token={stu_tok}"
        uri_i = f"{WS_BASE}/{inv_id}?token={inv_tok}"
        async with websockets.connect(uri_s) as ws_s, websockets.connect(uri_i) as ws_i:
            await ws_s.send(json.dumps({"type": "ping"}))
            resp = json.loads(await asyncio.wait_for(ws_s.recv(), timeout=5))
            assert resp["type"] == "pong"
            await ws_s.send(json.dumps({"type": "message", "receiver_id": inv_id, "text": "TEST ws"}))
            # sender echo
            echo = json.loads(await asyncio.wait_for(ws_s.recv(), timeout=5))
            # receiver push
            recv = json.loads(await asyncio.wait_for(ws_i.recv(), timeout=5))
            assert echo["type"] == "message"
            assert recv["message"]["text"] == "TEST ws"
    asyncio.run(run())


def test_websocket_bad_token(student):
    async def run():
        stu_id = student["user"]["id"]
        uri = f"{WS_BASE}/{stu_id}?token=bad.token.value"
        try:
            async with websockets.connect(uri) as ws:
                await asyncio.wait_for(ws.recv(), timeout=3)
            assert False, "should have closed"
        except Exception:
            assert True
    asyncio.run(run())


# ---------- ID Card ----------
def test_id_card(student):
    r = requests.get(f"{API}/id-card", headers=_auth(student["access_token"]), timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["member_id"].startswith("IDC-")
    assert d["role"] == "student"


# ---------- Support ----------
def test_support_flow(student, admin_token):
    tok = student["access_token"]
    r = requests.post(f"{API}/support", headers=_auth(tok),
                     json={"subject": "TEST issue", "category": "general", "message": "help pls"}, timeout=15)
    assert r.status_code == 200
    my = requests.get(f"{API}/support", headers=_auth(tok), timeout=15).json()["tickets"]
    assert any(t["subject"] == "TEST issue" for t in my)
    all_t = requests.get(f"{API}/support", headers=_auth(admin_token), timeout=15).json()["tickets"]
    assert len(all_t) >= len(my)


# ---------- Admin ----------
def test_admin_analytics(admin_token):
    r = requests.get(f"{API}/admin/analytics", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "users_by_role" in d and "kyc" in d


def test_admin_users_filter(admin_token):
    r = requests.get(f"{API}/admin/users?role=student", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200
    for u in r.json()["users"]:
        assert u["role"] == "student"


def test_admin_kyc_approve_flow(admin_token, student):
    uid_ = student["user"]["id"]
    g = requests.get(f"{API}/admin/kyc/{uid_}", headers=_auth(admin_token), timeout=15)
    assert g.status_code == 200
    a = requests.post(f"{API}/admin/kyc/{uid_}/approve", headers=_auth(admin_token), timeout=15)
    assert a.status_code == 200
    # verify user kyc_status updated
    stu_me = requests.get(f"{API}/auth/me", headers=_auth(student["access_token"]), timeout=15).json()["user"]
    assert stu_me["kyc_status"] == "approved"


def test_admin_toggle_active(admin_token, growing):
    uid_ = growing["user"]["id"]
    r = requests.post(f"{API}/admin/user/{uid_}/toggle-active", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["active"] is False
    # re-enable
    r2 = requests.post(f"{API}/admin/user/{uid_}/toggle-active", headers=_auth(admin_token), timeout=15)
    assert r2.json()["active"] is True


def test_non_admin_forbidden(student):
    r = requests.get(f"{API}/admin/analytics", headers=_auth(student["access_token"]), timeout=15)
    assert r.status_code == 403
