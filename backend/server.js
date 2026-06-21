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
    f.name as frame_name, f.price as frame_price, f.stock as frame_stock, f.specs as frame_specs, f.brand as frame_brand,
    w.name as wheelset_name, w.price as wheelset_price, w.stock as wheelset_stock, w.specs as wheelset_specs, w.brand as wheelset_brand,
    d.name as drivetrain_name, d.price as drivetrain_price, d.stock as drivetrain_stock, d.specs as drivetrain_specs, d.brand as drivetrain_brand,
    s.name as saddle_name, s.price as saddle_price, s.stock as saddle_stock, s.specs as saddle_specs, s.brand as saddle_brand,
    h.name as handlebar_name, h.price as handlebar_price, h.stock as handlebar_stock, h.specs as handlebar_specs, h.brand as handlebar_brand,
    sa.name as smart_accessory_name, sa.price as smart_accessory_price, sa.stock as smart_accessory_stock, sa.specs as smart_accessory_specs, sa.brand as smart_accessory_brand
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

const PART_CATEGORY_MAP = {
  frame: {
    idField: "frame_id",
    nameField: "frame_name",
    priceField: "frame_price",
    stockField: "frame_stock",
    specsField: "frame_specs",
    brandField: "frame_brand",
  },
  wheelset: {
    idField: "wheelset_id",
    nameField: "wheelset_name",
    priceField: "wheelset_price",
    stockField: "wheelset_stock",
    specsField: "wheelset_specs",
    brandField: "wheelset_brand",
  },
  drivetrain: {
    idField: "drivetrain_id",
    nameField: "drivetrain_name",
    priceField: "drivetrain_price",
    stockField: "drivetrain_stock",
    specsField: "drivetrain_specs",
    brandField: "drivetrain_brand",
  },
  saddle: {
    idField: "saddle_id",
    nameField: "saddle_name",
    priceField: "saddle_price",
    stockField: "saddle_stock",
    specsField: "saddle_specs",
    brandField: "saddle_brand",
  },
  handlebar: {
    idField: "handlebar_id",
    nameField: "handlebar_name",
    priceField: "handlebar_price",
    stockField: "handlebar_stock",
    specsField: "handlebar_specs",
    brandField: "handlebar_brand",
  },
  smart_accessory: {
    idField: "smart_accessory_id",
    nameField: "smart_accessory_name",
    priceField: "smart_accessory_price",
    stockField: "smart_accessory_stock",
    specsField: "smart_accessory_specs",
    brandField: "smart_accessory_brand",
  },
};

function isQuoteExpired(order) {
  if (!order.quote_generated_at || order.status !== "quote_pending")
    return false;
  const validHours = order.quote_valid_hours || 24;
  const genTime = new Date(order.quote_generated_at).getTime();
  const expireTime = genTime + validHours * 60 * 60 * 1000;
  return Date.now() > expireTime;
}

function getEffectiveStock(partId) {
  const part = db.prepare("SELECT stock FROM parts WHERE id = ?").get(partId);
  if (!part) return 0;
  const reserved = db
    .prepare(
      "SELECT COALESCE(SUM(quantity), 0) as total FROM stock_reservations WHERE part_id = ? AND status = 'reserved'",
    )
    .get(partId).total;
  return part.stock - reserved;
}

