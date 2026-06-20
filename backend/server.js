const express = require("express");
const cors = require("cors");
const {
  db,
  initDB,
  ORDER_STATUSES,
  USE_TYPES,
  PART_CATEGORIES,
} = require("./database");
const { seedData } = require("./seed");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDB();

const partsInOrderBase = `
  SELECT 
    o.*,
    f.name as frame_name, f.price as frame_price,
    w.name as wheelset_name, w.price as wheelset_price,
    d.name as drivetrain_name, d.price as drivetrain_price,
    s.name as saddle_name, s.price as saddle_price,
    h.name as handlebar_name, h.price as handlebar_price,
    sa.name as smart_accessory_name, sa.price as smart_accessory_price
  FROM orders o
  LEFT JOIN parts f ON o.frame_id = f.id
  LEFT JOIN parts w ON o.wheelset_id = w.id
  LEFT JOIN parts d ON o.drivetrain_id = d.id
  LEFT JOIN parts s ON o.saddle_id = s.id
  LEFT JOIN parts h ON o.handlebar_id = h.id
  LEFT JOIN parts sa ON o.smart_accessory_id = sa.id
`;

const getOrderById = db.prepare(partsInOrderBase + " WHERE o.id = ?");
const getAllOrders = db.prepare(
  partsInOrderBase + " ORDER BY o.created_at DESC",
);
const getOrdersByStatus = db.prepare(
  partsInOrderBase + " WHERE o.status = ? ORDER BY o.created_at DESC",
);
const getOrdersByUseType = db.prepare(
  partsInOrderBase + " WHERE o.use_type = ? ORDER BY o.created_at DESC",
);
const getOrdersByStatusAndUseType = db.prepare(
  partsInOrderBase +
    " WHERE o.status = ? AND o.use_type = ? ORDER BY o.created_at DESC",
);

function formatOrder(order) {
  if (!order) return null;
  const parts = [];
  if (order.frame_id)
    parts.push({
      id: order.frame_id,
      category: "frame",
      name: order.frame_name,
      price: order.frame_price,
    });
  if (order.wheelset_id)
    parts.push({
      id: order.wheelset_id,
      category: "wheelset",
      name: order.wheelset_name,
      price: order.wheelset_price,
    });
  if (order.drivetrain_id)
    parts.push({
      id: order.drivetrain_id,
      category: "drivetrain",
      name: order.drivetrain_name,
      price: order.drivetrain_price,
    });
  if (order.saddle_id)
    parts.push({
      id: order.saddle_id,
      category: "saddle",
      name: order.saddle_name,
      price: order.saddle_price,
    });
  if (order.handlebar_id)
    parts.push({
      id: order.handlebar_id,
      category: "handlebar",
      name: order.handlebar_name,
      price: order.handlebar_price,
    });
  if (order.smart_accessory_id)
    parts.push({
      id: order.smart_accessory_id,
      category: "smart_accessory",
      name: order.smart_accessory_name,
      price: order.smart_accessory_price,
    });

  const statusInfo =
    ORDER_STATUSES.find((s) => s.key === order.status) || ORDER_STATUSES[0];
  const progress = (statusInfo.step / (ORDER_STATUSES.length - 1)) * 100;

  const createdDate = new Date(order.created_at);
  const estimatedDate = new Date(
    createdDate.getTime() + order.estimated_days * 24 * 60 * 60 * 1000,
  );
  const now = new Date();
  const isOverdue = order.status !== "delivered" && now > estimatedDate;
  const daysRemaining = Math.ceil(
    (estimatedDate - now) / (24 * 60 * 60 * 1000),
  );

  return {
    id: order.id,
    order_no: order.order_no,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    use_type: order.use_type,
    use_type_label:
      USE_TYPES.find((u) => u.key === order.use_type)?.label || order.use_type,
    height: order.height,
    riding_style: order.riding_style,
    budget: order.budget,
    color_preference: order.color_preference,
    status: order.status,
    status_label: statusInfo.label,
    status_color: statusInfo.color,
    progress: Math.round(progress),
    total_price: order.total_price || 0,
    estimated_days: order.estimated_days,
    estimated_date: estimatedDate.toISOString().split("T")[0],
    is_overdue: isOverdue,
    days_remaining: daysRemaining,
    created_at: order.created_at,
    updated_at: order.updated_at,
    delivered_at: order.delivered_at,
    notes: order.notes,
    parts: parts,
    frame_id: order.frame_id,
    wheelset_id: order.wheelset_id,
    drivetrain_id: order.drivetrain_id,
    saddle_id: order.saddle_id,
    handlebar_id: order.handlebar_id,
    smart_accessory_id: order.smart_accessory_id,
  };
}

