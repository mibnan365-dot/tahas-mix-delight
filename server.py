"""Taha's Mix Delight: SQLite-backed storefront API with customer and admin roles."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from contextlib import closing
from email.utils import formatdate
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))


def load_local_env() -> None:
    try:
        with open(os.path.join(ROOT, ".env"), encoding="utf-8") as env_file:
            for line in env_file:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip().strip("\"'"))
    except FileNotFoundError:
        pass


load_local_env()
DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(ROOT, "taha-store.sqlite3"))
PORT = int(os.environ.get("PORT", "8000"))
SESSION_SECRET = os.environ.get("SESSION_SECRET", "")
COOKIE_NAME = "taha_session"
SESSION_TTL = 60 * 60 * 24 * 14
ALLOWED_STATUSES = {
    "pending", "confirmed", "processing", "preparing", "ready_for_delivery",
    "out_for_delivery", "delivered", "cancelled",
}
RATE_LOCK = threading.Lock()
RATE_LIMITS: dict[tuple[str, str], list[float]] = {}
STORE_CONTENT_DEFAULTS = {
    "hero_image": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1800&q=82",
    "announcement_en": "Discover something delicious · Made with love, delivered with care",
    "announcement_bn": "নতুন কিছু মজার আবিষ্কার করুন · যত্নে তৈরি, ভালোবাসায় পৌঁছে দিই",
    "hero_eyebrow_en": "A LITTLE SOMETHING FOR EVERY OCCASION",
    "hero_eyebrow_bn": "প্রতিটি বিশেষ মুহূর্তের জন্য",
    "hero_title_en": "A world of delicious delights.",
    "hero_title_bn": "আনন্দের দুনিয়ায় একটুখানি মিষ্টি।",
    "hero_description_en": "From made-with-love cakes to thoughtful gift boxes, find a little something for every kind of moment.",
    "hero_description_bn": "ভালোবাসায় তৈরি কেক থেকে ভাবনাভরা উপহার — প্রতিটি মুহূর্তের জন্য ছোট্ট কিছু।",
    "categories_eyebrow_en": "FIND YOUR LITTLE DELIGHT",
    "categories_eyebrow_bn": "আপনার পছন্দের আয়োজন খুঁজুন",
    "categories_title_en": "Something for every craving.",
    "categories_title_bn": "প্রতিটি ইচ্ছের জন্য কিছু না কিছু।",
    "categories_description_en": "A good day, a celebration, or just because — there’s something for that.",
    "categories_description_bn": "বিশেষ দিন হোক, বা শুধুই নিজের জন্য — পছন্দের কিছু আছেই।",
    "featured_eyebrow_en": "THE GOOD STUFF",
    "featured_eyebrow_bn": "সবার পছন্দের",
    "featured_title_en": "A few crowd favourites.",
    "featured_title_bn": "কিছু সবার ভালোবাসার।",
    "gift_title_en": "Little gifts, big feelings.",
    "gift_title_bn": "ছোট্ট উপহার, অনেকখানি ভালোবাসা।",
    "gift_description_en": "The loveliest way to say “I thought of you.”",
    "gift_description_bn": "“তোমার কথা ভেবেছি” বলার সুন্দর এক উপায়।",
    "about_title_en": "A little sweetness, made with love.",
    "about_title_bn": "ভালোবাসায় তৈরি একটুখানি মিষ্টি।",
    "about_description_en": "We believe the smallest treats can make the biggest moments. Taha’s Mix Delight brings a little thoughtfulness to your celebrations, your gifts, and your everydays.",
    "about_description_bn": "ছোট্ট আয়োজনেও বড় আনন্দ থাকে। Taha’s Mix Delight আপনার বিশেষ দিন, উপহার আর প্রতিদিনের মুহূর্তে নিয়ে আসে একটুখানি ভালোবাসা।",
    "about_story_en": "Behind every little delight are thoughtful hands, a little time, and lots of love for making small moments feel special.",
    "about_story_bn": "প্রতিটি আয়োজনের পেছনে আছে সময়, যত্ন এবং ছোট্ট মুহূর্তকে বিশেষ করে তোলার ভালোবাসা।",
    "footer_tagline_en": "Every bite, a little delight.",
    "footer_tagline_bn": "প্রতিটি কামড়ে একটু আনন্দ।",
    "newsletter_title_en": "A lovely note from us, now and then.",
    "newsletter_title_bn": "মাঝে মাঝে আমাদের একটি সুন্দর চিঠি।",
    "newsletter_description_en": "New treats, seasonal surprises & the occasional sweet deal.",
    "newsletter_description_bn": "নতুন আয়োজন, ঋতুর চমক আর মিষ্টি অফার।",
}
DEMO_CATEGORIES = [
    ("bakery-cakes", "Bakery & Cakes", "বেকারি ও কেক", "photo-1578985545062-69928b1d9587"),
    ("chocolate", "Chocolates & Sweets", "চকলেট ও মিষ্টি", "photo-1548907040-4d42faa6b7f0"),
    ("gifts", "Gifting & Hampers", "উপহার ও হ্যাম্পার", "photo-1549465220-1a8b9238cd48"),
    ("brownies", "Brownies & Cookies", "ব্রাউনি ও কুকিজ", "photo-1606313564200-e75d5e30476c"),
]
DEMO_PRODUCTS = [
    ("chocolate-dream-cake", "Chocolate Dream Cake", "চকলেট ড্রিম কেক", "A sample listing for a rich, celebration-ready chocolate cake. Update this description with your real product details.", "উদাহরণ পণ্য। বিক্রির আগে আসল পণ্যের বিবরণ দিয়ে আপডেট করুন।", "bakery-cakes", 1450, "photo-1578985545062-69928b1d9587", 8, 1, 1, [{"name": "Size", "options": [{"name": "1 pound", "price": 1450, "stock": 4}, {"name": "2 pounds", "price": 2650, "stock": 4}]}], "Made to order; confirm preparation time with the shop.", "", ""),
    ("strawberry-celebration-cake", "Strawberry Celebration Cake", "স্ট্রবেরি সেলিব্রেশন কেক", "Sample catalog content. Replace with verified flavour, preparation and storage information.", "নমুনা ক্যাটালগ। আসল তথ্য দিয়ে আপডেট করুন।", "bakery-cakes", 1650, "photo-1535141192574-5d4897c12636", 6, 1, 1, [{"name": "Size", "options": [{"name": "1 pound", "price": 1650, "stock": 3}, {"name": "2 pounds", "price": 3050, "stock": 3}]}], "Preparation time confirmed after ordering.", "", ""),
    ("fudge-brownie-box", "Fudge Brownie Box", "ফাজ ব্রাউনি বক্স", "A sample product listing. Enter the correct piece count, ingredients, allergens and storage details before taking orders.", "নমুনা পণ্য। অর্ডার নেওয়ার আগে সঠিক তথ্য যোগ করুন।", "brownies", 680, "photo-1606313564200-e75d5e30476c", 18, 1, 1, [{"name": "Box size", "options": [{"name": "4 pieces", "price": 380, "stock": 9}, {"name": "8 pieces", "price": 680, "stock": 9}]}], "Sample preparation information.", "", ""),
    ("celebration-cupcakes", "Celebration Cupcakes", "সেলিব্রেশন কাপকেক", "Sample listing. Confirm varieties, ingredients and allergen information before publishing.", "নমুনা পণ্য। প্রকাশের আগে পণ্যের বিবরণ নিশ্চিত করুন।", "bakery-cakes", 920, "photo-1486427944299-d1955d23e34d", 12, 0, 0, [{"name": "Pack", "options": [{"name": "4 cupcakes", "price": 500, "stock": 6}, {"name": "8 cupcakes", "price": 920, "stock": 6}]}], "Sample preparation information.", "", ""),
    ("assorted-chocolate-box", "Assorted Chocolate Box", "অ্যাসর্টেড চকলেট বক্স", "A sample gift-box listing. Add verified contents, allergens, and storage instructions.", "নমুনা পণ্য। প্রকৃত উপকরণ ও অ্যালার্জির তথ্য যোগ করুন।", "chocolate", 1150, "photo-1548907040-4d42faa6b7f0", 10, 1, 1, [{"name": "Box", "options": [{"name": "Small", "price": 650, "stock": 5}, {"name": "Large", "price": 1150, "stock": 5}]}], "Storage and shelf life not yet supplied.", "", ""),
    ("cookie-gift-box", "Little Cookie Gift Box", "লিটল কুকি গিফট বক্স", "A sample gift listing. Replace this description with accurate contents and packing details.", "নমুনা পণ্য। আসল পণ্যের তথ্য দিয়ে আপডেট করুন।", "gifts", 850, "photo-1549465220-1a8b9238cd48", 8, 0, 1, [{"name": "Size", "options": [{"name": "Small", "price": 850, "stock": 4}, {"name": "Generous", "price": 1450, "stock": 4}]}], "Sample preparation information.", "", ""),
    ("classic-butter-cookies", "Classic Butter Cookies", "ক্লাসিক বাটার কুকিজ", "Demo catalog content. Add the real recipe, allergens and storage details before publishing.", "নমুনা পণ্য। প্রকাশের আগে প্রকৃত তথ্য যোগ করুন।", "brownies", 420, "photo-1499636136210-6f4ee915583e", 20, 0, 0, [{"name": "Pack", "options": [{"name": "Small", "price": 420, "stock": 10}, {"name": "Share pack", "price": 760, "stock": 10}]}], "Sample preparation information.", "", ""),
    ("thoughtful-gift-hamper", "A Thoughtful Gift Hamper", "আ থটফুল গিফট হ্যাম্পার", "A sample hamper listing. Replace with a verified, up-to-date list of hamper contents.", "নমুনা পণ্য। হ্যাম্পারের উপকরণের তালিকা নিশ্চিত করুন।", "gifts", 2100, "photo-1512909006721-3d6018887383", 5, 1, 1, [{"name": "Wrap", "options": [{"name": "Classic", "price": 2100, "stock": 3}, {"name": "Gift wrapped", "price": 2350, "stock": 2}]}], "Sample preparation information.", "", ""),
    ("mango-cloud-cake", "Mango Cloud Cake", "ম্যাঙ্গো ক্লাউড কেক", "Sample seasonal cake listing. Confirm the real flavour, ingredients, allergens and availability before publishing.", "নমুনা মৌসুমি কেক। প্রকাশের আগে আসল স্বাদ, উপকরণ, অ্যালার্জি এবং প্রাপ্যতা নিশ্চিত করুন।", "bakery-cakes", 1750, "photo-1565958011703-44f9829ba187", 6, 1, 0, [{"name": "Size", "options": [{"name": "1 pound", "price": 1750, "stock": 3}, {"name": "2 pounds", "price": 3200, "stock": 3}]}], "Sample preparation information; confirm lead time with the shop.", "", ""),
    ("vanilla-party-cupcakes", "Vanilla Party Cupcakes", "ভ্যানিলা পার্টি কাপকেক", "Demo listing for a party cupcake box. Replace with accurate flavours, ingredients and allergen details.", "পার্টি কাপকেকের নমুনা। প্রকৃত স্বাদ, উপকরণ এবং অ্যালার্জির তথ্য দিয়ে আপডেট করুন।", "bakery-cakes", 780, "photo-1486427944299-d1955d23e34d", 16, 0, 0, [{"name": "Pack", "options": [{"name": "4 cupcakes", "price": 420, "stock": 8}, {"name": "8 cupcakes", "price": 780, "stock": 8}]}], "Sample preparation information.", "", ""),
    ("dark-chocolate-truffles", "Dark Chocolate Truffles", "ডার্ক চকলেট ট্রাফল", "Demo listing for a small-batch chocolate box. Confirm the box contents, ingredients, allergens and storage details before launch.", "ছোট বক্সের চকলেটের নমুনা। বিক্রির আগে বক্সের উপকরণ, অ্যালার্জি এবং সংরক্ষণের তথ্য নিশ্চিত করুন।", "chocolate", 950, "photo-1548907040-4d42faa6b7f0", 12, 0, 1, [{"name": "Box", "options": [{"name": "6 pieces", "price": 650, "stock": 6}, {"name": "12 pieces", "price": 950, "stock": 6}]}], "Sample storage and preparation information.", "", ""),
    ("chocolate-chip-cookie-box", "Chocolate Chip Cookie Box", "চকলেট চিপ কুকি বক্স", "Sample cookie-box listing. Add verified ingredient, allergen and freshness information before accepting orders.", "কুকি বক্সের নমুনা। অর্ডার নেওয়ার আগে উপকরণ, অ্যালার্জি এবং সতেজতার তথ্য নিশ্চিত করুন।", "brownies", 540, "photo-1499636136210-6f4ee915583e", 20, 0, 0, [{"name": "Pack", "options": [{"name": "6 cookies", "price": 540, "stock": 10}, {"name": "12 cookies", "price": 980, "stock": 10}]}], "Sample preparation information.", "", ""),
]


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH, timeout=15)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA journal_mode=WAL")
    return db


def hash_password(password: str, salt: bytes | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_bytes(16)
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000).hex(), salt.hex()


def hash_token(token: str) -> str:
    if SESSION_SECRET:
        return hmac.new(SESSION_SECRET.encode(), token.encode(), hashlib.sha256).hexdigest()
    return hashlib.sha256(token.encode()).hexdigest()


def now() -> int:
    return int(time.time())


def initialize() -> None:
    with closing(connect()) as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                name TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer'
                    CHECK(role IN ('customer','admin')), created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE,
                name_en TEXT NOT NULL, name_bn TEXT NOT NULL DEFAULT '',
                description_en TEXT NOT NULL DEFAULT '', description_bn TEXT NOT NULL DEFAULT '',
                image TEXT NOT NULL DEFAULT '', parent_id INTEGER REFERENCES categories(id),
                featured INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
                sort_order INTEGER NOT NULL DEFAULT 0, demo INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE,
                name_en TEXT NOT NULL, name_bn TEXT NOT NULL DEFAULT '',
                description_en TEXT NOT NULL DEFAULT '', description_bn TEXT NOT NULL DEFAULT '',
                category_id INTEGER NOT NULL REFERENCES categories(id),
                sku TEXT NOT NULL UNIQUE, price INTEGER NOT NULL CHECK(price >= 0),
                sale_price INTEGER CHECK(sale_price IS NULL OR (sale_price >= 0 AND sale_price <= price)),
                image TEXT NOT NULL DEFAULT '', images TEXT NOT NULL DEFAULT '[]',
                variants TEXT NOT NULL DEFAULT '[]', attributes TEXT NOT NULL DEFAULT '{}',
                stock INTEGER CHECK(stock IS NULL OR stock >= 0), low_stock_threshold INTEGER NOT NULL DEFAULT 5,
                made_to_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
                featured INTEGER NOT NULL DEFAULT 0, bestseller INTEGER NOT NULL DEFAULT 0,
                demo INTEGER NOT NULL DEFAULT 0, prep_time TEXT NOT NULL DEFAULT '',
                ingredients TEXT NOT NULL DEFAULT '', allergens TEXT NOT NULL DEFAULT '',
                storage TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]',
                rating REAL NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT NOT NULL UNIQUE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                customer_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
                address TEXT NOT NULL, city TEXT NOT NULL, area TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
                payment_method TEXT NOT NULL DEFAULT 'cod', payment_status TEXT NOT NULL DEFAULT 'pending',
                subtotal INTEGER NOT NULL, delivery_fee INTEGER NOT NULL,
                discount INTEGER NOT NULL DEFAULT 0, coupon_code TEXT NOT NULL DEFAULT '',
                total INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
                product_name_en TEXT NOT NULL, product_name_bn TEXT NOT NULL DEFAULT '',
                variant_name TEXT NOT NULL DEFAULT '', unit_price INTEGER NOT NULL, quantity INTEGER NOT NULL,
                line_total INTEGER NOT NULL, snapshot TEXT NOT NULL DEFAULT '{}'
            );
            CREATE TABLE IF NOT EXISTS custom_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
                options TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'submitted',
                quote INTEGER, admin_note TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS delivery_zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT, city TEXT NOT NULL, area TEXT NOT NULL DEFAULT '*',
                fee INTEGER NOT NULL CHECK(fee >= 0), active INTEGER NOT NULL DEFAULT 1,
                UNIQUE(city,area)
            );
            CREATE TABLE IF NOT EXISTS coupons (
                code TEXT PRIMARY KEY COLLATE NOCASE, kind TEXT NOT NULL CHECK(kind IN ('percent','amount')),
                value INTEGER NOT NULL CHECK(value >= 0), min_subtotal INTEGER NOT NULL DEFAULT 0,
                max_uses INTEGER, used_count INTEGER NOT NULL DEFAULT 0,
                expires_at INTEGER, active INTEGER NOT NULL DEFAULT 1, demo INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS wishlist (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                created_at INTEGER NOT NULL, PRIMARY KEY(user_id,product_id)
            );
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), body TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
                created_at INTEGER NOT NULL, UNIQUE(product_id,user_id,order_id)
            );
            CREATE TABLE IF NOT EXISTS newsletter (
                email TEXT PRIMARY KEY COLLATE NOCASE, created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY, value TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS products_by_category ON products(category_id,active,featured);
            CREATE INDEX IF NOT EXISTS orders_by_created ON orders(created_at DESC);
            CREATE INDEX IF NOT EXISTS orders_by_user ON orders(user_id,created_at DESC);
            CREATE INDEX IF NOT EXISTS order_items_by_order ON order_items(order_id);
            CREATE INDEX IF NOT EXISTS requests_by_status ON custom_requests(status,created_at DESC);
            CREATE INDEX IF NOT EXISTS sessions_by_expiry ON sessions(expires_at);
            CREATE INDEX IF NOT EXISTS reviews_by_product ON reviews(product_id,status,created_at DESC);
        """)
        user_columns = {row["name"] for row in db.execute("PRAGMA table_info(users)")}
        if "role" not in user_columns:
            db.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'")
        if "name" not in user_columns:
            db.execute("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''")
        for index, (slug, name_en, name_bn, image_id) in enumerate(DEMO_CATEGORIES):
            db.execute(
                "INSERT OR IGNORE INTO categories(slug,name_en,name_bn,image,featured,active,sort_order,demo) VALUES(?,?,?,?,1,1,?,1)",
                (slug, name_en, name_bn, "https://images.unsplash.com/" + image_id + "?auto=format&fit=crop&w=900&q=82", index),
            )
        category_ids = {row["slug"]: row["id"] for row in db.execute("SELECT id,slug FROM categories")}
        for item in DEMO_PRODUCTS:
            (slug, name_en, name_bn, desc_en, desc_bn, category_slug, price, image_id,
             stock, featured, bestseller, variants, prep_time, ingredients, allergens) = item
            db.execute(
                "INSERT OR IGNORE INTO products(slug,name_en,name_bn,description_en,description_bn,category_id,sku,price,image,images,variants,stock,made_to_order,active,featured,bestseller,demo,prep_time,ingredients,allergens,created_at,updated_at) "
                "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,1,?,?,?,?,?,?,?,?)",
                (slug, name_en, name_bn, desc_en, desc_bn, category_ids[category_slug], "DEMO-" + slug.upper()[:24],
                 price, "https://images.unsplash.com/" + image_id + "?auto=format&fit=crop&w=1000&q=85",
                 json.dumps(["https://images.unsplash.com/" + image_id + "?auto=format&fit=crop&w=1200&q=85"]),
                 json.dumps(variants), stock, featured, bestseller, 1, prep_time, ingredients, allergens, now(), now()),
            )
        db.execute("INSERT OR IGNORE INTO settings(key,value) VALUES('delivery_fee_default','80')")
        db.execute("INSERT OR IGNORE INTO settings(key,value) VALUES('delivery_zones_demo','1')")
        db.execute("INSERT OR IGNORE INTO settings(key,value) VALUES('store_name',?)", ("Taha's Mix Delight",))
        db.execute(
            "INSERT OR IGNORE INTO coupons(code,kind,value,min_subtotal,max_uses,expires_at,active,demo) "
            "VALUES('DEMO10','percent',10,0,NULL,NULL,1,1)"
        )
        if not db.execute("SELECT 1 FROM delivery_zones LIMIT 1").fetchone():
            db.executemany(
                "INSERT OR IGNORE INTO delivery_zones(city,area,fee,active) VALUES(?,?,?,1)",
                [("Dhaka", "*", 80), ("Chattogram", "*", 120), ("Chittagong", "*", 120)],
            )
        db.commit()
    seed_admin()