function releaseStockReservations(orderId) {
  db.prepare(
    "UPDATE stock_reservations SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'reserved'",
  ).run(orderId);
  db.prepare(
    "UPDATE orders SET stock_reserved = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).run(orderId);
}

function consumeStockReservations(orderId) {
  const reservations = db
    .prepare(
      "SELECT * FROM stock_reservations WHERE order_id = ? AND status = 'reserved'",
    )
    .all(orderId);

  for (const r of reservations) {
    db.prepare("UPDATE parts SET stock = stock - ? WHERE id = ?").run(
      r.quantity,
      r.part_id,
    );
  }

  db.prepare(
    "UPDATE stock_reservations SET status = 'consumed', consumed_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'reserved'",
  ).run(orderId);
}

function rollbackStockConsumption(orderId) {
  const consumed = db
    .prepare(
      "SELECT * FROM stock_reservations WHERE order_id = ? AND status = 'consumed'",
    )
    .all(orderId);

  for (const r of consumed) {
    db.prepare("UPDATE parts SET stock = stock + ? WHERE id = ?").run(
      r.quantity,
      r.part_id,
    );
  }

  db.prepare(
    "UPDATE stock_reservations SET status = 'reserved', consumed_at = NULL WHERE order_id = ? AND status = 'consumed'",
  ).run(orderId);
}

function createStockReservations(orderId, partIds) {
  releaseStockReservations(orderId);
  const insert = db.prepare(
    "INSERT INTO stock_reservations (order_id, part_id, quantity) VALUES (?, ?, 1)",
  );
  for (const pid of partIds) {
    insert.run(orderId, pid);
  }
  db.prepare(
    "UPDATE orders SET stock_reserved = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).run(orderId);
}

function getStockReservations(orderId) {
  return db
    .prepare(
      `SELECT r.*, p.name as part_name, p.category, p.price, p.stock as part_stock
       FROM stock_reservations r 
       LEFT JOIN parts p ON r.part_id = p.id 
       WHERE r.order_id = ? ORDER BY r.id ASC`,
    )
    .all(orderId);
}

function checkCompatibility(partIds) {
  if (partIds.length < 2) return { compatible: true, issues: [] };
  const issues = [];
  for (let i = 0; i < partIds.length; i++) {
    for (let j = i + 1; j < partIds.length; j++) {
      const rule = db
        .prepare(
          "SELECT * FROM compatibility_rules WHERE (part_a_id = ? AND part_b_id = ?) OR (part_a_id = ? AND part_b_id = ?)",
        )
        .get(partIds[i], partIds[j], partIds[j], partIds[i]);
      if (rule && rule.compatible === 0) {
        const pA = db
          .prepare("SELECT name FROM parts WHERE id = ?")
          .get(partIds[i]);
        const pB = db
          .prepare("SELECT name FROM parts WHERE id = ?")
          .get(partIds[j]);
        issues.push({
          part_a: pA?.name || "未知配件",
          part_b: pB?.name || "未知配件",
          note: rule.note || "存在兼容性冲突",
        });
      }
    }
  }
  return { compatible: issues.length === 0, issues };
}

function buildQuoteBreakdown(order) {
  const breakdown = [];
  let subtotal = 0;

  for (const cat of PART_CATEGORIES) {
    const conf = PART_CATEGORY_MAP[cat.key];
    const partId = order[conf.idField];
    if (partId) {
      const name = order[conf.nameField];
      const price = order[conf.priceField] || 0;
      const specs = order[conf.specsField];
      const brand = order[conf.brandField];
      const originalStock = order[conf.stockField];
      const effective = getEffectiveStock(partId);
      subtotal += price;
      breakdown.push({
        category: cat.key,
        category_label: cat.label,
        part_id: partId,
        name: name,
        brand: brand,
        specs: specs,
        unit_price: price,
        quantity: 1,
        subtotal: price,
        original_stock: originalStock,
        effective_stock: effective,
        stock_status: effective > 0 ? "available" : "shortage",
      });
    }
  }

  const laborFee = Math.round(subtotal * 0.08);
  const assemblyFee = 300;
  const total = subtotal + laborFee + assemblyFee;

  return {
    items: breakdown,
    parts_subtotal: subtotal,
    labor_fee: laborFee,
    assembly_fee: assemblyFee,
    total_price: total,
  };
}

function formatOrder(order) {
  if (!order) return null;
  const parts = [];
  const partIds = [];
  for (const cat of PART_CATEGORIES) {
    const conf = PART_CATEGORY_MAP[cat.key];
    const partId = order[conf.idField];
    if (partId) {
      partIds.push(partId);
      parts.push({
        id: partId,
        category: cat.key,
        category_label: cat.label,
        name: order[conf.nameField],
        price: order[conf.priceField],
        specs: order[conf.specsField],
        brand: order[conf.brandField],
        stock: order[conf.stockField],
        effective_stock: getEffectiveStock(partId),
      });
    }
  }

  const statusInfo =
    ORDER_STATUSES.find((s) => s.key === order.status) || ORDER_STATUSES[0];

  const minStep = Math.min(...ORDER_STATUSES.map((s) => s.step));
  const maxStep = Math.max(...ORDER_STATUSES.map((s) => s.step));
  const range = maxStep - minStep;
  const progress = range > 0 ? ((statusInfo.step - minStep) / range) * 100 : 0;

  const createdDate = new Date(order.created_at);
  const estimatedDate = new Date(
    createdDate.getTime() + (order.estimated_days || 7) * 24 * 60 * 60 * 1000,
  );
  const now = new Date();
  const assemblyStatuses = ["preparing", "assembling", "debugging", "ready"];
  const isOverdue =
    order.status !== "delivered" &&
    assemblyStatuses.includes(order.status) &&
    now > estimatedDate;
  const daysRemaining = Math.ceil(
    (estimatedDate - now) / (24 * 60 * 60 * 1000),
  );

  const quoteExpired = isQuoteExpired(order);

  const quote = order.quote_generated_at ? buildQuoteBreakdown(order) : null;

  const compatibility = checkCompatibility(partIds);

  const consumedCount = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM stock_reservations WHERE order_id = ? AND status = 'consumed'",
    )
    .get(order.id).cnt;
  const stockConsumed = consumedCount >= partIds.length && partIds.length >= 3;

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
    progress: Math.max(0, Math.round(progress)),
    total_price: order.total_price || (quote ? quote.total_price : 0),
    estimated_days: order.estimated_days || 7,
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
    quote_generated_at: order.quote_generated_at,
    quote_confirmed_at: order.quote_confirmed_at,
    quote_confirmed_by: order.quote_confirmed_by,
    quote_valid_hours: order.quote_valid_hours || 24,
    quote_expired: quoteExpired,
    stock_reserved: order.stock_reserved || 0,
    stock_consumed: stockConsumed,
    compatibility: compatibility,
    can_assemble:
      stockConsumed && compatibility.compatible && partIds.length >= 3,
    quote: quote,
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
      const partsWithEffective = parts.map((p) => ({
        ...p,
        effective_stock: getEffectiveStock(p.id),
      }));
      return { ...cat, count: parts.length, parts: partsWithEffective };
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
  const rawParts = db.prepare(query).all(...params);
  const parts = rawParts.map((p) => ({
    ...p,
    effective_stock: getEffectiveStock(p.id),
  }));
  res.json(parts);
});

