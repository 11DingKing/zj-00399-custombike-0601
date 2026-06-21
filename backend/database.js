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
      status TEXT NOT NULL DEFAULT 'draft',
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
      quote_generated_at DATETIME,
      quote_confirmed_at DATETIME,
      quote_confirmed_by TEXT,
      quote_valid_hours INTEGER DEFAULT 24,
      stock_reserved INTEGER DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS stock_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      adjustment_id INTEGER,
      part_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'reserved',
      reserved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      released_at DATETIME,
      consumed_at DATETIME,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (adjustment_id) REFERENCES adjustments(id),
      FOREIGN KEY (part_id) REFERENCES parts(id)
    );

    CREATE TABLE IF NOT EXISTS adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adjustment_no TEXT UNIQUE NOT NULL,
      order_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      issue_type TEXT NOT NULL,
      issue_description TEXT,
      status TEXT NOT NULL DEFAULT 'adjust_pending',
      original_part_id INTEGER,
      new_part_id INTEGER,
      part_category TEXT NOT NULL,
      estimated_days INTEGER DEFAULT 3,
      price_adjustment REAL DEFAULT 0,
      operator TEXT,
      technician TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      delivered_at DATETIME,
      notes TEXT,
      stock_reserved INTEGER DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (original_part_id) REFERENCES parts(id),
      FOREIGN KEY (new_part_id) REFERENCES parts(id)
    );

    CREATE TABLE IF NOT EXISTS adjustment_status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adjustment_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      operator TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (adjustment_id) REFERENCES adjustments(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
    CREATE INDEX IF NOT EXISTS idx_order_logs_order ON order_status_logs(order_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_order ON stock_reservations(order_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_adjustment ON stock_reservations(adjustment_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_part ON stock_reservations(part_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON stock_reservations(status);
    CREATE INDEX IF NOT EXISTS idx_adjustments_order ON adjustments(order_id);
    CREATE INDEX IF NOT EXISTS idx_adjustments_status ON adjustments(status);
    CREATE INDEX IF NOT EXISTS idx_adjustment_logs_adjustment ON adjustment_status_logs(adjustment_id);
  `);
}

const ORDER_STATUSES = [
  { key: "draft", label: "草稿报价", color: "gray-500", step: -2 },
  { key: "quote_pending", label: "待客户确认", color: "warning", step: -1 },
  { key: "preparing", label: "备料中", color: "primary", step: 0 },
  { key: "assembling", label: "装配中", color: "primary", step: 1 },
  { key: "debugging", label: "调试中", color: "secondary", step: 2 },
  { key: "ready", label: "可取车", color: "success", step: 3 },
  { key: "delivered", label: "已交付", color: "gray-500", step: 4 },
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

const ADJUSTMENT_STATUSES = [
  { key: "adjust_pending", label: "待调整", color: "warning", step: 0 },
  { key: "adjusting", label: "调整中", color: "primary", step: 1 },
  { key: "adjust_debugging", label: "调试中", color: "secondary", step: 2 },
  { key: "adjust_ready", label: "完成可取", color: "success", step: 3 },
  { key: "adjust_delivered", label: "已交付", color: "gray-500", step: 4 },
];

const ADJUSTMENT_ISSUE_TYPES = [
  { key: "handlebar", label: "把位不合适", category: "handlebar", icon: "🎯" },
  { key: "saddle", label: "座高不合适", category: "saddle", icon: "🪑" },
  {
    key: "drivetrain",
    label: "传动系统问题",
    category: "drivetrain",
    icon: "⚙️",
  },
  {
    key: "smart_accessory",
    label: "智能配件问题",
    category: "smart_accessory",
    icon: "📱",
  },
];

const ADJUSTABLE_CATEGORIES = [
  "handlebar",
  "saddle",
  "drivetrain",
  "smart_accessory",
];

module.exports = {
  db,
  initDB,
  ORDER_STATUSES,
  USE_TYPES,
  PART_CATEGORIES,
  ADJUSTMENT_STATUSES,
  ADJUSTMENT_ISSUE_TYPES,
  ADJUSTABLE_CATEGORIES,
};
