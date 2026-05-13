from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, requests
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timezone
#from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

active_chats: Dict[str, LlmChat] = {}
ADMIN_USERNAME = os.environ['ADMIN_USERNAME']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
ADMIN_TOKEN = os.environ['ADMIN_TOKEN']

SYSTEM_PROMPT = """# SENIŃ ROLIŃ HÁM TÁBIYATIŃ
Sen "Mood-to-Menu" aqıllı restoranınıń Jasama Intellekt agentiseń. Seniń wazıypań – klienttiń jaǵdayına qarap BYUDJETKE QATAŃ SAY KELETUǴIN menyunı anıq matematikalıq esap-kitap penen usınıs etiw.

# TIL QAǴIYDASI
Tek Qaraqalpaq yamasa Rus tilinde juwap ber. Klient qaysı tilde jazsa, sol tilde juwap ber.

# ISHKI MAǴLIWMATLAR BAZASI
[TOYDIRIMLI TAǴAMLAR]
- "Palaw" | 35000 | gósh, gúrish, geshir, piyaz, may
- "Manti" | 40000 | gósh, qamır, piyaz
- "Qazan Kebab" | 150000 | qoy góshi, kartoshka, may | MIN 2 ADAM | JALǴIZ USHIN USINIS ETILMEYDI
- "Lagmon" | 35000 | gósh, erişte, kókat, piyaz
- "Shurpa" | 40000 | qoy góshi, kartoshka, sabzavot
- "Somsa (3 dona)" | 25000 | gósh, qamır, piyaz
- "Dimlama" | 45000 | gósh, kartoshka, sabzavot
- "Beshbarmaq" | 55000 | gósh, qamır, sogan
- "Shashlik" | 55000 | qoy góshi, piyaz
- "Mastava" | 32000 | gósh, gúrish, sabzavot
- "Chuchvara" | 28000 | gósh, qamır, sogan
- "Qıyma Kabab" | 48000 | qıyma gósh, piyaz
- "Jigar Kabab" | 50000 | jigar, piyaz
- "Norin" | 35000 | at góshi, qamır
- "Tandır Kabab" | 60000 | qoy góshi, nan
- "Qovurdoq" | 50000 | gósh, kartoshka, piyaz

[JEŃIL TAǴAMLAR]
- "Klassik Burger" | 30000 | sıyır góshi, pomidor, nan, sır
- "Fri Kartoshkası" | 15000 | kartoshka, may
- "Fito-Salat" | 20000 | qıyar, pomidor, zeytun mayı
- "Achichuk Salat" | 18000 | pomidor, piyaz, kókat
- "Lavash Wrap" | 25000 | gósh, lavash, sabzavot
- "Caesar Salat" | 28000 | tovuq, pomidor, sır, nan
- "Olivye Salat" | 25000 | kartoshka, kolbasa, tuxum, mayyonez
- "Cheez Burger" | 35000 | sıyır góshi, sır, nan, pomidor
- "Somsa (1 dona)" | 10000 | gósh, qamır, piyaz

[ISHIMLIKLER]
- "Qara/Kók Chay" | 10000 | chay japıraǵı, suw
- "Miyweli Sok (1L)" | 25000 | alma, qumsheker
- "Suw (0.5L)" | 5000 | suw
- "Suw (1L)" | 8000 | suw
- "Kofe (Americano)" | 22000 | kofe, suw
- "Kapuçino" | 28000 | espresso, sút
- "Latte" | 30000 | espresso, sút
- "Limonada" | 20000 | limon, shakar, suw
- "Ayran" | 12000 | qatıq, suw, duz
- "Kompot" | 15000 | miyweler, shakar, suw
- "Apelsin Soki" | 25000 | apelsin

[TÁTLI TAǴAMLAR]
- "Chak-chak" | 20000 | un, tuxum, bal
- "Tort (Tilim)" | 35000 | un, krem, miywalar
- "Brownie" | 25000 | shokolad, un, tuxum
- "Muzqaymoq" | 20000 | sút, shakar
- "Wafle" | 20000 | un, tuxum, may

[OYINLAR — TEK TOPAR USHIN]
- Monopoliya | MIN 2, MAX 6 adam
- Uno | MIN 2, MAX 10 adam
- Jenga | MIN 2, MAX 4 adam
- Twister | MIN 2, MAX 6 adam
- Maffiya | MIN 6, MAX 12 adam

Restoran islew waqtı: 10:00–23:00

# QATAŃ QAǴIYDALAR (BUZIW MUMKIN EMES)

## 1. WAQIT FILTRI
10:00–23:00 dıs waqıt keltirilse → "Keshirimińizdi soraymız, biz tek 10:00–23:00 aralıǵında islaymız."

## 2. ALLERGIYA FILTRI
Quramında allergen bar hámme taǵam/ishimlikti QATAŃ shetlet. Geshir → Palawdı shetlet. Sır → Caesar, Cheez Burgerdı shetlet. Tuxum → Wafle, Browniedı shetlet. h.t.b.

## 3. ADAM SANINA TURA KELIW — EKILAMSHI TEKSERIW
Hár bir usınıs qılınatuǵın taǵam hám oyın ushın adam sanın qatań tekser:
A) Jalǵız klient → Qazan Kebab + HÁMME oyınlardı usınıs ETPE
B) Topar (N adam) → Qazan Kebab ushın N >= 2 kerek
C) Oyınlar ushın: oyındıń MIN <= N <= MAX bolıwı SHÁRT
   - Eger N oyındıń chegarasınan tıs bolsa → "Siz kórsetken [N] adam sanıńız [Oyın atı] ushın tura kelmeytughın ([MIN]-[MAX] adam kerek). Adam sanıńızdı qayta belgileysiz be yamasa basqa oyın tańlaymız ba?" dep anıq sor.

## 4. BYUDJET — QATAŃ MATEMATIKALIQ ESAP (EŃ ÁHEMIYETLI)
USINIS BERIWDIN ALDIN tómendegi esapdı ISKE ASIR:
  Jámi = Taǵam bahası + Ishimlik bahası + Dessert bahası (eger qosılsa)
  Jámi BYUDJET dán ASPASLIGI SHÁRT (Jámi <= Byudjet)

Byudjet jeterliksizbetse, dáslep eń arzan variantlardı sına:
  Eń az: Fri Kartoshkası(15000) + Suw 0.5L(5000) = 20000 swm
  Eger byudjet 20000 dán kishi bolsa → "Keshirimińizdi soraymız, bul byudjetke mas tamaq tabılmadı."

Esap-kitap FOMAT: [Taǵam bahası] + [Ishimlik bahası] = [Jámi] swm ≤ [Byudjet] swm ✓

## 5. JAŃALAW
"Unamadı" yamasa "basqasın ber" dese → aldıńǵı usınıstı QAYTALAMAP, byudjet ishinde basqa kombinatsiya tańla.

# JUWAP FORMATI
- [Jıllı kútip alıw + keyipiyatın túsinik]
- **Arnawlı Tamaq Dızımı:**
  - [Taǵam atı] — [baha] swm
  - [Ishimlik atı] — [baha] swm
  - [Tátli taǵam — ixtiyariy] — [baha] swm
- **Esap-kitap:** [Taǵam] + [Ishimlik] = **[Jámi] swm** ✅ (Byudjet: [byudjet] swm)
- **Oyın:** [Tek topar ushın. Jalǵız bolsa — bul qatardı toliqlep alıp tasla!]
- **Waqıt:** Kórsetilgen waqıt dáslepki túrde belgilendi; kelgenińizde bos stolǵa ornalasasıńız.
- **Soraw:** Bul menyu sizge ılayıqlı ma, yamasa jańa variant usınıs bereyin be?"""


