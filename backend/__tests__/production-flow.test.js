process.env.DB_PATH = ":memory:";

const request = require("supertest");
const { db } = require("../database");
const app = require("../server");

function seedTestParts() {
  const parts = [
    {
      category: "frame",
      name: "测试车架A",
      brand: "TestBrand",
      price: 1200,
      stock: 10,
      specs: "铝合金 700C",
      color: "黑色",
      suitable_use: "commute",
      min_height: 155,
      max_height: 185,
    },
    {
      category: "wheelset",
      name: "测试轮组B",
      brand: "TestBrand",
      price: 800,
      stock: 5,
      specs: "铝合金 32辐条",
      color: "黑色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "wheelset",
      name: "缺货轮组C",
      brand: "TestBrand",
      price: 900,
      stock: 0,
      specs: "碳纤维 50mm框高",
      color: "黑色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "drivetrain",
      name: "测试传动D",
      brand: "TestBrand",
      price: 600,
      stock: 8,
      specs: "3x10速",
      color: "银色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "saddle",
      name: "测试座垫E",
      brand: "TestBrand",
      price: 200,
      stock: 15,
      specs: "凝胶填充 宽型",
      color: "黑色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "handlebar",
      name: "测试把组F",
      brand: "TestBrand",
      price: 300,
      stock: 12,
      specs: "铝合金直把 600mm",
      color: "黑色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "handlebar",
      name: "不兼容把组G",
      brand: "TestBrand",
      price: 400,
      stock: 10,
      specs: "碳纤维弯把",
      color: "红色",
      suitable_use: "race",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "smart_accessory",
      name: "测试码表H",
      brand: "TestBrand",
      price: 500,
      stock: 10,
      specs: "GPS 心率监测",
      color: "黑色",
      suitable_use: "all",
      min_height: 150,
      max_height: 200,
    },
  ];

  const insertPart = db.prepare(`
    INSERT INTO parts (id, category, name, brand, price, stock, specs, color, suitable_use, min_height, max_height)
    VALUES (@id, @category, @name, @brand, @price, @stock, @specs, @color, @suitable_use, @min_height, @max_height)
  `);
  const insertMany = db.transaction((list) => {
    for (const p of list) insertPart.run(p);
  });
  const withIds = parts.map((p, i) => ({ ...p, id: i + 1 }));
  insertMany(withIds);
  return withIds;
}

function seedCompatibilityRule(partAId, partBId) {
  db.prepare(
    "INSERT INTO compatibility_rules (part_a_id, part_b_id, compatible, note) VALUES (?, ?, 0, ?)",
  ).run(partAId, partBId, "车架与把组不兼容");
}

function cleanAllTables() {
  db.exec("DELETE FROM adjustment_status_logs");
  db.exec("DELETE FROM order_status_logs");
  db.exec("DELETE FROM stock_reservations");
  db.exec("DELETE FROM adjustments");
  db.exec("DELETE FROM orders");
  db.exec("DELETE FROM compatibility_rules");
  db.exec("DELETE FROM parts");
  db.exec("DELETE FROM sqlite_sequence");
}

const PART_IDS = {
  frame: 1,
  wheelset: 2,
  wheelset_no_stock: 3,
  drivetrain: 4,
  saddle: 5,
  handlebar: 6,
  handlebar_incompatible: 7,
  smart_accessory: 8,
};

async function createAndConfigureOrder(config = {}) {
  const {
    customer_name = "测试客户",
    customer_phone = "19900001111",
    use_type = "commute",
    height = 175,
    riding_style = "upright",
    budget = 8000,
    color_preference = "黑色",
    frame_id = PART_IDS.frame,
    wheelset_id = PART_IDS.wheelset,
    drivetrain_id = PART_IDS.drivetrain,
    saddle_id = PART_IDS.saddle,
    handlebar_id = PART_IDS.handlebar,
    smart_accessory_id = PART_IDS.smart_accessory,
    estimated_days = 7,
  } = config;

  const createRes = await request(app).post("/api/orders").send({
    customer_name,
    customer_phone,
    use_type,
    height,
    riding_style,
    budget,
    color_preference,
  });

  const orderId = createRes.body.id;

  await request(app).put(`/api/orders/${orderId}/configure`).send({
    frame_id,
    wheelset_id,
    drivetrain_id,
    saddle_id,
    handlebar_id,
    smart_accessory_id,
    estimated_days,
  });

  return orderId;
}

