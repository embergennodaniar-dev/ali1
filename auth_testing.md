# Auth Testing Playbook - Mood-to-Menu

## Step 1: Create Test User & Session via mongosh
```
mongosh --eval "
use('mood_to_menu_db');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({ user_id: userId, email: 'test@example.com', name: 'Test User', picture: '', created_at: new Date() });
db.user_sessions.insertOne({ user_id: userId, session_token: sessionToken, expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date() });
print('token: ' + sessionToken);
"
```

## Step 2: Test Backend Auth APIs
```bash
curl -X GET "http://localhost:8001/api/auth/me" -H "Authorization: Bearer YOUR_TOKEN"
```

## Credentials
- Admin: admin / admin123