app.get("/api/meta", (req, res) => {
  res.json({
    order_statuses: ORDER_STATUSES,
    use_types: USE_TYPES,
    part_categories: PART_CATEGORIES,
  });
});

app.get("/api/parts", (req, res) => {
  const { category, use_type, category_only } = req.query;

  if (category_only) {
    const categories = PART_CATEGORIES.map((cat) => {
      const parts = db
        .prepare("SELECT * FROM parts WHERE category = ?")
        .all(cat.key);
      return { ...cat, count: parts.length };
    });
    return res.json(categories);
  }

  let query = "SELECT * FROM parts WHERE 1=1";
  const params = [];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  if (use_type && use_type !== "all") {
    query += " AND (suitable_use = ? OR suitable_use = ?)";
    params.push(use_type, "all");
  }

  query += " ORDER BY price ASC";
  const parts = db.prepare(query).all(...params);
  res.json(parts);
});

app.get("/api/parts/:id", (req, res) => {
  const part = db
    .prepare("SELECT * FROM parts WHERE id = ?")
    .get(req.params.id);
  if (!part) return res.status(404).json({ error: "配件不存在" });
  res.json(part);
});

app.put("/api/parts/:id/stock", (req, res) => {
  const { stock } = req.body;
  const result = db
    .prepare("UPDATE parts SET stock = ? WHERE id = ?")
    .run(stock, req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: "配件不存在" });
  const part = db
    .prepare("SELECT * FROM parts WHERE id = ?")
    .get(req.params.id);
  res.json(part);
});

app.get("/api/orders", (req, res) => {
  const { status, use_type } = req.query;

  let orders;
  if (status && status !== "all" && use_type && use_type !== "all") {
    orders = getOrdersByStatusAndUseType.all(status, use_type);
  } else if (status && status !== "all") {
    orders = getOrdersByStatus.all(status);
  } else if (use_type && use_type !== "all") {
    orders = getOrdersByUseType.all(use_type);
  } else {
    orders = getAllOrders.all();
  }

  const detailedOrders = orders.map((order) => formatOrder(order));
  res.json(detailedOrders);
});

app.get("/api/orders/:id", (req, res) => {
  const order = getOrderById.get(req.params.id);
  if (!order) return res.status(404).json({ error: "订单不存在" });
  res.json(formatOrder(order));
});

function generateOrderNo() {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");

  const count = db
    .prepare("SELECT COUNT(*) as count FROM orders WHERE order_no LIKE ?")
    .get(`CB${dateStr}%`).count;
  return `CB${dateStr}${(count + 1).toString().padStart(3, "0")}`;
}

app.post("/api/orders", (req, res) => {
  const {
    customer_name,
    customer_phone,
    use_type,
    height,
    riding_style,
    budget,
    color_preference,
    notes,
  } = req.body;

  if (!customer_name || !use_type) {
    return res.status(400).json({ error: "客户姓名和用途为必填项" });
  }

  const order_no = generateOrderNo();

  const result = db
    .prepare(
      `
    INSERT INTO orders (order_no, customer_name, customer_phone, use_type, height, riding_style, budget, color_preference, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      order_no,
      customer_name,
      customer_phone || "",
      use_type,
      height || null,
      riding_style || "",
      budget || null,
      color_preference || "",
      notes || "",
    );

  db.prepare(
    `
    INSERT INTO order_status_logs (order_id, status, operator, remark)
    VALUES (?, ?, ?, ?)
  `,
  ).run(result.lastInsertRowid, "pending", "系统", "订单创建");

  const order = getOrderById.get(result.lastInsertRowid);
  res.status(201).json(formatOrder(order));
});

app.put("/api/orders/:id/configure", (req, res) => {
  const {
    frame_id,
    wheelset_id,
    drivetrain_id,
    saddle_id,
    handlebar_id,
    smart_accessory_id,
    estimated_days,
  } = req.body;

  const orderId = req.params.id;
  const existingOrder = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(orderId);
  if (!existingOrder) return res.status(404).json({ error: "订单不存在" });

  const partIds = [
    frame_id,
    wheelset_id,
    drivetrain_id,
    saddle_id,
    handlebar_id,
    smart_accessory_id,
  ].filter(Boolean);

  let totalPrice = 0;
  const stockIssues = [];

  for (const pid of partIds) {
    const part = db.prepare("SELECT * FROM parts WHERE id = ?").get(pid);
    if (part) {
      totalPrice += part.price;
      if (part.stock <= 0) {
        stockIssues.push(`${part.name} (库存不足)`);
      }
    }
  }

  db.prepare(
    `
    UPDATE orders SET
      frame_id = ?, wheelset_id = ?, drivetrain_id = ?,
      saddle_id = ?, handlebar_id = ?, smart_accessory_id = ?,
      total_price = ?, estimated_days = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
  ).run(
    frame_id || null,
    wheelset_id || null,
    drivetrain_id || null,
    saddle_id || null,
    handlebar_id || null,
    smart_accessory_id || null,
    totalPrice,
    estimated_days || 7,
    orderId,
  );

  const order = getOrderById.get(orderId);
  res.json({
    ...formatOrder(order),
    stock_issues: stockIssues,
    can_confirm: stockIssues.length === 0 && partIds.length >= 3,
  });
});

