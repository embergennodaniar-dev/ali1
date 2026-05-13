"""Backend API tests for Mood-to-Menu app"""
import pytest
import requests
import os
import subprocess
import json

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

# ── Auth endpoints ──────────────────────────────────────────────────────────

class TestAuth:
    """Auth endpoints"""

    def test_auth_me_unauthorized(self, session):
        """GET /auth/me without token returns 401"""
        r = session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print("PASS: auth/me returns 401 without token")

    def test_auth_me_invalid_token(self, session):
        """GET /auth/me with invalid token returns 401"""
        r = session.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer invalid_token_xyz"})
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print("PASS: auth/me returns 401 with invalid token")

    def test_auth_session_invalid(self, session):
        """POST /auth/session with invalid session_id returns 401"""
        r = session.post(f"{BASE_URL}/api/auth/session", json={"session_id": "fake_session_123"})
        assert r.status_code in (401, 500), f"Expected 401/500, got {r.status_code}"
        print(f"PASS: auth/session with invalid id returns {r.status_code}")

    def test_auth_logout(self, session):
        """POST /auth/logout without token returns 200"""
        r = session.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        print("PASS: logout returns 200")


# ── Admin endpoints ──────────────────────────────────────────────────────────

class TestAdmin:
    """Admin endpoints"""

    def test_admin_login_success(self, session):
        r = session.post(f"{BASE_URL}/api/admin/login", json={"username": "admin", "password": "admin123"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["token"] == "mood-to-menu-admin-2024"
        print("PASS: admin login succeeds")

    def test_admin_login_failure(self, session):
        r = session.post(f"{BASE_URL}/api/admin/login", json={"username": "admin", "password": "wrongpass"})
        assert r.status_code == 401
        print("PASS: admin login rejects bad creds")


# ── Menu endpoints ──────────────────────────────────────────────────────────

class TestMenu:
    """Menu endpoints"""

    def test_get_menu_returns_items(self, session):
        r = session.get(f"{BASE_URL}/api/menu")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 99, f"Expected 99+ items, got {len(data)}"
        print(f"PASS: menu returns {len(data)} items")

    def test_menu_has_all_categories(self, session):
        r = session.get(f"{BASE_URL}/api/menu")
        data = r.json()
        categories = {item["category"] for item in data}
        expected = {"heavy", "light", "drinks", "desserts", "games"}
        assert expected.issubset(categories), f"Missing categories: {expected - categories}"
        print(f"PASS: menu has all 5 categories: {categories}")

    def test_menu_item_structure(self, session):
        r = session.get(f"{BASE_URL}/api/menu")
        data = r.json()
        item = data[0]
        required_fields = ["id", "category", "name", "price", "ingredients", "is_group_only", "is_game", "is_available"]
        for field in required_fields:
            assert field in item, f"Missing field: {field}"
        assert "_id" not in item, "MongoDB _id should be excluded"
        print("PASS: menu item has correct structure")

    def test_menu_category_counts(self, session):
        r = session.get(f"{BASE_URL}/api/menu")
        data = r.json()
        counts = {}
        for item in data:
            cat = item["category"]
            counts[cat] = counts.get(cat, 0) + 1
        print(f"Category counts: {counts}")
        assert counts.get("heavy", 0) >= 25, f"Expected 25 heavy, got {counts.get('heavy', 0)}"
        assert counts.get("light", 0) >= 24, f"Expected 24 light, got {counts.get('light', 0)}"
        assert counts.get("drinks", 0) >= 30, f"Expected 30 drinks, got {counts.get('drinks', 0)}"
        assert counts.get("desserts", 0) >= 15, f"Expected 15 desserts, got {counts.get('desserts', 0)}"
        assert counts.get("games", 0) >= 5, f"Expected 5 games, got {counts.get('games', 0)}"
        print("PASS: category counts correct")

    def test_create_menu_item_unauthorized(self, session):
        r = session.post(f"{BASE_URL}/api/menu", json={"category": "heavy", "name": "TEST_Item", "price": 1000, "ingredients": "test"})
        assert r.status_code == 401
        print("PASS: menu creation requires admin auth")


# ── Chat endpoints ──────────────────────────────────────────────────────────

class TestChat:
    """Chat session endpoints"""

    def test_create_session_kk(self, session):
        r = session.post(f"{BASE_URL}/api/chat/sessions", json={"language": "kk"})
        assert r.status_code == 200
        data = r.json()
        assert "session_id" in data
        assert "greeting" in data
        assert len(data["session_id"]) > 0
        print(f"PASS: chat session created: {data['session_id'][:8]}...")
        return data["session_id"]

    def test_create_session_ru(self, session):
        r = session.post(f"{BASE_URL}/api/chat/sessions", json={"language": "ru"})
        assert r.status_code == 200
        data = r.json()
        assert "session_id" in data
        # Russian greeting should contain Cyrillic
        assert any(ord(c) > 127 for c in data["greeting"]), "Russian greeting should contain Cyrillic"
        print("PASS: Russian session created")

    def test_get_sessions_list(self, session):
        r = session.get(f"{BASE_URL}/api/chat/sessions")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"PASS: sessions list returns {len(data)} sessions")

    def test_send_message(self, session):
        # Create session first
        create_r = session.post(f"{BASE_URL}/api/chat/sessions", json={"language": "kk"})
        assert create_r.status_code == 200
        session_id = create_r.json()["session_id"]

        # Send message
        r = session.post(
            f"{BASE_URL}/api/chat/sessions/{session_id}/messages",
            json={"content": "Keyipiyatım: 7/10, ashlıq: Orta ash, byudjet: 50000 swm, Jalǵız, allergiya: Joq, keliw waqtım: 12:00–14:00."}
        )
        assert r.status_code == 200
        data = r.json()
        assert "ai_message" in data
        assert "content" in data["ai_message"]
        assert len(data["ai_message"]["content"]) > 10
        print(f"PASS: AI responded with {len(data['ai_message']['content'])} chars")

    def test_get_session_detail(self, session):
        create_r = session.post(f"{BASE_URL}/api/chat/sessions", json={"language": "kk"})
        session_id = create_r.json()["session_id"]

        r = session.get(f"{BASE_URL}/api/chat/sessions/{session_id}")
        assert r.status_code == 200
        data = r.json()
        assert "session" in data
        assert "messages" in data
        assert len(data["messages"]) >= 1
        print("PASS: session detail returns messages")

    def test_delete_session(self, session):
        create_r = session.post(f"{BASE_URL}/api/chat/sessions", json={"language": "kk"})
        session_id = create_r.json()["session_id"]

        r = session.delete(f"{BASE_URL}/api/chat/sessions/{session_id}")
        assert r.status_code == 200

        # Verify deleted
        get_r = session.get(f"{BASE_URL}/api/chat/sessions/{session_id}")
        assert get_r.status_code == 404
        print("PASS: session deleted and returns 404")