def seed_admin() -> None:
    email = os.environ.get("TAHA_ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("TAHA_ADMIN_PASSWORD", "")
    if not email or not password:
        return
    if len(password) < 14:
        raise RuntimeError("TAHA_ADMIN_PASSWORD must contain at least 14 characters.")
    digest, salt = hash_password(password)
    with closing(connect()) as db:
        existing = db.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
        if existing:
            db.execute("UPDATE users SET role='admin' WHERE id=?", (existing["id"],))
        else:
            db.execute("INSERT INTO users(email,name,password_hash,password_salt,role,created_at) VALUES(?,?,?,?,?,?)",
                       (email, "Store owner", digest, salt, "admin", now()))
        db.commit()


def clean(value: object, limit: int = 500) -> str:
    return " ".join(str(value or "").split())[:limit]


def valid_phone(value: object) -> str:
    phone = re.sub(r"[\s()-]", "", str(value or ""))
    if phone.startswith("+880"):
        phone = "0" + phone[4:]
    elif phone.startswith("880"):
        phone = "0" + phone[3:]
    if not re.fullmatch(r"01[3-9]\d{8}", phone):
        raise ValueError("Enter a valid Bangladesh mobile number (01XXXXXXXXX).")
    return phone


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return (slug or "item")[:70] + "-" + secrets.token_hex(3)


def safe_image(value: object) -> str:
    url = str(value or "").strip()
    if len(url) > 1200 or url and not url.startswith(("https://", "http://localhost:", "http://127.0.0.1:")):
        raise ValueError("Product images must use HTTPS.")
    return url


def decode_json(value: object, fallback: object) -> object:
    try:
        return json.loads(value) if value else fallback
    except (ValueError, TypeError):
        return fallback


def product_json(row: sqlite3.Row) -> dict:
    result = dict(row)
    for key, fallback in (("images", []), ("variants", []), ("attributes", {}), ("tags", [])):
        result[key] = decode_json(result.get(key), fallback)
    return result


def product_rows(db: sqlite3.Connection, where: str = "", parameters: tuple = ()) -> list[dict]:
    sql = ("SELECT p.*,c.name_en AS category_name_en,c.name_bn AS category_name_bn,c.slug AS category_slug,"
           "COALESCE(rv.rating,0) AS rating,COALESCE(rv.review_count,0) AS review_count "
           "FROM products p JOIN categories c ON c.id=p.category_id "
           "LEFT JOIN (SELECT product_id,ROUND(AVG(rating),1) AS rating,COUNT(*) AS review_count "
           "FROM reviews WHERE status='approved' GROUP BY product_id) rv ON rv.product_id=p.id")
    if where:
        sql += " WHERE " + where
    sql += " ORDER BY p.featured DESC,p.created_at DESC,p.id DESC"
    return [product_json(row) for row in db.execute(sql, parameters).fetchall()]


def rate_limit(handler: BaseHTTPRequestHandler, scope: str, limit: int = 8, window: int = 900) -> None:
    client = handler.client_address[0]
    current = time.time()
    key = (client, scope)
    with RATE_LOCK:
        attempts = [stamp for stamp in RATE_LIMITS.get(key, []) if current - stamp < window]
        if len(attempts) >= limit:
            raise PermissionError("Too many attempts. Please wait a few minutes and try again.")
        attempts.append(current)
        RATE_LIMITS[key] = attempts


class Handler(BaseHTTPRequestHandler):
    server_version = "TahaStore/1.0"

    def log_message(self, _format: str, *_args: object) -> None:
        return

    def send_json(self, status: int, payload: object, extra_headers: dict[str, str] | None = None) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "DENY")
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def no_content(self) -> None:
        self.send_response(204)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def body(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 1_000_000:
                raise ValueError("Request body is too large.")
            data = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(data, dict):
                raise ValueError("Expected a JSON object.")
            return data
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as error:
            raise ValueError(str(error) or "Invalid request body.") from error

    def guard_origin(self) -> None:
        origin = self.headers.get("Origin")
        if not origin:
            return
        allowed = os.environ.get("ALLOWED_ORIGIN", "")
        if not allowed:
            allowed = os.environ.get("PUBLIC_ORIGIN", "http://localhost:5173")
        allowed_origins = {allowed}
        if "PUBLIC_ORIGIN" not in os.environ:
            allowed_origins.add("http://127.0.0.1:5173")
        if origin not in allowed_origins:
            self.close_connection = True
            raise PermissionError("This request origin is not allowed.")

    def token(self) -> str | None:
        jar = cookies.SimpleCookie()
        try:
            jar.load(self.headers.get("Cookie", ""))
            return jar[COOKIE_NAME].value
        except (KeyError, cookies.CookieError):
            return None

    def current_user(self) -> sqlite3.Row | None:
        token = self.token()
        if not token:
            return None
        with closing(connect()) as db:
            return db.execute(
                "SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id "
                "WHERE s.token_hash=? AND s.expires_at>?",
                (hash_token(token), now()),
            ).fetchone()

    def require_user(self) -> sqlite3.Row:
        user = self.current_user()
        if not user:
            raise PermissionError("Sign in to continue.")
        return user

    def require_admin(self) -> sqlite3.Row:
        user = self.require_user()
        if user["role"] != "admin":
            raise PermissionError("This area is for the shop owner.")
        return user

    def set_cookie(self, token: str, max_age: int = SESSION_TTL) -> None:
        cookie = f"{COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}"
        if os.environ.get("PUBLIC_ORIGIN", "").startswith("https://"):
            cookie += "; Secure"
        self.send_header("Set-Cookie", cookie)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        try:
            if path == "/api/health":
                self.send_json(200, {"ok": True, "database": "sqlite", "payments": ["cod"]})
            elif path == "/api/categories":
                with closing(connect()) as db:
                    rows = db.execute("SELECT * FROM categories WHERE active=1 ORDER BY sort_order,id").fetchall()
                self.send_json(200, [dict(row) for row in rows])
            elif path == "/api/products":
                with closing(connect()) as db:
                    rows = product_rows(db, "p.active=1 AND c.active=1")
                self.send_json(200, rows)
            elif path.startswith("/api/products/") and path.endswith("/reviews"):
                try:
                    product_id = int(path[len("/api/products/"):-len("/reviews")].strip("/"))
                except ValueError as error:
                    raise ValueError("Invalid product identifier.") from error
                with closing(connect()) as db:
                    rows = db.execute(
                        "SELECT r.id,r.rating,r.body,r.created_at,u.name FROM reviews r "
                        "JOIN users u ON u.id=r.user_id WHERE r.product_id=? AND r.status='approved' "
                        "ORDER BY r.created_at DESC LIMIT 50", (product_id,),
                    ).fetchall()
                self.send_json(200, [dict(row) for row in rows])
            elif path == "/api/config":
                with closing(connect()) as db:
                    zones = [dict(row) for row in db.execute("SELECT city,area,fee FROM delivery_zones WHERE active=1 ORDER BY city,area")]
                self.send_json(200, {"delivery_zones": zones, "payment_methods": ["cod"],
                                     "timezone": "Asia/Dhaka", "currency": "BDT"})
            elif path == "/api/content":
                with closing(connect()) as db:
                    content = dict(STORE_CONTENT_DEFAULTS)
                    content.update({row["key"]: row["value"] for row in db.execute(
                        "SELECT key,value FROM settings WHERE key IN (" +
                        ",".join("?" for _ in STORE_CONTENT_DEFAULTS) + ")",
                        tuple(STORE_CONTENT_DEFAULTS),
                    )})
                self.send_json(200, content)
            elif path == "/api/me":
                user = self.require_user()
                self.send_json(200, {"user": dict(user)})
            elif path == "/api/orders/mine":
                user = self.require_user()
                with closing(connect()) as db:
                    rows = db.execute("SELECT order_number,status,payment_status,total,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100", (user["id"],)).fetchall()
                self.send_json(200, [dict(row) for row in rows])
            elif path == "/api/wishlist":
                user = self.require_user()
                with closing(connect()) as db:
                    ids = [row["product_id"] for row in db.execute(
                        "SELECT product_id FROM wishlist WHERE user_id=? ORDER BY created_at DESC", (user["id"],))]
                self.send_json(200, ids)
            elif path == "/api/admin/dashboard":
                self.admin_dashboard()
            elif path == "/api/admin/categories":
                self.require_admin()
                with closing(connect()) as db:
                    self.send_json(200, [dict(row) for row in db.execute("SELECT * FROM categories ORDER BY sort_order,id")])
            elif path == "/api/admin/products":
                self.require_admin()
                with closing(connect()) as db:
                    self.send_json(200, product_rows(db))
            elif path == "/api/admin/settings":
                self.require_admin()
                with closing(connect()) as db:
                    settings = {row["key"]: row["value"] for row in db.execute("SELECT key,value FROM settings")}
                    zones = [dict(row) for row in db.execute("SELECT * FROM delivery_zones ORDER BY city,area")]
                    content = dict(STORE_CONTENT_DEFAULTS)
                    content.update({key: settings[key] for key in STORE_CONTENT_DEFAULTS if key in settings})
                    self.send_json(200, {"settings": settings, "delivery_zones": zones, "content": content})
            elif path == "/api/admin/coupons":
                self.require_admin()
                with closing(connect()) as db:
                    coupons = [dict(row) for row in db.execute("SELECT * FROM coupons ORDER BY code")]
                self.send_json(200, coupons)
            elif path == "/api/admin/reviews":
                self.require_admin()
                with closing(connect()) as db:
                    reviews = [dict(row) for row in db.execute(
                        "SELECT r.id,r.product_id,r.rating,r.body,r.status,r.created_at,p.name_en AS product_name,u.name AS customer_name "
                        "FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id "
                        "ORDER BY r.created_at DESC LIMIT 100")]
                self.send_json(200, reviews)
            else:
                self.send_json(404, {"error": "Not found."})
        except PermissionError as error:
            self.send_json(401 if str(error) == "Sign in to continue." else 403, {"error": str(error)})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
        except sqlite3.Error:
            self.send_json(500, {"error": "The store database could not complete this request."})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            self.guard_origin()
            data = self.body()
            if path in ("/api/auth/signup", "/api/auth/login"):
                self.authenticate(path.rsplit("/", 1)[-1], data)
            elif path == "/api/auth/logout":
                token = self.token()
                if token:
                    with closing(connect()) as db:
                        db.execute("DELETE FROM sessions WHERE token_hash=?", (hash_token(token),))
                        db.commit()
                self.send_response(204)
                self.set_cookie("", 0)
                self.end_headers()
            elif path == "/api/orders":
                self.create_order(data)
            elif path.startswith("/api/wishlist/"):
                user = self.require_user()
                product_id = int(path.rsplit("/", 1)[-1])
                with closing(connect()) as db:
                    if not db.execute("SELECT 1 FROM products WHERE id=? AND active=1", (product_id,)).fetchone():
                        self.send_json(404, {"error": "Product not found."})
                        return
                    db.execute("INSERT OR IGNORE INTO wishlist(user_id,product_id,created_at) VALUES(?,?,?)",
                               (user["id"], product_id, now()))
                    db.commit()
                self.send_json(200, {"product_id": product_id, "saved": True})
            elif path == "/api/track":
                self.track_order(data)
            elif path == "/api/custom-requests":
                self.create_custom_request(data)
            elif path.startswith("/api/products/") and path.endswith("/reviews"):
                self.create_review(path, data)
            elif path == "/api/newsletter":
                email = str(data.get("email", "")).strip().lower()
                if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or len(email) > 254:
                    raise ValueError("Enter a valid email address.")
                with closing(connect()) as db:
                    db.execute("INSERT OR IGNORE INTO newsletter(email,created_at) VALUES(?,?)", (email, now()))
                    db.commit()
                self.send_json(201, {"ok": True})
            elif path == "/api/admin/categories":
                self.require_admin()
                self.create_category(data)
            elif path == "/api/admin/products":
                self.require_admin()
                self.create_product(data)
            elif path == "/api/admin/coupons":
                self.require_admin()
                self.create_coupon(data)
            elif path == "/api/admin/delivery-zones":
                self.require_admin()
                self.create_delivery_zone(data)
            else:
                self.send_json(404, {"error": "Not found."})
        except PermissionError as error:
            message = str(error)
            status = 429 if "Too many" in message else 401 if message == "Sign in to continue." or message.startswith("That email or password") else 403
            self.send_json(status, {"error": message})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
        except sqlite3.IntegrityError:
            self.send_json(409, {"error": "That record already exists or refers to an unavailable item."})
        except sqlite3.Error:
            self.send_json(500, {"error": "The store database could not complete this request."})

    def do_PATCH(self) -> None:
        path = urlparse(self.path).path
        try:
            self.guard_origin()
            self.require_admin()
            data = self.body()
            if path.startswith("/api/admin/orders/"):
                self.patch_order(path.rsplit("/", 1)[-1], data)
            elif path.startswith("/api/admin/custom-requests/"):
                self.patch_custom_request(path.rsplit("/", 1)[-1], data)
            elif path.startswith("/api/admin/products/"):
                self.patch_product(path.rsplit("/", 1)[-1], data)
            elif path.startswith("/api/admin/categories/"):
                self.patch_category(path.rsplit("/", 1)[-1], data)
            elif path.startswith("/api/admin/reviews/"):
                self.patch_review(path.rsplit("/", 1)[-1], data)
            elif path.startswith("/api/admin/coupons/"):
                self.patch_coupon(path.rsplit("/", 1)[-1], data)
            elif path.startswith("/api/admin/delivery-zones/"):
                self.patch_delivery_zone(path.rsplit("/", 1)[-1], data)
            elif path == "/api/admin/content":
                self.patch_store_content(data)
            else:
                self.send_json(404, {"error": "Not found."})
        except PermissionError as error:
            self.send_json(403 if "origin" in str(error).lower() or "owner" in str(error).lower() else 401, {"error": str(error)})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
        except sqlite3.IntegrityError:
            self.send_json(409, {"error": "That change conflicts with an existing record."})
        except sqlite3.Error:
            self.send_json(500, {"error": "The store database could not complete this request."})

    def do_DELETE(self) -> None:
        path = urlparse(self.path).path
        try:
            self.guard_origin()
            if path.startswith("/api/wishlist/"):
                user = self.require_user()
                product_id = int(path.rsplit("/", 1)[-1])
                with closing(connect()) as db:
                    db.execute("DELETE FROM wishlist WHERE user_id=? AND product_id=?", (user["id"], product_id))
                    db.commit()
                self.no_content()
                return
            self.require_admin()
            if path.startswith("/api/admin/products/"):
                product_id = int(path.rsplit("/", 1)[-1])
                with closing(connect()) as db:
                    changed = db.execute("UPDATE products SET active=0,updated_at=? WHERE id=?", (now(), product_id)).rowcount
                    db.commit()
                if not changed:
                    self.send_json(404, {"error": "Product not found."})
                else:
                    self.no_content()
                return
            if path.startswith("/api/admin/categories/"):
                category_id = int(path.rsplit("/", 1)[-1])
                with closing(connect()) as db:
                    changed = db.execute("UPDATE categories SET active=0 WHERE id=?", (category_id,)).rowcount
                    db.commit()
                if not changed:
                    self.send_json(404, {"error": "Category not found."})
                else:
                    self.no_content()
                return
            self.send_json(404, {"error": "Not found."})
        except PermissionError as error:
            self.send_json(403 if "origin" in str(error).lower() or "owner" in str(error).lower() else 401, {"error": str(error)})
        except (ValueError, sqlite3.Error) as error:
            self.send_json(400 if isinstance(error, ValueError) else 500,
                           {"error": str(error) if isinstance(error, ValueError) else "The store database could not complete this request."})

    def authenticate(self, action: str, data: dict) -> None:
        rate_limit(self, "auth-" + action, 8)
        email = str(data.get("email", "")).strip().lower()
        password = data.get("password", "")
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or len(email) > 254:
            raise ValueError("Enter a valid email address.")
        if not isinstance(password, str) or len(password) < 8 or len(password) > 1024:
            raise ValueError("Password must contain at least 8 characters.")
        with closing(connect()) as db:
            existing = db.execute("SELECT id,email,name,role,password_hash,password_salt FROM users WHERE email=?",
                                  (email,)).fetchone()
            if action == "signup":
                if existing:
                    self.send_json(409, {"error": "An account with this email already exists."})
                    return
                name = clean(data.get("name"), 100)
                if len(name) < 2:
                    raise ValueError("Enter your name.")
                digest, salt = hash_password(password)
                cursor = db.execute("INSERT INTO users(email,name,password_hash,password_salt,role,created_at) VALUES(?,?,?,?,?,?)",
                                    (email, name, digest, salt, "customer", now()))
                user_id = cursor.lastrowid
                role = "customer"
            else:
                if not existing:
                    raise PermissionError("That email or password wasn’t recognized.")
                digest, _ = hash_password(password, bytes.fromhex(existing["password_salt"]))
                if not hmac.compare_digest(digest, existing["password_hash"]):
                    raise PermissionError("That email or password wasn’t recognized.")
                user_id = existing["id"]
                name = existing["name"]
                role = existing["role"]
            token = secrets.token_urlsafe(36)
            db.execute("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
                       (hash_token(token), user_id, now() + SESSION_TTL))
            db.execute("DELETE FROM sessions WHERE expires_at<=?", (now(),))
            db.commit()
        self.send_response(201 if action == "signup" else 200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.set_cookie(token)
        self.end_headers()
        self.wfile.write(json.dumps({"user": {"id": user_id, "email": email, "name": name, "role": role},
                                     "created": now()}, ensure_ascii=False).encode())

    def create_category(self, data: dict) -> None:
        name_en = clean(data.get("name_en"), 120)
        name_bn = clean(data.get("name_bn"), 120)
        if not name_en:
            raise ValueError("A category name is required.")
        image = safe_image(data.get("image"))
        parent_id = data.get("parent_id")
        if parent_id is not None:
            parent_id = int(parent_id)
        with closing(connect()) as db:
            slug = slugify(name_en)
            cursor = db.execute("INSERT INTO categories(slug,name_en,name_bn,image,parent_id,featured,active,sort_order,demo) VALUES(?,?,?,?,?,?,1,?,0)",
                                (slug, name_en, name_bn, image, parent_id, int(bool(data.get("featured"))),
                                 int(data.get("sort_order", 99))))
            db.commit()
            row = db.execute("SELECT * FROM categories WHERE id=?", (cursor.lastrowid,)).fetchone()
        self.send_json(201, dict(row))

    def create_product(self, data: dict) -> None:
        name_en = clean(data.get("name_en"), 160)
        name_bn = clean(data.get("name_bn"), 160)
        if not name_en:
            raise ValueError("A product name is required.")
        try:
            price = int(data.get("price"))
            category_id = int(data.get("category_id"))
        except (TypeError, ValueError) as error:
            raise ValueError("Enter a valid price and category.") from error
        if price < 1 or price > 100_000_000:
            raise ValueError("Price must be between ৳1 and ৳100,000,000.")
        sale_price = data.get("sale_price")
        if sale_price not in (None, ""):
            try:
                sale_price = int(sale_price)
            except (TypeError, ValueError) as error:
                raise ValueError("Enter a valid sale price.") from error
            if sale_price < 1 or sale_price >= price:
                raise ValueError("A sale price must be lower than the regular price.")
        else:
            sale_price = None
        stock = data.get("stock")
        if stock is not None and stock != "":
            stock = int(stock)
            if stock < 0 or stock > 1_000_000:
                raise ValueError("Stock must be a non-negative quantity.")
        else:
            stock = None
        image = safe_image(data.get("image"))
        if not image:
            raise ValueError("A product photo URL is required.")
        variants = validate_variants(data.get("variants", []), price)
        attributes = data.get("attributes", {})
        if not isinstance(attributes, dict) or len(attributes) > 40:
            raise ValueError("Product attributes must be an object with no more than 40 values.")
        images = data.get("images", [image])
        if not isinstance(images, list) or len(images) > 12:
            raise ValueError("Add no more than 12 product images.")
        images = [safe_image(url) for url in images]
        desc_en = str(data.get("description_en", ""))[:5000]
        desc_bn = str(data.get("description_bn", ""))[:5000]
        with closing(connect()) as db:
            if not db.execute("SELECT 1 FROM categories WHERE id=? AND active=1", (category_id,)).fetchone():
                raise ValueError("Choose an active category.")
            slug = slugify(name_en)
            sku = clean(data.get("sku"), 80) or "TMD-" + secrets.token_hex(5).upper()
            cursor = db.execute(
                "INSERT INTO products(slug,name_en,name_bn,description_en,description_bn,category_id,sku,price,sale_price,image,images,variants,attributes,stock,made_to_order,active,featured,bestseller,demo,prep_time,ingredients,allergens,storage,tags,rating,created_at,updated_at) "
                "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,0,?,?,?,?,?,0,?,?)",
                (slug, name_en, name_bn, desc_en, desc_bn, category_id, sku, price, sale_price, image,
                 json.dumps(images), json.dumps(variants), json.dumps(attributes), stock,
                 int(bool(data.get("made_to_order"))) if stock is None else 0,
                 int(bool(data.get("featured"))), int(bool(data.get("bestseller"))),
                 clean(data.get("prep_time"), 200), clean(data.get("ingredients"), 1000),
                 clean(data.get("allergens"), 600), clean(data.get("storage"), 600),
                 json.dumps(data.get("tags", []) if isinstance(data.get("tags", []), list) else []), now(), now()),
            )
            db.commit()
            row = db.execute("SELECT p.*,c.name_en AS category_name_en,c.name_bn AS category_name_bn,c.slug AS category_slug FROM products p JOIN categories c ON p.category_id=c.id WHERE p.id=?",
                             (cursor.lastrowid,)).fetchone()
        self.send_json(201, product_json(row))

    def create_order(self, data: dict) -> None:
        rate_limit(self, "checkout", 15, 3600)
        customer = data.get("customer")
        items = data.get("items")
        if not isinstance(customer, dict) or not isinstance(items, list) or not items or len(items) > 30:
            raise ValueError("Add at least one item and complete your delivery details.")
        name = clean(customer.get("name"), 120)
        phone = valid_phone(customer.get("phone"))
        address = clean(customer.get("address"), 500)
        city = clean(customer.get("city"), 100)
        area = clean(customer.get("area"), 100)
        email = clean(customer.get("email"), 254).lower()
        if len(name) < 2 or len(address) < 5 or not city or not area:
            raise ValueError("Complete your name and delivery address.")
        if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            raise ValueError("Enter a valid email address.")
        if data.get("payment_method", "cod") != "cod":
            raise ValueError("Online payments are not configured yet. Choose cash on delivery.")
        user = self.current_user()
        order_number = "TMD-" + time.strftime("%y%m%d", time.gmtime(now() + 6 * 3600)) + "-" + secrets.token_hex(3).upper()
        with closing(connect()) as db:
            try:
                db.execute("BEGIN IMMEDIATE")
                delivery_fee = self.delivery_fee(db, city, area)
                subtotal = 0
                snapshots = []
                for item in items:
                    try:
                        product_id = int(item.get("product_id"))
                        quantity = int(item.get("quantity"))
                    except (TypeError, ValueError, AttributeError) as error:
                        raise ValueError("One of the cart items is invalid.") from error
                    if quantity < 1 or quantity > 50:
                        raise ValueError("Each quantity must be between 1 and 50.")
                    product = db.execute("SELECT * FROM products WHERE id=? AND active=1", (product_id,)).fetchone()
                    if not product:
                        raise ValueError("One of your selected products is no longer available.")
                    requested_options = item.get("variant", {})
                    variants = decode_json(product["variants"], [])
                    if isinstance(requested_options, str):
                        requested_options = decode_json(requested_options, requested_options)
                    if isinstance(requested_options, str) and variants:
                        requested_options = {variants[0]["name"]: requested_options}
                    if not isinstance(requested_options, dict):
                        raise ValueError(f"Choose valid options for {product['name_en']}.")
                    requested_options = {clean(key, 80): clean(value, 100) for key, value in requested_options.items()}
                    if variants and set(requested_options) != {variant.get("name") for variant in variants}:
                        raise ValueError(f"Choose an option for every attribute of {product['name_en']}.")
                    if not variants and requested_options:
                        raise ValueError(f"{product['name_en']} does not have variants.")
                    selected_choices = []
                    price = int(product["sale_price"] or product["price"])
                    for variant in variants:
                        variant_name = clean(variant.get("name"), 80)
                        option = next((value for value in variant.get("options", [])
                                       if value.get("name") == requested_options.get(variant_name)), None)
                        if not option:
                            raise ValueError(f"Choose a valid {variant_name} option for {product['name_en']}.")
                        selected_choices.append((variant_name, option))
                        if option.get("price") is not None:
                            price = int(option["price"])
                        price += int(option.get("price_adjustment", 0))
                    product_stock = product["stock"]
                    unavailable_choice = next(((name, option) for name, option in selected_choices
                                               if option.get("stock") is not None and quantity > int(option["stock"])), None)
                    if unavailable_choice:
                        raise ValueError(f"Not enough stock for {product['name_en']} ({unavailable_choice[0]}: {unavailable_choice[1]['name']}).")
                    if product_stock is not None and quantity > product_stock:
                        raise ValueError(f"Not enough stock for {product['name_en']}.")
                    subtotal += price * quantity
                    snapshots.append((product, price, quantity, selected_choices))
                if subtotal < 1:
                    raise ValueError("The order total must be greater than zero.")
                coupon_code = clean(data.get("coupon"), 40).upper()
                discount = 0
                coupon = None
                if coupon_code:
                    coupon = db.execute("SELECT * FROM coupons WHERE code=? COLLATE NOCASE AND active=1", (coupon_code,)).fetchone()
                    if not coupon or (coupon["expires_at"] and coupon["expires_at"] < now()):
                        raise ValueError("That coupon is invalid or has expired.")
                    if coupon["max_uses"] is not None and coupon["used_count"] >= coupon["max_uses"]:
                        raise ValueError("That coupon has already been used the maximum number of times.")
                    if subtotal < coupon["min_subtotal"]:
                        raise ValueError(f"Add items worth {coupon['min_subtotal']} BDT to use that coupon.")
                    discount = subtotal * coupon["value"] // 100 if coupon["kind"] == "percent" else coupon["value"]
                    discount = min(discount, subtotal)
                total = subtotal + delivery_fee - discount
                cursor = db.execute(
                    "INSERT INTO orders(order_number,user_id,customer_name,phone,email,address,city,area,note,status,payment_method,payment_status,subtotal,delivery_fee,discount,coupon_code,total,created_at,updated_at) "
                    "VALUES(?,?,?,?,?,?,?,?,?,'pending','cod','pending',?,?,?,?,?,?,?)",
                    (order_number, user["id"] if user else None, name, phone, email, address, city, area,
                     str(data.get("note", ""))[:1000], subtotal, delivery_fee, discount, coupon_code, total, now(), now()),
                )
                order_id = cursor.lastrowid
                for product, price, quantity, selected_choices in snapshots:
                    variant_label = ", ".join(f"{name}: {option['name']}" for name, option in selected_choices)
                    db.execute(
                        "INSERT INTO order_items(order_id,product_id,product_name_en,product_name_bn,variant_name,unit_price,quantity,line_total,snapshot) VALUES(?,?,?,?,?,?,?,?,?)",
                        (order_id, product["id"], product["name_en"], product["name_bn"], variant_label, price,
                         quantity, price * quantity, json.dumps({"sku": product["sku"], "image": product["image"],
                                                                  "category_id": product["category_id"]})),
                    )
                    if product["stock"] is not None:
                        changed = db.execute("UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND stock>=?",
                                             (quantity, now(), product["id"], quantity)).rowcount
                        if changed != 1:
                            raise ValueError(f"Not enough stock for {product['name_en']}.")
                    if selected_choices:
                        variants_row = db.execute("SELECT variants FROM products WHERE id=?", (product["id"],)).fetchone()
                        variants = decode_json(variants_row["variants"], [])
                        for variant_name, selected_option in selected_choices:
                            if selected_option.get("stock") is None:
                                continue
                            for variant in variants:
                                if variant.get("name") != variant_name:
                                    continue
                                for option in variant.get("options", []):
                                    if option.get("name") == selected_option["name"]:
                                        option["stock"] = int(option["stock"]) - quantity
                        db.execute("UPDATE products SET variants=? WHERE id=?", (json.dumps(variants), product["id"]))
                if coupon:
                    db.execute("UPDATE coupons SET used_count=used_count+1 WHERE code=?", (coupon_code,))
                db.commit()
            except (ValueError, sqlite3.Error):
                db.rollback()
                raise
        self.send_json(201, {"order_number": order_number, "status": "pending", "payment_status": "pending",
                             "subtotal": subtotal, "delivery_fee": delivery_fee, "discount": discount,
                             "total": total, "created_at": now()})

    def delivery_fee(self, db: sqlite3.Connection, city: str, area: str) -> int:
        rows = db.execute("SELECT city,area,fee FROM delivery_zones WHERE active=1").fetchall()
        matches = [row for row in rows if row["city"].casefold() == city.casefold()
                   and row["area"] != "*" and row["area"].casefold() == area.casefold()]
        if not matches:
            matches = [row for row in rows if row["city"].casefold() == city.casefold() and row["area"] == "*"]
        if not matches:
            raise ValueError("Delivery is not available in that area yet. Please contact the shop to check.")
        return int(matches[0]["fee"])

    def track_order(self, data: dict) -> None:
        rate_limit(self, "track", 20, 900)
        order_number = clean(data.get("order_number"), 40).upper()
        phone = valid_phone(data.get("phone"))
        with closing(connect()) as db:
            row = db.execute("SELECT order_number,status,payment_status,total,created_at FROM orders WHERE order_number=? AND phone=?",
                             (order_number, phone)).fetchone()
        if not row:
            self.send_json(404, {"error": "No order matched those details."})
            return
        self.send_json(200, dict(row))

    def create_custom_request(self, data: dict) -> None:
        rate_limit(self, "custom-request", 10, 3600)
        name = clean(data.get("name"), 120)
        phone = valid_phone(data.get("phone"))
        email = clean(data.get("email"), 254)
        options = data.get("options")
        if len(name) < 2 or not isinstance(options, dict):
            raise ValueError("Add your name and tell us a little about your cake.")
        if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            raise ValueError("Enter a valid email address.")
        if len(json.dumps(options)) > 8000:
            raise ValueError("Your request is too long.")
        user = self.current_user()
        with closing(connect()) as db:
            cursor = db.execute("INSERT INTO custom_requests(user_id,name,phone,email,options,status,created_at,updated_at) VALUES(?,?,?,?,?,'submitted',?,?)",
                                (user["id"] if user else None, name, phone, email, json.dumps(options), now(), now()))
            db.commit()
        self.send_json(201, {"id": cursor.lastrowid, "status": "submitted"})

    def create_review(self, path: str, data: dict) -> None:
        user = self.require_user()
        rate_limit(self, "review", 10, 3600)
        try:
            product_id = int(path[len("/api/products/"):-len("/reviews")].strip("/"))
            rating = int(data.get("rating"))
        except (TypeError, ValueError) as error:
            raise ValueError("Choose a valid product and rating.") from error
        body = str(data.get("body", "")).strip()
        if rating < 1 or rating > 5 or len(body) < 8 or len(body) > 2000:
            raise ValueError("Reviews need a 1–5 star rating and 8–2,000 characters.")
        with closing(connect()) as db:
            eligible = db.execute(
                "SELECT o.id FROM orders o JOIN order_items i ON i.order_id=o.id "
                "WHERE o.user_id=? AND o.status='delivered' AND i.product_id=? LIMIT 1",
                (user["id"], product_id),
            ).fetchone()
            if not eligible:
                raise PermissionError("Reviews are available after this item has been delivered on your account.")
            db.execute(
                "INSERT INTO reviews(product_id,user_id,order_id,rating,body,status,created_at) "
                "VALUES(?,?,?,?,?,'pending',?)",
                (product_id, user["id"], eligible["id"], rating, body, now()),
            )
            db.commit()
        self.send_json(201, {"status": "pending", "message": "Your review will appear after the shop approves it."})

    def create_coupon(self, data: dict) -> None:
        code = clean(data.get("code"), 40).upper()
        kind = data.get("kind", "percent")
        try:
            value = int(data.get("value"))
            minimum = int(data.get("min_subtotal", 0))
            max_uses = int(data["max_uses"]) if data.get("max_uses") not in (None, "") else None
        except (TypeError, ValueError) as error:
            raise ValueError("Coupon values and limits must be whole numbers.") from error
        if not re.fullmatch(r"[A-Z0-9_-]{3,40}", code) or kind not in ("percent", "amount"):
            raise ValueError("Enter a valid coupon code and discount type.")
        if value < 1 or kind == "percent" and value > 100 or minimum < 0 or max_uses is not None and max_uses < 1:
            raise ValueError("Check the coupon discount and usage limits.")
        expires = data.get("expires_at")
        if expires:
            try:
                expires = int(expires)
            except (TypeError, ValueError) as error:
                raise ValueError("Coupon expiry must be a Unix timestamp.") from error
        with closing(connect()) as db:
            db.execute(
                "INSERT INTO coupons(code,kind,value,min_subtotal,max_uses,expires_at,active,demo) VALUES(?,?,?,?,?,?,1,0)",
                (code, kind, value, minimum, max_uses, expires),
            )
            db.commit()
        self.send_json(201, {"code": code, "kind": kind, "value": value, "active": 1})

    def patch_coupon(self, code: str, data: dict) -> None:
        if "active" not in data or data["active"] not in (0, 1, False, True):
            raise ValueError("Coupon active state must be true or false.")
        with closing(connect()) as db:
            changed = db.execute("UPDATE coupons SET active=? WHERE code=? COLLATE NOCASE",
                                 (int(bool(data["active"])), code)).rowcount
            db.commit()
        if not changed:
            self.send_json(404, {"error": "Coupon not found."})
        else:
            self.send_json(200, {"code": code, "active": int(bool(data["active"]))})

    def create_delivery_zone(self, data: dict) -> None:
        city = clean(data.get("city"), 100)
        area = clean(data.get("area") or "*", 100)
        try:
            fee = int(data.get("fee"))
        except (TypeError, ValueError) as error:
            raise ValueError("Enter a valid delivery fee.") from error
        if not city or fee < 0 or fee > 1_000_000:
            raise ValueError("Enter a valid district and non-negative delivery fee.")
        with closing(connect()) as db:
            cursor = db.execute("INSERT INTO delivery_zones(city,area,fee,active) VALUES(?,?,?,1)", (city, area, fee))
            db.commit()
        self.send_json(201, {"id": cursor.lastrowid, "city": city, "area": area, "fee": fee, "active": 1})

    def patch_delivery_zone(self, zone_id: str, data: dict) -> None:
        try:
            key = int(zone_id)
        except ValueError as error:
            raise ValueError("Invalid delivery zone identifier.") from error
        allowed = {"city": lambda value: clean(value, 100), "area": lambda value: clean(value, 100),
                   "fee": int, "active": int}
        updates, values = [], []
        for name, convert in allowed.items():
            if name in data:
                value = convert(data[name])
                if name == "fee" and not 0 <= value <= 1_000_000:
                    raise ValueError("Delivery fee must be a non-negative amount.")
                if name == "active" and value not in (0, 1):
                    raise ValueError("Zone active state must be 0 or 1.")
                updates.append(f"{name}=?")
                values.append(value)
        if not updates:
            raise ValueError("No delivery zone changes were supplied.")
        values.append(key)
        with closing(connect()) as db:
            changed = db.execute(f"UPDATE delivery_zones SET {','.join(updates)} WHERE id=?", values).rowcount
            db.commit()
        if not changed:
            self.send_json(404, {"error": "Delivery zone not found."})
        else:
            self.send_json(200, {"ok": True})

    def patch_store_content(self, data: dict) -> None:
        updates = {}
        for key, value in data.items():
            if key not in STORE_CONTENT_DEFAULTS:
                raise ValueError(f"Unsupported storefront content field: {key}.")
            if not isinstance(value, str):
                raise ValueError(f"{key} must be text.")
            text = safe_image(value) if key == "hero_image" else value.strip()
            if not text or len(text) > 2000:
                raise ValueError(f"{key} must contain a valid value of up to 2,000 characters.")
            updates[key] = text
        if not updates:
            raise ValueError("Provide at least one storefront content field.")
        with closing(connect()) as db:
            db.executemany(
                "INSERT INTO settings(key,value) VALUES(?,?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                updates.items(),
            )
            db.commit()
        self.send_json(200, {"content": updates})

    def patch_review(self, review_id: str, data: dict) -> None:
        status = str(data.get("status", ""))
        if status not in ("approved", "rejected"):
            raise ValueError("Reviews can be approved or rejected.")
        try:
            key = int(review_id)
        except ValueError as error:
            raise ValueError("Invalid review identifier.") from error
        with closing(connect()) as db:
            changed = db.execute("UPDATE reviews SET status=? WHERE id=?", (status, key)).rowcount
            db.commit()
        if not changed:
            self.send_json(404, {"error": "Review not found."})
        else:
            self.send_json(200, {"id": key, "status": status})

    def admin_dashboard(self) -> None:
        self.require_admin()
        with closing(connect()) as db:
            metrics = {
                "orders": db.execute("SELECT COUNT(*) FROM orders").fetchone()[0],
                "today_orders": db.execute("SELECT COUNT(*) FROM orders WHERE date(created_at,'unixepoch','+6 hours')=date('now','+6 hours')").fetchone()[0],
                "pending": db.execute("SELECT COUNT(*) FROM orders WHERE status='pending'").fetchone()[0],
                "sales": db.execute("SELECT COALESCE(SUM(total),0) FROM orders WHERE status NOT IN ('cancelled')").fetchone()[0],
            }
            orders = [dict(row) for row in db.execute(
                "SELECT o.order_number,o.customer_name,o.phone,o.status,o.payment_status,o.total,o.created_at,COUNT(i.id) AS items_count "
                "FROM orders o LEFT JOIN order_items i ON i.order_id=o.id GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100")]
            requests = [dict(row) for row in db.execute(
                "SELECT id,name,phone,email,options,status,quote,admin_note,created_at FROM custom_requests ORDER BY created_at DESC LIMIT 100")]
            for row in requests:
                row["options"] = decode_json(row["options"], {})
            self.send_json(200, {"metrics": metrics, "orders": orders, "requests": requests})

    def patch_order(self, order_number: str, data: dict) -> None:
        status = str(data.get("status", ""))
        if status not in ALLOWED_STATUSES:
            raise ValueError("Choose a valid order status.")
        with closing(connect()) as db:
            changed = db.execute("UPDATE orders SET status=?,updated_at=? WHERE order_number=?",
                                 (status, now(), order_number)).rowcount
            db.commit()
        if not changed:
            self.send_json(404, {"error": "Order not found."})
        else:
            self.send_json(200, {"order_number": order_number, "status": status})

    def patch_custom_request(self, request_id: str, data: dict) -> None:
        try:
            quote = int(data.get("quote"))
            request_pk = int(request_id)
        except (TypeError, ValueError) as error:
            raise ValueError("Enter a valid quote in BDT.") from error
        if quote < 1 or quote > 100_000_000:
            raise ValueError("Quote must be between ৳1 and ৳100,000,000.")
        with closing(connect()) as db:
            changed = db.execute("UPDATE custom_requests SET quote=?,status='quoted',updated_at=? WHERE id=? AND status IN ('submitted','quoted')",
                                 (quote, now(), request_pk)).rowcount
            db.commit()
        if not changed:
            self.send_json(404, {"error": "Custom request not found or no longer awaiting a quote."})
        else:
            self.send_json(200, {"id": request_pk, "status": "quoted", "quote": quote})

    def patch_product(self, product_id: str, data: dict) -> None:
        try:
            key = int(product_id)
        except ValueError as error:
            raise ValueError("Invalid product identifier.") from error
        fields = {
            "active": ("active", int), "featured": ("featured", int), "bestseller": ("bestseller", int),
            "price": ("price", int), "sale_price": ("sale_price", lambda value: int(value) if value not in (None, "") else None), "stock": ("stock", lambda value: int(value) if value not in (None, "") else None),
            "category_id": ("category_id", int),
            "name_en": ("name_en", lambda value: clean(value, 160)),
            "name_bn": ("name_bn", lambda value: clean(value, 160)),
            "description_en": ("description_en", lambda value: str(value)[:5000]),
            "description_bn": ("description_bn", lambda value: str(value)[:5000]),
            "image": ("image", safe_image),
            "images": ("images", json.dumps),
            "ingredients": ("ingredients", lambda value: clean(value, 1000)),
            "allergens": ("allergens", lambda value: clean(value, 600)),
            "storage": ("storage", lambda value: clean(value, 600)),
            "prep_time": ("prep_time", lambda value: clean(value, 200)),
            "made_to_order": ("made_to_order", int),
            "attributes": ("attributes", json.dumps),
            "variants": ("variants", json.dumps),
        }
        updates = []
        values = []
        for key_name, (column, converter) in fields.items():
            if key_name not in data:
                continue
            value = converter(data[key_name])
            if column in ("active", "featured", "bestseller", "made_to_order") and value not in (0, 1):
                raise ValueError(f"{column} must be 0 or 1.")
            if column == "price" and value < 0 or column == "sale_price" and value is not None and value < 0 or column == "stock" and value is not None and value < 0:
                raise ValueError("Prices and inventory must not be negative.")
            if column == "variants":
                value = json.dumps(validate_variants(data[key_name], int(data.get("price", 0))))
            if column == "images":
                if not isinstance(data[key_name], list) or len(data[key_name]) > 12:
                    raise ValueError("Add no more than 12 product images.")
                value = json.dumps([safe_image(url) for url in data[key_name]])
            if column == "attributes" and (not isinstance(data[key_name], dict) or len(data[key_name]) > 40):
                raise ValueError("Attributes must be an object with up to 40 values.")
            updates.append(f"{column}=?")
            values.append(value)
        if not updates:
            raise ValueError("No product changes were supplied.")
        updates.append("updated_at=?")
        values.extend([now(), key])
        with closing(connect()) as db:
            current = db.execute("SELECT price,sale_price,category_id,image,name_en FROM products WHERE id=?", (key,)).fetchone()
            if not current:
                self.send_json(404, {"error": "Product not found."})
                return
            final_price = current["price"]
            final_sale_price = current["sale_price"]
            final_category_id = current["category_id"]
            final_image = current["image"]
            final_name = current["name_en"]
            for statement, value in zip(updates[:-1], values[:-2]):
                column = statement.split("=", 1)[0]
                if column == "price":
                    final_price = value
                elif column == "sale_price":
                    final_sale_price = value
                elif column == "category_id":
                    final_category_id = value
                elif column == "image":
                    final_image = value
                elif column == "name_en":
                    final_name = value
            if not clean(final_name, 160):
                raise ValueError("A product name is required.")
            if final_price < 1 or final_price > 100_000_000:
                raise ValueError("Price must be between ৳1 and ৳100,000,000.")
            if final_sale_price is not None and not 1 <= final_sale_price < final_price:
                raise ValueError("A sale price must be positive and lower than the regular price.")
            if not final_image:
                raise ValueError("A product photo URL is required.")
            if not db.execute("SELECT 1 FROM categories WHERE id=? AND active=1", (final_category_id,)).fetchone():
                raise ValueError("Choose an active category.")
            changed = db.execute(f"UPDATE products SET {','.join(updates)} WHERE id=?", values).rowcount
            db.commit()
        if not changed:
            self.send_json(404, {"error": "Product not found."})
        else:
            self.send_json(200, {"ok": True})
    def patch_category(self, category_id: str, data: dict) -> None:
        try:
            key = int(category_id)
        except ValueError as error:
            raise ValueError("Invalid category identifier.") from error
        allowed = {"name_en": lambda v: clean(v, 120), "name_bn": lambda v: clean(v, 120),
                   "description_en": lambda v: str(v)[:3000], "description_bn": lambda v: str(v)[:3000],
                   "image": safe_image, "active": int, "featured": int, "sort_order": int, "parent_id": lambda v: int(v) if v else None}
        updates, values = [], []
        for name, convert in allowed.items():
            if name in data:
                value = convert(data[name])
                if name in ("active", "featured") and value not in (0, 1):
                    raise ValueError("Category flags must be 0 or 1.")
                updates.append(f"{name}=?")
                values.append(value)
        if not updates:
            raise ValueError("No category changes were supplied.")
        values.append(key)
        with closing(connect()) as db:
            changed = db.execute(f"UPDATE categories SET {','.join(updates)} WHERE id=?", values).rowcount
            db.commit()
        if not changed:
            self.send_json(404, {"error": "Category not found."})
        else:
            self.send_json(200, {"ok": True})


def validate_variants(value: object, base_price: int) -> list[dict]:
    if value in (None, ""):
        return []
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError as error:
            raise ValueError("Product variants must be valid JSON.") from error
    if not isinstance(value, list) or len(value) > 30:
        raise ValueError("Variants must be a list with no more than 30 attributes.")
    normalized = []
    for variant in value:
        if not isinstance(variant, dict):
            raise ValueError("Each variant must have a name and an options list.")
        name = clean(variant.get("name"), 80)
        options = variant.get("options")
        if not name or not isinstance(options, list) or not options or len(options) > 50:
            raise ValueError("Each variant needs a name and 1–50 options.")
        clean_options = []
        for option in options:
            if not isinstance(option, dict):
                raise ValueError("Each variant option must be an object.")
            option_name = clean(option.get("name"), 100)
            try:
                price = int(option["price"]) if option.get("price") is not None else None
                price_adjustment = int(option.get("price_adjustment", 0))
                stock = option.get("stock")
                stock = int(stock) if stock is not None else None
            except (TypeError, ValueError) as error:
                raise ValueError("Variant prices and stock must be whole numbers.") from error
            if not option_name or price is not None and price < 0 or price_adjustment < -100_000_000 or stock is not None and stock < 0:
                raise ValueError("Variant names, prices, and stock must be valid.")
            clean_options.append({"name": option_name, "price": price, "price_adjustment": price_adjustment, "stock": stock})
        normalized.append({"name": name, "options": clean_options})
    return normalized


if __name__ == "__main__":
    initialize()
    print(f"Taha's Mix Delight API on http://127.0.0.1:{PORT}")
    print("Sample products are clearly marked in the storefront. Configure a real admin account with TAHA_ADMIN_EMAIL and TAHA_ADMIN_PASSWORD.")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