app.put("/api/orders/:id/status", (req, res) => {
  const { status, operator, remark } = req.body;
  const orderId = req.params.id;

  const validStatuses = ORDER_STATUSES.map((s) => s.key);
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "无效的状态" });
  }

  const existingOrder = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(orderId);
  if (!existingOrder) return res.status(404).json({ error: "订单不存在" });

  if (status === "preparing" && existingOrder.status === "pending") {
    const partIds = [
      existingOrder.frame_id,
      existingOrder.wheelset_id,
      existingOrder.drivetrain_id,
      existingOrder.saddle_id,
      existingOrder.handlebar_id,
      existingOrder.smart_accessory_id,
    ].filter(Boolean);

    const stockIssues = [];
    for (const pid of partIds) {
      const part = db.prepare("SELECT * FROM parts WHERE id = ?").get(pid);
      if (part && part.stock <= 0) {
        stockIssues.push(part.name);
      }
    }

    if (stockIssues.length > 0) {
      return res
        .status(400)
        .json({ error: `库存不足，无法开始备料: ${stockIssues.join(", ")}` });
    }

    for (const pid of partIds) {
      db.prepare("UPDATE parts SET stock = stock - 1 WHERE id = ?").run(pid);
    }
  }

  let deliveredAt = existingOrder.delivered_at;
  if (status === "delivered") {
    deliveredAt = new Date().toISOString();
  }

  db.prepare(
    `
    UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP, delivered_at = ?
    WHERE id = ?
  `,
  ).run(status, deliveredAt, orderId);

  db.prepare(
    `
    INSERT INTO order_status_logs (order_id, status, operator, remark)
    VALUES (?, ?, ?, ?)
  `,
  ).run(orderId, status, operator || "系统", remark || "");

  const order = getOrderById.get(orderId);
  res.json(formatOrder(order));
});

app.get("/api/orders/:id/logs", (req, res) => {
  const logs = db
    .prepare(
      `
    SELECT * FROM order_status_logs 
    WHERE order_id = ? 
    ORDER BY created_at ASC
  `,
    )
    .all(req.params.id);
  res.json(logs);
});

app.get("/api/stats", (req, res) => {
  const statusCounts = {};
  for (const s of ORDER_STATUSES) {
    const count = db
      .prepare("SELECT COUNT(*) as count FROM orders WHERE status = ?")
      .get(s.key).count;
    statusCounts[s.key] = count;
  }

  const overdueCount = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM orders 
    WHERE status != 'delivered' 
    AND date(created_at, '+' || estimated_days || ' days') < date('now')
  `,
    )
    .get().count;

  const totalParts = db
    .prepare("SELECT COUNT(*) as count FROM parts")
    .get().count;
  const lowStockParts = db
    .prepare("SELECT COUNT(*) as count FROM parts WHERE stock <= 0")
    .get().count;

  res.json({
    status_counts: statusCounts,
    overdue_count: overdueCount,
    total_parts: totalParts,
    low_stock_parts: lowStockParts,
  });
});

app.get("/api/recommend-parts", (req, res) => {
  const { use_type, height, budget } = req.query;

  const categories = ["frame", "wheelset", "drivetrain", "saddle", "handlebar"];
  const recommendations = {};

  for (const cat of categories) {
    let query =
      "SELECT * FROM parts WHERE category = ? AND (suitable_use = ? OR suitable_use = ?)";
    const params = [cat, use_type, "all"];

    if (height) {
      query += " AND min_height <= ? AND max_height >= ?";
      params.push(height, height);
    }

    query += " ORDER BY stock > 0 DESC, price ASC LIMIT 3";
    recommendations[cat] = db.prepare(query).all(...params);
  }

  let smartQuery =
    "SELECT * FROM parts WHERE category = ? AND (suitable_use = ? OR suitable_use = ?) ORDER BY price ASC LIMIT 3";
  recommendations["smart_accessory"] = db
    .prepare(smartQuery)
    .all("smart_accessory", use_type, "all");

  res.json(recommendations);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "服务器内部错误" });
});

if (require.main === module) {
  const { seedData } = require("./seed");
  seedData();

  app.listen(PORT, () => {
    console.log(`🚀 定制自行车后端服务已启动: http://localhost:${PORT}`);
    console.log(`📦 API 基础路径: http://localhost:${PORT}/api`);
  });
}

module.exports = app;
