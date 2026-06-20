const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "custombike.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      specs TEXT,
      color TEXT,
      suitable_use TEXT,
      min_height INTEGER,
      max_height INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS compatibility_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_a_id INTEGER NOT NULL,
      part_b_id INTEGER NOT NULL,
      compatible INTEGER NOT NULL DEFAULT 1,
      note TEXT,
      FOREIGN KEY (part_a_id) REFERENCES parts(id),
      FOREIGN KEY (part_b_id) REFERENCES parts(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      use_type TEXT NOT NULL,
      height INTEGER,
      riding_style TEXT,
      budget REAL,
      color_preference TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      frame_id INTEGER,
      wheelset_id INTEGER,
      drivetrain_id INTEGER,
      saddle_id INTEGER,
      handlebar_id INTEGER,
      smart_accessory_id INTEGER,
      total_price REAL DEFAULT 0,
      estimated_days INTEGER DEFAULT 7,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered_at DATETIME,
      notes TEXT,
      FOREIGN KEY (frame_id) REFERENCES parts(id),
      FOREIGN KEY (wheelset_id) REFERENCES parts(id),
      FOREIGN KEY (drivetrain_id) REFERENCES parts(id),
      FOREIGN KEY (saddle_id) REFERENCES parts(id),
      FOREIGN KEY (handlebar_id) REFERENCES parts(id),
      FOREIGN KEY (smart_accessory_id) REFERENCES parts(id)
    );

    CREATE TABLE IF NOT EXISTS order_status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      operator TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
    CREATE INDEX IF NOT EXISTS idx_order_logs_order ON order_status_logs(order_id);
  `);
}

const ORDER_STATUSES = [
  { key: "pending", label: "待确认", color: "warning", step: 0 },
  { key: "preparing", label: "备料中", color: "primary", step: 1 },
  { key: "assembling", label: "装配中", color: "primary", step: 2 },
  { key: "debugging", label: "调试中", color: "secondary", step: 3 },
  { key: "ready", label: "可取车", color: "success", step: 4 },
  { key: "delivered", label: "已交付", color: "gray-500", step: 5 },
];

const USE_TYPES = [
  { key: "commute", label: "通勤", icon: "🏙️" },
  { key: "longdistance", label: "长途", icon: "🛣️" },
  { key: "race", label: "竞赛", icon: "🏁" },
  { key: "family", label: "亲子", icon: "👨‍👩‍👧" },
];

const PART_CATEGORIES = [
  { key: "frame", label: "车架" },
  { key: "wheelset", label: "轮组" },
  { key: "drivetrain", label: "传动" },
  { key: "saddle", label: "座垫" },
  { key: "handlebar", label: "把组" },
  { key: "smart_accessory", label: "智能配件" },
];

module.exports = {
  db,
  initDB,
  ORDER_STATUSES,
  USE_TYPES,
  PART_CATEGORIES,
};