app.get("/api/parts/:id", (req, res) => {
  const part = db
    .prepare("SELECT * FROM parts WHERE id = ?")
    .get(req.params.id);
  if (!part) return res.status(404).json({ error: "配件不存在" });
  res.json({ ...part, effective_stock: getEffectiveStock(part.id) });
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
  res.json({ ...part, effective_stock: getEffectiveStock(part.id) });
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
  const formatted = formatOrder(order);
  formatted.reservations = getStockReservations(req.params.id);
  res.json(formatted);
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
    INSERT INTO orders (order_no, customer_name, customer_phone, use_type, height, riding_style, budget, color_preference, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
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
  ).run(result.lastInsertRowid, "draft", "系统", "订单创建（草稿报价）");

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

  if (
    existingOrder.status === "preparing" ||
    existingOrder.status === "assembling" ||
    existingOrder.status === "debugging" ||
    existingOrder.status === "ready" ||
    existingOrder.status === "delivered"
  ) {
    return res.status(400).json({ error: "订单已进入生产阶段，无法修改配置" });
  }

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
  const stockOccupation = [];

  for (const pid of partIds) {
    const part = db.prepare("SELECT * FROM parts WHERE id = ?").get(pid);
    if (part) {
      totalPrice += part.price;
      const effective = getEffectiveStock(pid);
      stockOccupation.push({
        part_id: pid,
        name: part.name,
        category: part.category,
        original_stock: part.stock,
        effective_stock: effective,
        after_reservation: effective - 1,
      });
      if (effective <= 0) {
        stockIssues.push(`${part.name} (可用库存不足)`);
      }
    }
  }

  const compat = checkCompatibility(partIds);

  let newStatus = existingOrder.status;
  if (newStatus === "quote_pending") {
    releaseStockReservations(orderId);
    newStatus = "draft";
    db.prepare(
      `INSERT INTO order_status_logs (order_id, status, operator, remark)
       VALUES (?, ?, ?, ?)`,
    ).run(orderId, "draft", "顾问", "修改配置，报价回退为草稿");
  }

  db.prepare(
    `
    UPDATE orders SET
      frame_id = ?, wheelset_id = ?, drivetrain_id = ?,
      saddle_id = ?, handlebar_id = ?, smart_accessory_id = ?,
      total_price = ?, estimated_days = ?, status = ?,
      quote_generated_at = NULL, quote_confirmed_at = NULL,
      quote_confirmed_by = NULL, updated_at = CURRENT_TIMESTAMP
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
    newStatus,
    orderId,
  );

  const order = getOrderById.get(orderId);
  res.json({
    ...formatOrder(order),
    stock_issues: stockIssues,
    stock_occupation: stockOccupation,
    compatibility: compat,
    can_generate_quote:
      stockIssues.length === 0 && compat.compatible && partIds.length >= 3,
  });
});

app.post("/api/orders/:id/generate-quote", (req, res) => {
  const orderId = req.params.id;
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!existing) return res.status(404).json({ error: "订单不存在" });

  if (existing.status !== "draft") {
    return res.status(400).json({
      error: `只有「草稿报价」状态才能生成报价，当前状态：${
        ORDER_STATUSES.find((s) => s.key === existing.status)?.label ||
        existing.status
      }`,
    });
  }

  const partIds = [
    existing.frame_id,
    existing.wheelset_id,
    existing.drivetrain_id,
    existing.saddle_id,
    existing.handlebar_id,
    existing.smart_accessory_id,
  ].filter(Boolean);

  if (partIds.length < 3) {
    return res.status(400).json({ error: "至少需要配置车架、轮组和传动系统" });
  }

  for (const pid of partIds) {
    if (getEffectiveStock(pid) <= 0) {
      const p = db.prepare("SELECT name FROM parts WHERE id = ?").get(pid);
      return res
        .status(400)
        .json({ error: `配件 ${p?.name || "未知"} 库存不足，无法生成报价` });
    }
  }

  const compat = checkCompatibility(partIds);
  if (!compat.compatible) {
    return res.status(400).json({
      error: "存在兼容性冲突",
      compatibility_issues: compat.issues,
    });
  }

  const order = getOrderById.get(orderId);
  const quote = buildQuoteBreakdown(order);

  createStockReservations(orderId, partIds);

  db.prepare(
    `UPDATE orders SET
       status = 'quote_pending',
       quote_generated_at = CURRENT_TIMESTAMP,
       quote_confirmed_at = NULL,
       quote_confirmed_by = NULL,
       total_price = ?,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(quote.total_price, orderId);

  db.prepare(
    `INSERT INTO order_status_logs (order_id, status, operator, remark)
     VALUES (?, ?, ?, ?)`,
  ).run(
    orderId,
    "quote_pending",
    req.body?.operator || "顾问",
    "报价生成并提交客户确认",
  );

  const updated = getOrderById.get(orderId);
  res.json({
    ...formatOrder(updated),
    quote: quote,
    stock_occupation: getStockReservations(orderId),
  });
});

app.post("/api/orders/:id/confirm-quote", (req, res) => {
  const orderId = req.params.id;
  const { operator = "客户" } = req.body;
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!existing) return res.status(404).json({ error: "订单不存在" });

  if (existing.status !== "quote_pending") {
    return res.status(400).json({ error: "当前订单状态不可确认报价" });
  }

  if (isQuoteExpired(existing)) {
    releaseStockReservations(orderId);
    db.prepare(
      "UPDATE orders SET status = 'draft', quote_generated_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(orderId);
    db.prepare(
      `INSERT INTO order_status_logs (order_id, status, operator, remark)
       VALUES (?, ?, ?, ?)`,
    ).run(orderId, "draft", "系统", "报价已过期，回退为草稿");
    return res.status(400).json({ error: "报价已过期，请重新生成" });
  }

  const reservations = getStockReservations(orderId);
  for (const r of reservations) {
    if (getEffectiveStock(r.part_id) < 0) {
      return res
        .status(400)
        .json({ error: `配件 ${r.part_name} 库存发生变化，请重新生成报价` });
    }
  }

  consumeStockReservations(orderId);

  db.prepare(
    `UPDATE orders SET
       status = 'preparing',
       quote_confirmed_at = CURRENT_TIMESTAMP,
       quote_confirmed_by = ?,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(operator, orderId);

  db.prepare(
    `INSERT INTO order_status_logs (order_id, status, operator, remark)
     VALUES (?, ?, ?, ?)`,
  ).run(orderId, "preparing", operator, "客户确认报价，进入备料阶段");

  const updated = getOrderById.get(orderId);
  res.json(formatOrder(updated));
});

app.post("/api/orders/:id/cancel-quote", (req, res) => {
  const orderId = req.params.id;
  const { operator = "顾问", reason = "" } = req.body;
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!existing) return res.status(404).json({ error: "订单不存在" });

  if (existing.status !== "quote_pending" && existing.status !== "draft") {
    return res.status(400).json({ error: "当前订单状态不可取消报价" });
  }

  releaseStockReservations(orderId);

  db.prepare(
    `UPDATE orders SET
       status = 'draft',
       quote_generated_at = NULL,
       quote_confirmed_at = NULL,
       quote_confirmed_by = NULL,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(orderId);

  db.prepare(
    `INSERT INTO order_status_logs (order_id, status, operator, remark)
     VALUES (?, ?, ?, ?)`,
  ).run(orderId, "draft", operator, `取消报价${reason ? `：${reason}` : ""}`);

  const updated = getOrderById.get(orderId);
  res.json(formatOrder(updated));
});

app.get("/api/orders/:id/reservations", (req, res) => {
  const reservations = getStockReservations(req.params.id);
  res.json(reservations);
});

function validateStatusTransition(currentStatus, targetStatus) {
  const currentInfo = ORDER_STATUSES.find((s) => s.key === currentStatus);
  const targetInfo = ORDER_STATUSES.find((s) => s.key === targetStatus);
  if (!currentInfo || !targetInfo)
    return { valid: false, reason: "无效的状态" };

  if (currentStatus === "delivered") {
    return { valid: false, reason: "已交付的订单不能修改状态" };
  }

  const currentStep = currentInfo.step;
  const targetStep = targetInfo.step;
  const stepDiff = targetStep - currentStep;

  if (stepDiff === 0) {
    return { valid: false, reason: "状态未发生变化" };
  }

  if (stepDiff > 1) {
    return {
      valid: false,
      reason: `不能从「${currentInfo.label}」直接跳转到「${targetInfo.label}」，请按业务顺序逐步推进`,
    };
  }

  if (stepDiff < -1) {
    return {
      valid: false,
      reason: `不能从「${currentInfo.label}」回退到「${targetInfo.label}」，只能回退到上一个状态`,
    };
  }

  if (targetStatus === "delivered" && currentStatus !== "ready") {
    return {
      valid: false,
      reason: `只有「可取车」状态才能交付，当前状态「${currentInfo.label}」不能直接交付`,
    };
  }

  if (
    ["assembling", "debugging", "ready"].includes(currentStatus) &&
    ["draft", "quote_pending"].includes(targetStatus)
  ) {
    return {
      valid: false,
      reason: `生产阶段的订单不能回退到报价阶段`,
    };
  }

  return { valid: true };
}

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

  const transition = validateStatusTransition(existingOrder.status, status);
  if (!transition.valid) {
    return res.status(400).json({ error: transition.reason });
  }

  const partIds = [
    existingOrder.frame_id,
    existingOrder.wheelset_id,
    existingOrder.drivetrain_id,
    existingOrder.saddle_id,
    existingOrder.handlebar_id,
    existingOrder.smart_accessory_id,
  ].filter(Boolean);

  if (existingOrder.status === "draft") {
    if (status === "quote_pending") {
      return res.status(400).json({
        error:
          "请通过「生成报价」接口提交报价（POST /generate-quote），不要直接修改状态",
      });
    }
  }

  if (existingOrder.status === "quote_pending") {
    if (status === "preparing") {
      return res.status(400).json({
        error:
          "请通过「确认报价」接口确认（POST /confirm-quote），不要直接修改状态",
      });
    }
    if (status === "draft") {
      return res.status(400).json({
        error:
          "请通过「取消报价」接口取消（POST /cancel-quote），不要直接修改状态",
      });
    }
  }

  if (existingOrder.status === "preparing" && status === "assembling") {
    if (partIds.length < 3) {
      return res.status(400).json({
        error: "至少需要配置车架、轮组和传动系统才能开始装配",
      });
    }

    const compat = checkCompatibility(partIds);
    if (!compat.compatible) {
      return res.status(400).json({
        error: "存在兼容性冲突，无法进入装配阶段",
        compatibility_issues: compat.issues,
      });
    }

    const consumedReservations = db
      .prepare(
        "SELECT COUNT(*) as cnt FROM stock_reservations WHERE order_id = ? AND status = 'consumed'",
      )
      .get(orderId).cnt;
    if (consumedReservations === 0) {
      return res.status(400).json({
        error: "库存尚未扣减，请先确认报价完成备料后再进入装配",
      });
    }

    const stockIssues = [];
    for (const pid of partIds) {
      const part = db.prepare("SELECT * FROM parts WHERE id = ?").get(pid);
      const consumed = db
        .prepare(
          "SELECT COALESCE(SUM(quantity), 0) as qty FROM stock_reservations WHERE order_id = ? AND part_id = ? AND status = 'consumed'",
        )
        .get(orderId, pid).qty;
      if (part && consumed < 1) {
        stockIssues.push(part.name);
      }
    }
    if (stockIssues.length > 0) {
      return res.status(400).json({
        error: `以下配件未完成库存扣减，无法进入装配: ${stockIssues.join(", ")}`,
      });
    }
  }

  if (existingOrder.status === "assembling" && status === "debugging") {
  }

  if (existingOrder.status === "debugging" && status === "ready") {
  }

  if (existingOrder.status === "preparing" && status === "quote_pending") {
    rollbackStockConsumption(orderId);
    db.prepare(
      "UPDATE orders SET quote_confirmed_at = NULL, quote_confirmed_by = NULL, stock_reserved = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(orderId);
  }

  if (existingOrder.status === "quote_pending" && status === "draft") {
    releaseStockReservations(orderId);
    db.prepare(
      "UPDATE orders SET quote_generated_at = NULL, quote_confirmed_at = NULL, quote_confirmed_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(orderId);
  }

  if (
    ["assembling", "debugging", "ready"].includes(existingOrder.status) &&
    ["draft", "quote_pending"].includes(status)
  ) {
    return res.status(400).json({
      error: `生产阶段的订单不能回退到报价阶段`,
    });
  }

  if (existingOrder.status === "delivered") {
    return res.status(400).json({
      error: "已交付的订单不能修改状态",
    });
  }

  if (status === "preparing" && existingOrder.status !== "quote_pending") {
    const stockIssues = [];
    for (const pid of partIds) {
      const eff = getEffectiveStock(pid);
      const part = db.prepare("SELECT * FROM parts WHERE id = ?").get(pid);
      if (part && eff < 0) {
        stockIssues.push(part.name);
      }
    }
    if (stockIssues.length > 0) {
      return res
        .status(400)
        .json({ error: `库存不足: ${stockIssues.join(", ")}` });
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

app.get("/api/compatibility/check", (req, res) => {
  const { part_ids } = req.query;
  if (!part_ids) return res.json({ compatible: true, issues: [] });
  const ids = part_ids.split(",").map(Number).filter(Boolean);
  res.json(checkCompatibility(ids));
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
    WHERE status IN ('preparing', 'assembling', 'debugging', 'ready')
    AND date(created_at, '+' || estimated_days || ' days') < date('now')
  `,
    )
    .get().count;

  const quoteExpiredCount = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM orders
    WHERE status = 'quote_pending'
    AND datetime(quote_generated_at, '+' || COALESCE(quote_valid_hours, 24) || ' hours') < datetime('now')
  `,
    )
    .get().count;

  const totalParts = db
    .prepare("SELECT COUNT(*) as count FROM parts")
    .get().count;

  const lowStockParts = db
    .prepare("SELECT COUNT(*) as count FROM parts WHERE stock <= 0")
    .get().count;

  const reservedCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM stock_reservations WHERE status = 'reserved'",
    )
    .get().count;

  res.json({
    status_counts: statusCounts,
    overdue_count: overdueCount,
    quote_expired_count: quoteExpiredCount,
    total_parts: totalParts,
    low_stock_parts: lowStockParts,
    reserved_stock_count: reservedCount,
  });
});

app.get("/api/stats/reservations", (req, res) => {
  const data = db
    .prepare(
      `SELECT p.id, p.name, p.category, p.stock,
              COALESCE(SUM(CASE WHEN r.status = 'reserved' THEN r.quantity ELSE 0 END), 0) as reserved_qty,
              (p.stock - COALESCE(SUM(CASE WHEN r.status = 'reserved' THEN r.quantity ELSE 0 END), 0)) as available_qty
       FROM parts p
       LEFT JOIN stock_reservations r ON p.id = r.part_id
       GROUP BY p.id
       HAVING reserved_qty > 0 OR p.stock <= 3
       ORDER BY available_qty ASC`,
    )
    .all();
  res.json(data);
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

    query +=
      " ORDER BY (stock - COALESCE((SELECT SUM(quantity) FROM stock_reservations WHERE part_id = parts.id AND status = 'reserved'), 0)) > 0 DESC, price ASC LIMIT 3";
    const raw = db.prepare(query).all(...params);
    recommendations[cat] = raw.map((p) => ({
      ...p,
      effective_stock: getEffectiveStock(p.id),
    }));
  }

  let smartQuery =
    "SELECT * FROM parts WHERE category = ? AND (suitable_use = ? OR suitable_use = ?) ORDER BY price ASC LIMIT 3";
  const rawSmart = db
    .prepare(smartQuery)
    .all("smart_accessory", use_type, "all");
  recommendations["smart_accessory"] = rawSmart.map((p) => ({
    ...p,
    effective_stock: getEffectiveStock(p.id),
  }));

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
