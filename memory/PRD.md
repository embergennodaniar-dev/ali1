# Mood-to-Menu — PRD (Updated 2026-05-06)

## Problem Statement
AI restaurant assistant app with step-by-step parameter collection, Claude Sonnet 4.5, Karakalpak+Russian, beautiful food photo backgrounds, iOS blur effects, Google auth, 99+ menu items.

## Architecture
- **Frontend:** Expo React Native (SDK 54), expo-router, expo-blur, react-native-reanimated, react-native-markdown-display
- **Backend:** FastAPI Python, port 8001
- **Database:** MongoDB (mood_to_menu_db)
- **AI:** Claude Sonnet 4.5 via emergentintegrations (claude-sonnet-4-5-20250929)
- **Auth:** Emergent-managed Google OAuth (auth.emergentagent.com)

## Screen Flow
1. App opens → Google OAuth welcome screen (food photo bg)
2. After Google sign-in → Tabs (Chat, History, Menu, Admin)
3. Chat tab → "Byirtpa Berin" landing screen
4. Press button → 6-step parameter collection:
   - Step 1: Keyipiyat (Mood) - 1-10 scale with emoji
   - Step 2: Ashlıq (Hunger) - 4 visual cards
   - Step 3: Byudjet (Budget) - input + presets
   - Step 4: Kim menen (Group) - cards + counter
   - Step 5: Allergiya - multi-select chips
   - Step 6: Keliw waqtı (Time) - 6 time slots
5. AI processing animation → Recommendation result card (with markdown)
6. "Jaqtı!" (done) or "Basqasın" (get another)

## Menu Database (99 items)
- Heavy/Main dishes: 25 items (Palaw, Manti, Lagmon, Shurpa, Shashlik, etc.)
- Light/Snacks: 24 items (Burgers, Salads, Wraps, etc.)
- Drinks: 30 items (Teas, Coffees, Juices, etc.)
- Desserts: 15 items (Chak-chak, Tiramisu, Muzqaymoq, etc.)
- Games: 5 items (Monopoliya, Uno, Jenga, Twister, Maffiya)

## Admin Credentials
- Username: admin / Password: admin123

## Google OAuth
- Login URL: https://auth.emergentagent.com
- Session stored in AsyncStorage with Bearer token auth

## Implemented Features (2026-05-06)
- ✅ Google OAuth welcome screen with food photo background + iOS blur effect
- ✅ 6-step animated parameter collection (slide transitions)
- ✅ AI recommendation with markdown rendering
- ✅ "Byirtpa Berin" large start button
- ✅ 99 menu items in 5 categories
- ✅ Chat history (view, delete)
- ✅ Admin CRUD panel
- ✅ QQ ↔ RU language toggle (persisted)
- ✅ User avatar with logout in header

## Backlog
### P1
- Table reservation system (SMS confirmation)
- Push notifications for specials
- Customer feedback/rating per recommendation
### P2
- Dish photo uploads
- Uzbek/English language support
- Analytics dashboard