describe("定制生产流程自动化测试", () => {
  beforeEach(() => {
    cleanAllTables();
    seedTestParts();
  });

  describe("完整正向流程：客户提交需求 → 顾问配置报价 → 客户确认 → 备料 → 装配 → 调试 → 可取车 → 交付", () => {
    test("完整生命周期走通", async () => {
      const createRes = await request(app).post("/api/orders").send({
        customer_name: "流程测试客户",
        customer_phone: "19900002222",
        use_type: "commute",
        height: 175,
        riding_style: "upright",
        budget: 8000,
        color_preference: "黑色",
      });

      expect(createRes.status).toBe(201);
      expect(createRes.body.status).toBe("draft");
      expect(createRes.body.customer_name).toBe("流程测试客户");
      const orderId = createRes.body.id;

      const configureRes = await request(app)
        .put(`/api/orders/${orderId}/configure`)
        .send({
          frame_id: PART_IDS.frame,
          wheelset_id: PART_IDS.wheelset,
          drivetrain_id: PART_IDS.drivetrain,
          saddle_id: PART_IDS.saddle,
          handlebar_id: PART_IDS.handlebar,
          smart_accessory_id: PART_IDS.smart_accessory,
          estimated_days: 7,
        });

      expect(configureRes.status).toBe(200);
      expect(configureRes.body.frame_id).toBe(PART_IDS.frame);
      expect(configureRes.body.wheelset_id).toBe(PART_IDS.wheelset);

      const quoteRes = await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问小测" });

      expect(quoteRes.status).toBe(200);
      expect(quoteRes.body.status).toBe("quote_pending");
      expect(quoteRes.body.quote).toBeDefined();
      expect(quoteRes.body.quote.total_price).toBeGreaterThan(0);
      expect(quoteRes.body.stock_reserved).toBe(1);

      const reservationsRes = await request(app).get(
        `/api/orders/${orderId}/reservations`,
      );

      expect(reservationsRes.status).toBe(200);
      expect(reservationsRes.body.length).toBe(6);
      reservationsRes.body.forEach((r) => {
        expect(r.status).toBe("reserved");
      });

      const confirmRes = await request(app)
        .post(`/api/orders/${orderId}/confirm-quote`)
        .send({ operator: "流程测试客户" });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.status).toBe("preparing");

      const preparingToAssembling = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({
          status: "assembling",
          operator: "装配师小测",
          remark: "备料完成，开始装配",
        });

      expect(preparingToAssembling.status).toBe(200);
      expect(preparingToAssembling.body.status).toBe("assembling");

      const assemblingToDebugging = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({
          status: "debugging",
          operator: "调试师小测",
          remark: "装配完成，进入调试",
        });

      expect(assemblingToDebugging.status).toBe(200);
      expect(assemblingToDebugging.body.status).toBe("debugging");

      const debuggingToReady = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({
          status: "ready",
          operator: "调试师小测",
          remark: "调试通过，可取车",
        });

      expect(debuggingToReady.status).toBe(200);
      expect(debuggingToReady.body.status).toBe("ready");

      const readyToDelivered = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({
          status: "delivered",
          operator: "前台小测",
          remark: "客户已取车",
        });

      expect(readyToDelivered.status).toBe(200);
      expect(readyToDelivered.body.status).toBe("delivered");
      expect(readyToDelivered.body.delivered_at).toBeTruthy();

      const logsRes = await request(app).get(`/api/orders/${orderId}/logs`);

      expect(logsRes.status).toBe(200);
      const statusChain = logsRes.body.map((l) => l.status);
      expect(statusChain).toEqual([
        "draft",
        "quote_pending",
        "preparing",
        "assembling",
        "debugging",
        "ready",
        "delivered",
      ]);
    });
  });

  describe("边界测试：轮组库存不足不能确认报价", () => {
    test("生成报价时轮组库存不足应被拒绝", async () => {
      const orderId = await createAndConfigureOrder({
        wheelset_id: PART_IDS.wheelset_no_stock,
      });

      const quoteRes = await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问小测" });

      expect(quoteRes.status).toBe(400);
      expect(quoteRes.body.error).toMatch(/库存不足/);
    });

    test("配置时轮组库存不足应标记 stock_issues", async () => {
      const createRes = await request(app)
        .post("/api/orders")
        .send({ customer_name: "缺货客户", use_type: "commute", height: 175 });

      const orderId = createRes.body.id;

      const configureRes = await request(app)
        .put(`/api/orders/${orderId}/configure`)
        .send({
          frame_id: PART_IDS.frame,
          wheelset_id: PART_IDS.wheelset_no_stock,
          drivetrain_id: PART_IDS.drivetrain,
          saddle_id: PART_IDS.saddle,
          handlebar_id: PART_IDS.handlebar,
          smart_accessory_id: PART_IDS.smart_accessory,
        });

      expect(configureRes.status).toBe(200);
      expect(configureRes.body.stock_issues.length).toBeGreaterThan(0);
      expect(configureRes.body.can_generate_quote).toBe(false);
    });
  });

  describe("边界测试：不兼容配置会被拒绝", () => {
    test("生成报价时存在兼容性冲突应被拒绝", async () => {
      seedCompatibilityRule(PART_IDS.frame, PART_IDS.handlebar_incompatible);

      const orderId = await createAndConfigureOrder({
        handlebar_id: PART_IDS.handlebar_incompatible,
      });

      const quoteRes = await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问小测" });

      expect(quoteRes.status).toBe(400);
      expect(quoteRes.body.error).toMatch(/兼容性冲突/);
    });

    test("兼容性检查接口返回不兼容结果", async () => {
      seedCompatibilityRule(PART_IDS.frame, PART_IDS.handlebar_incompatible);

      const checkRes = await request(app)
        .get("/api/compatibility/check")
        .query({
          part_ids: `${PART_IDS.frame},${PART_IDS.handlebar_incompatible}`,
        });

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.compatible).toBe(false);
      expect(checkRes.body.issues.length).toBeGreaterThan(0);
      expect(checkRes.body.issues[0].note).toBeTruthy();
    });

    test("兼容配置应通过检查", async () => {
      const checkRes = await request(app)
        .get("/api/compatibility/check")
        .query({
          part_ids: `${PART_IDS.frame},${PART_IDS.wheelset},${PART_IDS.drivetrain},${PART_IDS.saddle},${PART_IDS.handlebar},${PART_IDS.smart_accessory}`,
        });

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.compatible).toBe(true);
      expect(checkRes.body.issues).toEqual([]);
    });
  });

  describe("边界测试：状态不能跳步", () => {
    test("草稿不能直接跳到装配", async () => {
      const orderId = await createAndConfigureOrder();

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "assembling", operator: "测试" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/跳转|逐步/);
    });

    test("草稿不能直接跳到可取车", async () => {
      const orderId = await createAndConfigureOrder();

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "ready", operator: "测试" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/跳转|逐步/);
    });

    test("备料不能直接跳到调试", async () => {
      const orderId = await createAndConfigureOrder();

      await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问小测" });

      await request(app)
        .post(`/api/orders/${orderId}/confirm-quote`)
        .send({ operator: "客户" });

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "debugging", operator: "测试" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/跳转|逐步/);
    });

    test("装配不能直接跳到交付", async () => {
      const orderId = await createAndConfigureOrder();

      await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问" });
      await request(app)
        .post(`/api/orders/${orderId}/confirm-quote`)
        .send({ operator: "客户" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "assembling", operator: "装配师" });

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "delivered", operator: "测试" });

      expect(res.status).toBe(400);
    });

    test("草稿不能通过 status 接口转到待确认（必须走 generate-quote）", async () => {
      const orderId = await createAndConfigureOrder();

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "quote_pending", operator: "测试" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/生成报价/);
    });

    test("待确认不能通过 status 接口转到备料（必须走 confirm-quote）", async () => {
      const orderId = await createAndConfigureOrder();

      await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问" });

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "preparing", operator: "测试" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/确认报价|generate-quote|confirm/);
    });

    test("已交付订单不能再改状态", async () => {
      const orderId = await createAndConfigureOrder();

      await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问" });
      await request(app)
        .post(`/api/orders/${orderId}/confirm-quote`)
        .send({ operator: "客户" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "assembling", operator: "装配师" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "debugging", operator: "调试师" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "ready", operator: "调试师" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "delivered", operator: "前台" });

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "ready", operator: "测试" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/已交付|交付/);
    });

    test("生产阶段不能回退到报价阶段", async () => {
      const orderId = await createAndConfigureOrder();

      await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问" });
      await request(app)
        .post(`/api/orders/${orderId}/confirm-quote`)
        .send({ operator: "客户" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "assembling", operator: "装配师" });

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "quote_pending", operator: "测试" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/回退|生产阶段|报价阶段/);
    });
  });

  describe("边界测试：取消订单会释放预占库存", () => {
    test("取消报价后库存预占记录变为 released", async () => {
      const orderId = await createAndConfigureOrder();

      await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问小测" });

      const reservationsBefore = await request(app).get(
        `/api/orders/${orderId}/reservations`,
      );
      expect(
        reservationsBefore.body.every((r) => r.status === "reserved"),
      ).toBe(true);

      const partId = PART_IDS.wheelset;
      const effectiveStockBefore = await request(app).get(
        `/api/parts/${partId}`,
      );
      const stockBefore = effectiveStockBefore.body.effective_stock;

      const cancelRes = await request(app)
        .post(`/api/orders/${orderId}/cancel-quote`)
        .send({ operator: "顾问小测", reason: "客户取消" });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe("draft");

      const reservationsAfter = await request(app).get(
        `/api/orders/${orderId}/reservations`,
      );
      expect(reservationsAfter.body.every((r) => r.status === "released")).toBe(
        true,
      );

      const effectiveStockAfter = await request(app).get(
        `/api/parts/${partId}`,
      );
      const stockAfter = effectiveStockAfter.body.effective_stock;
      expect(stockAfter).toBeGreaterThan(stockBefore);
    });

    test("取消后库存恢复为可用，另一个订单可以正常使用", async () => {
      const part = db
        .prepare("SELECT stock FROM parts WHERE id = ?")
        .get(PART_IDS.wheelset);
      const wheelsetStock = part.stock;
      expect(wheelsetStock).toBe(5);

      const orderId1 = await createAndConfigureOrder({
        customer_name: "客户A",
        customer_phone: "19900003333",
      });

      await request(app)
        .post(`/api/orders/${orderId1}/generate-quote`)
        .send({ operator: "顾问" });

      const effective1 = await request(app).get(
        `/api/parts/${PART_IDS.wheelset}`,
      );
      expect(effective1.body.effective_stock).toBe(wheelsetStock - 1);

      await request(app)
        .post(`/api/orders/${orderId1}/cancel-quote`)
        .send({ operator: "顾问", reason: "客户改主意" });

      const effective2 = await request(app).get(
        `/api/parts/${PART_IDS.wheelset}`,
      );
      expect(effective2.body.effective_stock).toBe(wheelsetStock);

      const orderId2 = await createAndConfigureOrder({
        customer_name: "客户B",
        customer_phone: "19900004444",
      });

      const quoteRes = await request(app)
        .post(`/api/orders/${orderId2}/generate-quote`)
        .send({ operator: "顾问" });

      expect(quoteRes.status).toBe(200);
      expect(quoteRes.body.status).toBe("quote_pending");
    });
  });

  describe("边界测试：超期订单会出现在预警里", () => {
    test("超期订单出现在 stats.overdue_count 中", async () => {
      const orderId = await createAndConfigureOrder({ estimated_days: 7 });

      await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问" });
      await request(app)
        .post(`/api/orders/${orderId}/confirm-quote`)
        .send({ operator: "客户" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "assembling", operator: "装配师" });

      const statsBefore = await request(app).get("/api/stats");
      expect(statsBefore.body.overdue_count).toBe(0);

      const tenDaysAgo = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000,
      ).toISOString();
      db.prepare("UPDATE orders SET created_at = ? WHERE id = ?").run(
        tenDaysAgo,
        orderId,
      );

      const statsAfter = await request(app).get("/api/stats");
      expect(statsAfter.body.overdue_count).toBeGreaterThan(0);
    });

    test("订单详情 is_overdue 字段在超期后为 true", async () => {
      const orderId = await createAndConfigureOrder({ estimated_days: 7 });

      await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问" });
      await request(app)
        .post(`/api/orders/${orderId}/confirm-quote`)
        .send({ operator: "客户" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "assembling", operator: "装配师" });

      const detailBefore = await request(app).get(`/api/orders/${orderId}`);
      expect(detailBefore.body.is_overdue).toBe(false);

      const tenDaysAgo = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000,
      ).toISOString();
      db.prepare("UPDATE orders SET created_at = ? WHERE id = ?").run(
        tenDaysAgo,
        orderId,
      );

      const detailAfter = await request(app).get(`/api/orders/${orderId}`);
      expect(detailAfter.body.is_overdue).toBe(true);
      expect(detailAfter.body.days_remaining).toBeLessThan(0);
    });

    test("已交付订单不算超期", async () => {
      const orderId = await createAndConfigureOrder({ estimated_days: 7 });

      await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问" });
      await request(app)
        .post(`/api/orders/${orderId}/confirm-quote`)
        .send({ operator: "客户" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "assembling", operator: "装配师" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "debugging", operator: "调试师" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "ready", operator: "调试师" });
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: "delivered", operator: "前台" });

      const tenDaysAgo = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000,
      ).toISOString();
      db.prepare("UPDATE orders SET created_at = ? WHERE id = ?").run(
        tenDaysAgo,
        orderId,
      );

      const detail = await request(app).get(`/api/orders/${orderId}`);
      expect(detail.body.is_overdue).toBe(false);
    });
  });

  describe("额外边界：报价过期处理", () => {
    test("过期报价确认时应被拒绝并回退为草稿", async () => {
      const orderId = await createAndConfigureOrder();

      await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问" });

      const twoDaysAgo = new Date(
        Date.now() - 48 * 60 * 60 * 1000,
      ).toISOString();
      db.prepare("UPDATE orders SET quote_generated_at = ? WHERE id = ?").run(
        twoDaysAgo,
        orderId,
      );

      const confirmRes = await request(app)
        .post(`/api/orders/${orderId}/confirm-quote`)
        .send({ operator: "客户" });

      expect(confirmRes.status).toBe(400);
      expect(confirmRes.body.error).toMatch(/过期/);

      const detailRes = await request(app).get(`/api/orders/${orderId}`);
      expect(detailRes.body.status).toBe("draft");
    });
  });

  describe("额外边界：最少配件要求", () => {
    test("只配置车架无法生成报价", async () => {
      const createRes = await request(app)
        .post("/api/orders")
        .send({ customer_name: "配件不足客户", use_type: "commute" });

      const orderId = createRes.body.id;

      await request(app)
        .put(`/api/orders/${orderId}/configure`)
        .send({ frame_id: PART_IDS.frame });

      const quoteRes = await request(app)
        .post(`/api/orders/${orderId}/generate-quote`)
        .send({ operator: "顾问" });

      expect(quoteRes.status).toBe(400);
      expect(quoteRes.body.error).toMatch(/至少需要/);
    });
  });
});