# Models
class CreateSessionRequest(BaseModel):
    language: str = "kk"

class SendMessageRequest(BaseModel):
    content: str

class MenuItemCreate(BaseModel):
    category: str
    name: str
    price: int = 0
    ingredients: str = ""
    is_group_only: bool = False
    is_game: bool = False
    is_available: bool = True
    min_group_size: int = 1

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AuthSessionRequest(BaseModel):
    session_id: str


class CreateOrderRequest(BaseModel):
    session_id: Optional[str] = None
    summary: str = ""
    total: int = 0
    language: str = "kk"


# Auth dependency
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def admin_auth(x_admin_token: Optional[str] = Header(None)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


def get_or_create_chat(session_id: str) -> LlmChat:
    if session_id not in active_chats:
        active_chats[session_id] = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY', ''),
            session_id=session_id,
            system_message=SYSTEM_PROMPT
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    return active_chats[session_id]


# ── AUTH ROUTES ─────────────────────────────────────────────────────────────
@api_router.post("/auth/session")
async def create_auth_session(data: AuthSessionRequest):
    """Exchange OAuth session_id for session_token"""
    try:
        resp = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": data.session_id},
            timeout=10
        )
        if not resp.ok:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        user_data = resp.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Auth service error: {str(e)}")

    email = user_data.get("email", "")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": user_data.get("name", ""),
            "picture": user_data.get("picture", ""),
            "created_at": datetime.now(timezone.utc),
        })

    session_token = user_data["session_token"]
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc).replace(
            tzinfo=None
        ).replace(tzinfo=timezone.utc).__class__.fromtimestamp(
            datetime.now(timezone.utc).timestamp() + 7 * 24 * 3600, tz=timezone.utc
        ),
        "created_at": datetime.now(timezone.utc),
    })

    return {
        "session_token": session_token,
        "user": {
            "user_id": user_id,
            "email": email,
            "name": user_data.get("name", ""),
            "picture": user_data.get("picture", ""),
        }
    }


