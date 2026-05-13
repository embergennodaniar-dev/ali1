"""Backend test suite for Mood-to-Menu app.

Focus: new /api/orders endpoints + regression sanity (menu, chat session).
All tests hit the external URL loaded from /app/frontend/.env.
"""
import os
import re
import sys
import json
from pathlib import Path

import requests

# ── Resolve base URL from frontend env ────────────────────────────────────────
FRONTEND_ENV = Path("/app/frontend/.env")
BASE = None
for line in FRONTEND_ENV.read_text().splitlines():
    if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
        BASE = line.split("=", 1)[1].strip().strip('"')
        break
if not BASE:
    print("ERROR: EXPO_PUBLIC_BACKEND_URL not found in /app/frontend/.env")
    sys.exit(1)
API = BASE.rstrip("/") + "/api"
print(f"Using API base: {API}")

results = []  # list of (name, passed, detail)


def record(name, passed, detail=""):
    results.append((name, passed, detail))
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name} :: {detail}")


def test_1_create_order_happy_path():
    name = "1) POST /api/orders happy path"
    try:
        r = requests.post(
            f"{API}/orders",
            json={"summary": "Palaw + Ayran", "total": 75000, "language": "kk"},
            timeout=20,
        )
        if r.status_code != 200:
            return record(name, False, f"status={r.status_code} body={r.text[:300]}")
        d = r.json()
        oid = d.get("order_id", "")
        if not (isinstance(oid, str) and oid.startswith("ORD") and len(oid) == 11):
            return record(name, False, f"invalid order_id={oid!r}")
        # Hex check for the 8 chars after 'ORD'
        if not re.fullmatch(r"ORD[0-9A-F]{8}", oid):
            return record(name, False, f"order_id not ORD+8 uppercase hex: {oid}")
        payment_url = d.get("payment_url", "")
        if oid not in payment_url or "amount=75000" not in payment_url:
            return record(name, False, f"bad payment_url={payment_url}")
        if d.get("total") != 75000:
            return record(name, False, f"total mismatch: {d.get('total')}")
        if d.get("status") != "pending":
            return record(name, False, f"status mismatch: {d.get('status')}")
        record(name, True, f"order_id={oid}")
        return oid
    except Exception as e:
        record(name, False, f"exception: {e}")
        return None


def test_2_create_order_empty_body():
    name = "2) POST /api/orders empty body defaults"
    try:
        r = requests.post(f"{API}/orders", json={}, timeout=20)
        if r.status_code != 200:
            return record(name, False, f"status={r.status_code} body={r.text[:300]}")
        d = r.json()
        oid = d.get("order_id", "")
        if not (oid.startswith("ORD") and len(oid) == 11):
            return record(name, False, f"invalid order_id={oid!r}")
        if d.get("total") != 0:
            return record(name, False, f"total should be 0 got {d.get('total')}")
        if not d.get("payment_url"):
            return record(name, False, "missing payment_url")
        record(name, True, f"order_id={oid}, total={d.get('total')}")
    except Exception as e:
        record(name, False, f"exception: {e}")


def test_3_create_order_with_session_id():
    name = "3) POST /api/orders with session_id"
    try:
        r = requests.post(
            f"{API}/orders",
            json={
                "session_id": "abc-123",
                "summary": "x",
                "total": 50000,
                "language": "ru",
            },
            timeout=20,
        )
        if r.status_code != 200:
            return record(name, False, f"status={r.status_code} body={r.text[:300]}")
        d = r.json()
        oid = d.get("order_id", "")
        if not oid.startswith("ORD"):
            return record(name, False, f"bad order_id={oid}")
        # fetch back to verify persistence of session_id
        r2 = requests.get(f"{API}/orders/{oid}", timeout=20)
        if r2.status_code != 200:
            return record(name, False, f"fetch status={r2.status_code}")
        doc = r2.json()
        if doc.get("session_id") != "abc-123":
            return record(
                name, False, f"session_id not persisted: {doc.get('session_id')!r}"
            )
        if doc.get("language") != "ru":
            return record(name, False, f"language mismatch: {doc.get('language')}")
        if doc.get("total") != 50000:
            return record(name, False, f"total mismatch: {doc.get('total')}")
        record(name, True, f"order_id={oid}, session_id persisted")
    except Exception as e:
        record(name, False, f"exception: {e}")


