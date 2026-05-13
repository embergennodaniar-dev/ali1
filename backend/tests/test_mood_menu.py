"""Backend tests for Mood-to-Menu app"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
ADMIN_TOKEN = "mood-to-menu-admin-2024"


@pytest.fixture
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Health / Menu seed
class TestMenu:
    """Menu API tests"""

    def test_get_menu_returns_12_items(self, session):
        res = session.get(f"{BASE_URL}/api/menu")
        assert res.status_code == 200
        items = res.json()
        assert len(items) == 12, f"Expected 12 items, got {len(items)}"

    def test_menu_contains_palaw(self, session):
        res = session.get(f"{BASE_URL}/api/menu")
        names = [i['name'] for i in res.json()]
        assert "Palaw" in names

    def test_menu_contains_games(self, session):
        res = session.get(f"{BASE_URL}/api/menu")
        names = [i['name'] for i in res.json()]
        for game in ["Monopoliya", "Uno", "Jenga"]:
            assert game in names, f"{game} not found in menu"

    def test_create_menu_item_requires_admin(self, session):
        res = session.post(f"{BASE_URL}/api/menu", json={
            "category": "light", "name": "TEST_Item", "price": 10000,
            "ingredients": "test", "is_group_only": False, "is_game": False,
            "is_available": True, "min_group_size": 1
        })
        assert res.status_code == 401

    def test_create_and_delete_menu_item_as_admin(self, session):
        session.headers.update({"x-admin-token": ADMIN_TOKEN})
        res = session.post(f"{BASE_URL}/api/menu", json={
            "category": "light", "name": "TEST_TempItem", "price": 5000,
            "ingredients": "test", "is_group_only": False, "is_game": False,
            "is_available": True, "min_group_size": 1
        })
        assert res.status_code == 200
        item_id = res.json()["id"]

        del_res = session.delete(f"{BASE_URL}/api/menu/{item_id}")
        assert del_res.status_code == 200


class TestAdminAuth:
    """Admin authentication tests"""

    def test_login_success(self, session):
        res = session.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin", "password": "admin123"
        })
        assert res.status_code == 200
        assert "token" in res.json()

    def test_login_wrong_password(self, session):
        res = session.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin", "password": "wrong"
        })
        assert res.status_code == 401

    def test_token_is_correct(self, session):
        res = session.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin", "password": "admin123"
        })
        assert res.json()["token"] == ADMIN_TOKEN


class TestChatSessions:
    """Chat session API tests"""

    def test_create_session_kk(self, session):
        res = session.post(f"{BASE_URL}/api/chat/sessions", json={"language": "kk"})
        assert res.status_code == 200
        data = res.json()
        assert "session_id" in data
        assert "greeting" in data
        assert "Sálem" in data["greeting"] or "Mood-to-Menu" in data["greeting"]

    def test_create_session_ru(self, session):
        res = session.post(f"{BASE_URL}/api/chat/sessions", json={"language": "ru"})
        assert res.status_code == 200
        data = res.json()
        assert "Привет" in data["greeting"] or "Mood-to-Menu" in data["greeting"]

    def test_list_sessions(self, session):
        res = session.get(f"{BASE_URL}/api/chat/sessions")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_send_message_and_get_ai_response(self, session):
        # Create session first
        create_res = session.post(f"{BASE_URL}/api/chat/sessions", json={"language": "kk"})
        session_id = create_res.json()["session_id"]

        msg_res = session.post(f"{BASE_URL}/api/chat/sessions/{session_id}/messages",
                               json={"content": "Salam, men jaqsı keyipiyattaman"})
        assert msg_res.status_code == 200
        data = msg_res.json()
        assert "ai_message" in data
        assert "user_message" in data
        assert len(data["ai_message"]["content"]) > 0

        # Cleanup
        session.delete(f"{BASE_URL}/api/chat/sessions/{session_id}")

    def test_send_message_invalid_session(self, session):
        res = session.post(f"{BASE_URL}/api/chat/sessions/invalid-id/messages",
                           json={"content": "test"})
        assert res.status_code == 404

    def test_get_session_messages(self, session):
        create_res = session.post(f"{BASE_URL}/api/chat/sessions", json={"language": "kk"})
        session_id = create_res.json()["session_id"]

        get_res = session.get(f"{BASE_URL}/api/chat/sessions/{session_id}")
        assert get_res.status_code == 200
        data = get_res.json()
        assert "messages" in data
        assert len(data["messages"]) >= 1  # at least greeting

        # Cleanup
        session.delete(f"{BASE_URL}/api/chat/sessions/{session_id}")