@api_router.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"message": "Logged out"}


# ── ADMIN ROUTES ─────────────────────────────────────────────────────────────
@api_router.post("/admin/login")
async def admin_login(data: AdminLoginRequest):
    if data.username == ADMIN_USERNAME and data.password == ADMIN_PASSWORD:
        return {"token": ADMIN_TOKEN, "message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid credentials")


# ── CHAT ROUTES ──────────────────────────────────────────────────────────────
@api_router.post("/chat/sessions")
async def create_session(data: CreateSessionRequest):
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    if data.language == "ru":
        greeting = "Привет! 🍽️ Я умный агент Mood-to-Menu. Сейчас я подберу для вас идеальное меню. Как вы себя чувствуете?"
    else:
        greeting = "Sálem! 🍽️ Men «Mood-to-Menu» jasalma intellekt kómekshişiman. Sizge eń mas keletuǵın menyunı tabıp beremen. Keyipiyatıńız qanday?"
    await db.chat_sessions.insert_one({
        "session_id": session_id, "created_at": now, "updated_at": now,
        "preview": "", "language": data.language, "message_count": 1,
    })
    await db.messages.insert_one({
        "id": str(uuid.uuid4()), "session_id": session_id,
        "role": "assistant", "content": greeting, "created_at": now,
    })
    get_or_create_chat(session_id)
    return {"session_id": session_id, "greeting": greeting}


@api_router.get("/chat/sessions")
async def list_sessions():
    return await db.chat_sessions.find({}, {"_id": 0}).sort("updated_at", -1).to_list(100)


@api_router.get("/chat/sessions/{session_id}")
async def get_session(session_id: str):
    session = await db.chat_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = await db.messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return {"session": session, "messages": messages}


@api_router.delete("/chat/sessions/{session_id}")
async def delete_session(session_id: str):
    await db.chat_sessions.delete_one({"session_id": session_id})
    await db.messages.delete_many({"session_id": session_id})
    if session_id in active_chats:
        del active_chats[session_id]
    return {"message": "Deleted"}