def test_4_get_order(order_id):
    name = "4) GET /api/orders/{order_id}"
    if not order_id:
        return record(name, False, "no order_id from test 1")
    try:
        r = requests.get(f"{API}/orders/{order_id}", timeout=20)
        if r.status_code != 200:
            return record(name, False, f"status={r.status_code}")
        d = r.json()
        if "_id" in d:
            return record(name, False, "response contains MongoDB _id")
        required = {"order_id", "summary", "total", "language", "payment_url", "status"}
        missing = required - set(d.keys())
        if missing:
            return record(name, False, f"missing fields: {missing}")
        if d["order_id"] != order_id:
            return record(name, False, "order_id mismatch")
        if d["total"] != 75000:
            return record(name, False, f"total mismatch: {d['total']}")
        if d["language"] != "kk":
            return record(name, False, f"language mismatch: {d['language']}")
        if d["status"] != "pending":
            return record(name, False, f"status mismatch: {d['status']}")
        record(name, True, f"fetched order_id={order_id}, no _id leak")
    except Exception as e:
        record(name, False, f"exception: {e}")


def test_5_get_invalid_order():
    name = "5) GET /api/orders/INVALID_ID → 404"
    try:
        r = requests.get(f"{API}/orders/INVALID_ID", timeout=20)
        if r.status_code != 404:
            return record(name, False, f"expected 404 got {r.status_code}")
        try:
            detail = r.json().get("detail", "")
        except Exception:
            detail = r.text
        if detail != "Order not found":
            return record(name, False, f"detail mismatch: {detail!r}")
        record(name, True, "404 with 'Order not found'")
    except Exception as e:
        record(name, False, f"exception: {e}")


def test_6_menu():
    name = "6) GET /api/menu regression"
    try:
        r = requests.get(f"{API}/menu", timeout=30)
        if r.status_code != 200:
            return record(name, False, f"status={r.status_code}")
        items = r.json()
        if not isinstance(items, list):
            return record(name, False, "response not a list")
        if len(items) < 90:
            return record(name, False, f"expected >=90 items, got {len(items)}")
        record(name, True, f"{len(items)} items returned")
    except Exception as e:
        record(name, False, f"exception: {e}")


def test_7_chat_session():
    name = "7) POST /api/chat/sessions {language:kk}"
    try:
        r = requests.post(
            f"{API}/chat/sessions", json={"language": "kk"}, timeout=30
        )
        if r.status_code != 200:
            return record(name, False, f"status={r.status_code} body={r.text[:300]}")
        d = r.json()
        if not d.get("session_id"):
            return record(name, False, "missing session_id")
        if not d.get("greeting"):
            return record(name, False, "missing greeting")
        record(
            name,
            True,
            f"session_id={d['session_id'][:8]}…, greeting starts with {d['greeting'][:30]!r}",
        )
    except Exception as e:
        record(name, False, f"exception: {e}")


def main():
    oid = test_1_create_order_happy_path()
    test_2_create_order_empty_body()
    test_3_create_order_with_session_id()
    test_4_get_order(oid)
    test_5_get_invalid_order()
    test_6_menu()
    test_7_chat_session()

    print("\n===== SUMMARY =====")
    passed = sum(1 for _, p, _ in results if p)
    failed = len(results) - passed
    for n, p, d in results:
        print(f"{'✅' if p else '❌'} {n} — {d}")
    print(f"\nTotal: {passed}/{len(results)} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