@api_router.post("/chat/sessions/{session_id}/messages")
async def send_message(session_id: str, data: SendMessageRequest):
    session = await db.chat_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    chat = get_or_create_chat(session_id)
    now = datetime.now(timezone.utc)
    user_msg_id = str(uuid.uuid4())
    await db.messages.insert_one({"id": user_msg_id, "session_id": session_id, "role": "user", "content": data.content, "created_at": now})
    if session.get("message_count", 0) <= 1:
        await db.chat_sessions.update_one({"session_id": session_id}, {"$set": {"preview": data.content[:60]}})
    try:
        response = await chat.send_message(UserMessage(text=data.content))
    except Exception as e:
        logger.error(f"AI error: {e}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
    ai_msg_id = str(uuid.uuid4())
    await db.messages.insert_one({"id": ai_msg_id, "session_id": session_id, "role": "assistant", "content": response, "created_at": datetime.now(timezone.utc)})
    await db.chat_sessions.update_one({"session_id": session_id}, {"$inc": {"message_count": 2}, "$set": {"updated_at": datetime.now(timezone.utc)}})
    return {
        "user_message": {"id": user_msg_id, "role": "user", "content": data.content},
        "ai_message": {"id": ai_msg_id, "role": "assistant", "content": response},
    }


# ── ORDER ROUTES ─────────────────────────────────────────────────────────────
@api_router.post("/orders")
async def create_order(data: CreateOrderRequest):
    """Create an order and generate a payment link with QR code."""
    order_id = f"ORD{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    payment_url = f"https://pay.mood-to-menu.uz/o/{order_id}?amount={data.total}"
    order = {
        "order_id": order_id,
        "session_id": data.session_id or "",
        "summary": data.summary,
        "total": data.total,
        "language": data.language,
        "payment_url": payment_url,
        "status": "pending",
        "created_at": now,
    }
    await db.orders.insert_one(order)
    return {
        "order_id": order_id,
        "payment_url": payment_url,
        "total": data.total,
        "status": "pending",
    }


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ── MENU ROUTES ──────────────────────────────────────────────────────────────
@api_router.get("/menu")
async def get_menu():
    return await db.menu_items.find({}, {"_id": 0}).to_list(500)


@api_router.post("/menu")
async def create_menu_item(data: MenuItemCreate, _: None = Depends(admin_auth)):
    item = data.dict()
    item["id"] = str(uuid.uuid4())
    item["created_at"] = datetime.now(timezone.utc)
    await db.menu_items.insert_one(item)
    return {k: v for k, v in item.items() if k != "_id"}


@api_router.put("/menu/{item_id}")
async def update_menu_item(item_id: str, data: MenuItemCreate, _: None = Depends(admin_auth)):
    result = await db.menu_items.update_one({"id": item_id}, {"$set": data.dict()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Updated"}


@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, _: None = Depends(admin_auth)):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Deleted"}


# ── SEED ─────────────────────────────────────────────────────────────────────
def _item(cat, name, price, ingr, group=False, game=False, min_g=1):
    return {"id": str(uuid.uuid4()), "category": cat, "name": name, "price": price,
            "ingredients": ingr, "is_group_only": group, "is_game": game,
            "is_available": True, "min_group_size": min_g,
            "created_at": datetime.now(timezone.utc)}

SEED_ITEMS = [
    # Heavy
    _item("heavy","Palaw",35000,"Gósh, gúrish, geshir, piyaz, may"),
    _item("heavy","Manti",40000,"Gósh, qamır, piyaz"),
    _item("heavy","Qazan Kebab",150000,"Qoy góshi, kartoshka, may",True,False,2),
    _item("heavy","Lagmon",35000,"Gósh, erişte, kókat, piyaz"),
    _item("heavy","Shurpa",40000,"Qoy góshi, kartoshka, sabzavot"),
    _item("heavy","Somsa (3 dona)",25000,"Gósh, qamır, piyaz"),
    _item("heavy","Dimlama",45000,"Gósh, kartoshka, sabzavot"),
    _item("heavy","Beshbarmaq",55000,"Gósh, qamır, sogan"),
    _item("heavy","Shashlik",55000,"Qoy góshi, piyaz"),
    _item("heavy","Mastava",32000,"Gósh, gúrish, sabzavot"),
    _item("heavy","Chuchvara",28000,"Gósh, qamır, sogan"),
    _item("heavy","Qıyma Kabab",48000,"Qıyma gósh, piyaz"),
    _item("heavy","Jigar Kabab",50000,"Jigar, piyaz"),
    _item("heavy","Norin",35000,"At góshi, qamır"),
    _item("heavy","Tandır Kabab",60000,"Qoy góshi, nan"),
    _item("heavy","Qovurdoq",50000,"Gósh, kartoshka, piyaz"),
    _item("heavy","Mashkichiri",30000,"Mash, gúrish, piyaz"),
    _item("heavy","Manpar",38000,"Gósh, qamır, sabzavot"),
    _item("heavy","Oshqovoq Manti",35000,"Oshqovoq, qamır, piyaz"),
    _item("heavy","Qızıl Shurpa",42000,"Qoy góshi, pomidor, sabzavot"),
    _item("heavy","Dumba Kabab",65000,"Dumba, piyaz"),
    _item("heavy","Kəbab",55000,"Qoy góshi, piyaz, ziravor"),
    _item("heavy","Qo'y Bosh",45000,"Qoy boshi, ziravor"),
    _item("heavy","Qozon Dimlama",50000,"Gósh, sabzavot, may",True,False,2),
    _item("heavy","Kulcha Nan Bilan",35000,"Gúrish shorva, nan"),
    # Light
    _item("light","Klassik Burger",30000,"Sıyır góshi, pomidor, nan, sır"),
    _item("light","Fri Kartoshkası",15000,"Kartoshka, may"),
    _item("light","Fito-Salat",20000,"Qıyar, pomidor, zeytun mayı"),
    _item("light","Achichuk Salat",18000,"Pomidor, piyaz, kókat"),
    _item("light","Lavash Wrap",25000,"Gósh, lavash, sabzavot"),
    _item("light","Caesar Salat",28000,"Tovuq, pomidor, sır, nan"),
    _item("light","Olivye Salat",25000,"Kartoshka, kolbasa, tuxum, mayyonez"),
    _item("light","Cheez Burger",35000,"Sıyır góshi, sır, nan, pomidor"),
    _item("light","Somsa (1 dona)",10000,"Gósh, qamır, piyaz"),
    _item("light","Çips",8000,"Kartoshka, duz, may"),
    _item("light","Hot-dog",20000,"Kolbasa, nan, ketchup"),
    _item("light","Naan Pita",10000,"Un, may"),
    _item("light","Kókat Salat",20000,"Kókat, limon, zeytun mayı"),
    _item("light","Pizza Dilim",25000,"Qamır, pomidor, sır"),
    _item("light","Grechka Salat",22000,"Grechka, sabzavot, zeytun mayı"),
    _item("light","Sabzavot Salat",16000,"Sabzavot, zeytun mayı"),
    _item("light","Tashkent Salat",25000,"Gósh, piyaz, pomidor"),
    _item("light","Falafel",25000,"Not, un, ziravor"),
    _item("light","Lahmacun",28000,"Qıyma gósh, un, pomidor"),
    _item("light","Qovoq Shorva",20000,"Oshqovoq, krem, ziravor"),
    _item("light","Sandviç",22000,"Non, sır, tovuq"),
    _item("light","Brokkolı Salat",22000,"Brokkolı, zeytun mayı, limon"),
    _item("light","Tom Yum Shorva",30000,"Balıq, limon, kókat"),
    _item("light","Qovoq Fritter",15000,"Oshqovoq, un, tuxum"),
    # Drinks
    _item("drinks","Qara Chay",10000,"Chay japıraǵı, suw"),
    _item("drinks","Kók Chay",10000,"Kók chay japıraǵı, suw"),
    _item("drinks","Miyweli Sok (1L)",25000,"Alma, qumsheker"),
    _item("drinks","Suw (0.5L)",5000,"Suw"),
    _item("drinks","Suw (1L)",8000,"Suw"),
    _item("drinks","Kofe (Americano)",22000,"Kofe, suw"),
    _item("drinks","Kapuçino",28000,"Espresso, sút"),
    _item("drinks","Latte",30000,"Espresso, sút, kóbik"),
    _item("drinks","Espresso",15000,"Kofe"),
    _item("drinks","Matcha Latte",35000,"Matcha, sút"),
    _item("drinks","Limonada",20000,"Limon, shakar, suw"),
    _item("drinks","Apelsin Soki",25000,"Apelsin"),
    _item("drinks","Mango Soki",28000,"Mango, suw"),
    _item("drinks","Nar Soki",30000,"Nar"),
    _item("drinks","Ayran",12000,"Qatıq, suw, duz"),
    _item("drinks","Kefir",12000,"Sút"),
    _item("drinks","Kompot",15000,"Miyweler, shakar, suw"),
    _item("drinks","Sut (stakan)",10000,"Sút"),
    _item("drinks","Smoothie (Mango)",35000,"Mango, banan, sút"),
    _item("drinks","Milkshake (Shokolad)",40000,"Shokolad, sút, muzqaymoq"),
    _item("drinks","Kokaçay",15000,"Qara chay, kókat"),
    _item("drinks","Zanjabil Chay",15000,"Zanjabil, chay, bal"),
    _item("drinks","Yashil Chay",10000,"Yashil chay japıraǵı"),
    _item("drinks","Lavanda Latte",32000,"Lavanda, sút, espresso"),
    _item("drinks","Shokolad Kofe",30000,"Shokolad, kofe, sút"),
    _item("drinks","Istıq Shokolad",28000,"Shokolad, sút"),
    _item("drinks","Chai Latte",22000,"Chay, sút, ziravor"),
    _item("drinks","Limon Chay",12000,"Chay, limon, bal"),
    _item("drinks","Qara Smordina Kompot",15000,"Smordina, shakar, suw"),
    _item("drinks","Gazlı Suw",8000,"Suw, gaz"),
    # Desserts
    _item("desserts","Chak-chak",20000,"Un, tuxum, bal"),
    _item("desserts","Navvot",15000,"Shakar, suw"),
    _item("desserts","Qandolat",10000,"Shakar"),
    _item("desserts","Tort (Tilim)",35000,"Un, krem, miywalar"),
    _item("desserts","Brownie",25000,"Shokolad, un, tuxum, may"),
    _item("desserts","Tiramisu",45000,"Maskarpone, kofe, un"),
    _item("desserts","Panna Cotta",35000,"Sút, shakar, jelatin"),
    _item("desserts","Wafle",20000,"Un, tuxum, may"),
    _item("desserts","Donut",15000,"Un, may, shakar"),
    _item("desserts","Meva Salati",25000,"Miyweler, bal"),
    _item("desserts","Muzqaymoq (Qaysı)",20000,"Sút, shakar, qaysı"),
    _item("desserts","Shokolad Muzqaymoq",22000,"Shokolad, sút, shakar"),
    _item("desserts","Kremalı Tort",38000,"Un, krem, shokolad"),
    _item("desserts","Medovik",35000,"Un, bal, krem"),
    _item("desserts","Qovoq Halva",18000,"Oshqovoq, may, shakar"),
    # Games
    _item("games","Monopoliya",0,"2-6 adam",True,True,2),
    _item("games","Uno",0,"2-10 adam",True,True,2),
    _item("games","Jenga",0,"2-4 adam",True,True,2),
    _item("games","Twister",0,"2-6 adam",True,True,2),
    _item("games","Maffiya",0,"6-12 adam",True,True,6),
]


async def seed_menu():
    count = await db.menu_items.count_documents({})
    if count > 0:
        return
    await db.menu_items.insert_many(SEED_ITEMS)
    logger.info(f"Menu seeded with {len(SEED_ITEMS)} items")


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await seed_menu()
    logger.info("Application started")


@app.on_event("shutdown")
async def shutdown():
    client.close()
