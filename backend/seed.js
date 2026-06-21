const { db, initDB } = require("./database");

function seedData() {
  initDB();

  const existingParts = db.prepare("SELECT COUNT(*) as count FROM parts").get();
  if (existingParts.count > 0) {
    console.log("数据已存在，跳过种子数据导入");
    return;
  }

  const parts = [
    // 车架 - 通勤
    {
      category: "frame",
      name: "城市通勤车架",
      brand: "CityBike",
      price: 1200,
      stock: 15,
      specs: "铝合金 700C",
      color: "黑色",
      suitable_use: "commute",
      min_height: 155,
      max_height: 185,
    },
    {
      category: "frame",
      name: "轻便通勤车架",
      brand: "LightGo",
      price: 800,
      stock: 20,
      specs: "高碳钢 26寸",
      color: "白色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 180,
    },
    // 车架 - 长途
    {
      category: "frame",
      name: "长途旅行车架",
      brand: "TourMaster",
      price: 2500,
      stock: 8,
      specs: "铬钼钢 700C",
      color: "蓝色",
      suitable_use: "longdistance",
      min_height: 160,
      max_height: 190,
    },
    {
      category: "frame",
      name: "探险长途车架",
      brand: "Explorer",
      price: 3200,
      stock: 5,
      specs: "钛合金 700C",
      color: "钛色",
      suitable_use: "longdistance",
      min_height: 165,
      max_height: 195,
    },
    // 车架 - 竞赛
    {
      category: "frame",
      name: "公路竞赛车架",
      brand: "SpeedPro",
      price: 8000,
      stock: 3,
      specs: "碳纤维 700C",
      color: "红色",
      suitable_use: "race",
      min_height: 165,
      max_height: 190,
    },
    {
      category: "frame",
      name: "气动竞赛车架",
      brand: "AeroX",
      price: 12000,
      stock: 2,
      specs: "全碳纤维 700C",
      color: "黑色",
      suitable_use: "race",
      min_height: 170,
      max_height: 195,
    },
    // 车架 - 亲子
    {
      category: "frame",
      name: "亲子双人车架",
      brand: "FamilyRide",
      price: 3500,
      stock: 4,
      specs: "铝合金 26寸",
      color: "黄色",
      suitable_use: "family",
      min_height: 155,
      max_height: 185,
    },
    {
      category: "frame",
      name: "带娃通勤车架",
      brand: "KidCarry",
      price: 2800,
      stock: 6,
      specs: "铝合金 700C",
      color: "粉色",
      suitable_use: "family",
      min_height: 155,
      max_height: 180,
    },

    // 轮组 - 通勤
    {
      category: "wheelset",
      name: "城市通勤轮组",
      brand: "CityWheel",
      price: 600,
      stock: 20,
      specs: "铝合金 32辐条",
      color: "黑色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "wheelset",
      name: "防刺通勤轮组",
      brand: "FlatGuard",
      price: 900,
      stock: 12,
      specs: "铝合金 加厚胎垫",
      color: "银色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    // 轮组 - 长途
    {
      category: "wheelset",
      name: "长途旅行轮组",
      brand: "TourWheel",
      price: 1500,
      stock: 8,
      specs: "双层铝圈 36辐条",
      color: "黑色",
      suitable_use: "longdistance",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "wheelset",
      name: "重载长途轮组",
      brand: "HeavyDuty",
      price: 2200,
      stock: 0,
      specs: "加强铝圈 40辐条",
      color: "银色",
      suitable_use: "longdistance",
      min_height: 150,
      max_height: 200,
    },
    // 轮组 - 竞赛
    {
      category: "wheelset",
      name: "碳刀竞赛轮组",
      brand: "CarbonRace",
      price: 6000,
      stock: 5,
      specs: "碳纤维 50mm框高",
      color: "黑色",
      suitable_use: "race",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "wheelset",
      name: "轻量爬坡轮组",
      brand: "ClimbPro",
      price: 8500,
      stock: 2,
      specs: "碳纤维 30mm框高",
      color: "黑色",
      suitable_use: "race",
      min_height: 150,
      max_height: 200,
    },
    // 轮组 - 亲子
    {
      category: "wheelset",
      name: "加强亲子轮组",
      brand: "FamilyWheel",
      price: 1200,
      stock: 6,
      specs: "加强铝圈 36辐条",
      color: "白色",
      suitable_use: "family",
      min_height: 150,
      max_height: 200,
    },

    // 传动 - 通勤
    {
      category: "drivetrain",
      name: "单速传动系统",
      brand: "SingleSpeed",
      price: 300,
      stock: 25,
      specs: "单速 皮带传动",
      color: "黑色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "drivetrain",
      name: "内三速传动",
      brand: "Nexus3",
      price: 800,
      stock: 15,
      specs: "内三速 罗拉刹车",
      color: "银色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    // 传动 - 长途
    {
      category: "drivetrain",
      name: "旅行变速系统",
      brand: "Deore",
      price: 1800,
      stock: 10,
      specs: "3x10速 长途版",
      color: "黑色",
      suitable_use: "longdistance",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "drivetrain",
      name: "越野长途传动",
      brand: "XT",
      price: 3500,
      stock: 5,
      specs: "2x11速 越野版",
      color: "黑色",
      suitable_use: "longdistance",
      min_height: 150,
      max_height: 200,
    },
    // 传动 - 竞赛
    {
      category: "drivetrain",
      name: "公路竞赛传动",
      brand: "DuraAce",
      price: 8000,
      stock: 3,
      specs: "2x12速 电子变速",
      color: "黑色",
      suitable_use: "race",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "drivetrain",
      name: "专业竞赛传动",
      brand: "SuperRecord",
      price: 15000,
      stock: 1,
      specs: "2x12速 顶级碳",
      color: "碳色",
      suitable_use: "race",
      min_height: 150,
      max_height: 200,
    },
    // 传动 - 亲子
    {
      category: "drivetrain",
      name: "亲子安全传动",
      brand: "SafeDrive",
      price: 1500,
      stock: 8,
      specs: "3x8速 护链罩",
      color: "黑色",
      suitable_use: "family",
      min_height: 150,
      max_height: 200,
    },

    // 座垫 - 通勤
    {
      category: "saddle",
      name: "舒适通勤座垫",
      brand: "Comfort+",
      price: 150,
      stock: 30,
      specs: "凝胶填充 宽型",
      color: "黑色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    // 座垫 - 长途
    {
      category: "saddle",
      name: "长途旅行座垫",
      brand: "Brooks",
      price: 1200,
      stock: 7,
      specs: "牛皮 弹簧避震",
      color: "棕色",
      suitable_use: "longdistance",
      min_height: 150,
      max_height: 200,
    },
    // 座垫 - 竞赛
    {
      category: "saddle",
      name: "碳轨竞赛座垫",
      brand: "SelleItalia",
      price: 1500,
      stock: 10,
      specs: "碳纤维导轨 窄型",
      color: "黑色",
      suitable_use: "race",
      min_height: 150,
      max_height: 200,
    },
    // 座垫 - 亲子
    {
      category: "saddle",
      name: "亲子舒适座垫",
      brand: "FamilyComfort",
      price: 200,
      stock: 12,
      specs: "超宽 加厚海绵",
      color: "灰色",
      suitable_use: "family",
      min_height: 150,
      max_height: 200,
    },

    // 把组 - 通勤
    {
      category: "handlebar",
      name: "城市直把",
      brand: "CityBar",
      price: 200,
      stock: 25,
      specs: "铝合金直把 600mm",
      color: "黑色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    // 把组 - 长途
    {
      category: "handlebar",
      name: "蝴蝶旅行把",
      brand: "Butterfly",
      price: 500,
      stock: 8,
      specs: "铝合金蝴蝶把",
      color: "银色",
      suitable_use: "longdistance",
      min_height: 150,
      max_height: 200,
    },
    // 把组 - 竞赛
    {
      category: "handlebar",
      name: "碳纤弯把",
      brand: "CarbonDrop",
      price: 1800,
      stock: 6,
      specs: "碳纤维 公路弯把",
      color: "黑色",
      suitable_use: "race",
      min_height: 150,
      max_height: 200,
    },
    // 把组 - 亲子
    {
      category: "handlebar",
      name: "高把立把组",
      brand: "HighRise",
      price: 300,
      stock: 10,
      specs: "铝合金高把立 直把",
      color: "白色",
      suitable_use: "family",
      min_height: 150,
      max_height: 200,
    },

    // 智能配件
    {
      category: "smart_accessory",
      name: "智能码表",
      brand: "SmartCycle",
      price: 500,
      stock: 20,
      specs: "GPS 心率监测",
      color: "黑色",
      suitable_use: "all",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "smart_accessory",
      name: "电动助力套件",
      brand: "EKit",
      price: 3500,
      stock: 5,
      specs: "250W 中置电机",
      color: "黑色",
      suitable_use: "commute",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "smart_accessory",
      name: "智能车灯套装",
      brand: "LightSmart",
      price: 800,
      stock: 15,
      specs: "自动感应 远近光",
      color: "黑色",
      suitable_use: "all",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "smart_accessory",
      name: "防盗定位器",
      brand: "TrackBike",
      price: 300,
      stock: 25,
      specs: "GPS定位 远程报警",
      color: "黑色",
      suitable_use: "all",
      min_height: 150,
      max_height: 200,
    },
    {
      category: "smart_accessory",
      name: "儿童座椅套装",
      brand: "KidSeat",
      price: 600,
      stock: 8,
      specs: "安全座椅 五点式",
      color: "蓝色",
      suitable_use: "family",
      min_height: 150,
      max_height: 200,
    },
  ];

  const insertPart = db.prepare(`
    INSERT INTO parts (category, name, brand, price, stock, specs, color, suitable_use, min_height, max_height)
    VALUES (@category, @name, @brand, @price, @stock, @specs, @color, @suitable_use, @min_height, @max_height)
  `);

  const insertManyParts = db.transaction((partsList) => {
    for (const p of partsList) {
      insertPart.run(p);
    }
  });

  insertManyParts(parts);
  console.log(`成功导入 ${parts.length} 个配件`);

  const sampleOrders = [
    {
      order_no: "CB20240601001",
      customer_name: "钱草稿",
      customer_phone: "13800138101",
      use_type: "commute",
      height: 172,
      riding_style: "upright",
      budget: 6000,
      color_preference: "黑色",
      status: "draft",
      frame_id: 1,
      wheelset_id: 9,
      drivetrain_id: 17,
      saddle_id: null,
      handlebar_id: null,
      smart_accessory_id: null,
      total_price: 0,
      estimated_days: 7,
      notes: "草稿订单：通勤用，正在配置中",
      quote_generated_at: null,
      quote_confirmed_at: null,
      quote_confirmed_by: null,
      quote_valid_hours: 24,
      stock_reserved: 0,
    },
    {
      order_no: "CB20240601002",
      customer_name: "孙待确",
      customer_phone: "13800138102",
      use_type: "race",
      height: 180,
      riding_style: "aggressive",
      budget: 30000,
      color_preference: "红色",
      status: "quote_pending",
      frame_id: 5,
      wheelset_id: 13,
      drivetrain_id: 21,
      saddle_id: 25,
      handlebar_id: 29,
      smart_accessory_id: 33,
      total_price: 34900,
      estimated_days: 10,
      notes: "报价已生成，等待客户确认",
      quote_generated_at: new Date().toISOString(),
      quote_confirmed_at: null,
      quote_confirmed_by: null,
      quote_valid_hours: 24,
      stock_reserved: 1,
    },
    {
      order_no: "CB20240601003",
      customer_name: "张三",
      customer_phone: "13800138001",
      use_type: "commute",
      height: 175,
      riding_style: "upright",
      budget: 5000,
      color_preference: "黑色",
      status: "preparing",
      frame_id: 1,
      wheelset_id: 9,
      drivetrain_id: 18,
      saddle_id: 23,
      handlebar_id: 27,
      smart_accessory_id: 33,
      total_price: 4150,
      estimated_days: 7,
      notes: "每天上下班通勤用，约10公里",
      quote_generated_at: new Date(Date.now() - 86400000).toISOString(),
      quote_confirmed_at: new Date(Date.now() - 82800000).toISOString(),
      quote_confirmed_by: "张三",
      quote_valid_hours: 24,
      stock_reserved: 1,
    },
    {
      order_no: "CB20240601004",
      customer_name: "李四",
      customer_phone: "13800138002",
      use_type: "race",
      height: 182,
      riding_style: "aggressive",
      budget: 35000,
      color_preference: "红色",
      status: "assembling",
      frame_id: 6,
      wheelset_id: 14,
      drivetrain_id: 22,
      saddle_id: 25,
      handlebar_id: 29,
      smart_accessory_id: 33,
      total_price: 41900,
      estimated_days: 10,
      notes: "参加业余公路赛使用",
      quote_generated_at: new Date(Date.now() - 172800000).toISOString(),
      quote_confirmed_at: new Date(Date.now() - 169200000).toISOString(),
      quote_confirmed_by: "李四",
      quote_valid_hours: 24,
      stock_reserved: 1,
    },
    {
      order_no: "CB20240601005",
      customer_name: "王五",
      customer_phone: "13800138003",
      use_type: "longdistance",
      height: 170,
      riding_style: "relaxed",
      budget: 15000,
      color_preference: "蓝色",
      status: "debugging",
      frame_id: 3,
      wheelset_id: 11,
      drivetrain_id: 19,
      saddle_id: 24,
      handlebar_id: 28,
      smart_accessory_id: 34,
      total_price: 16300,
      estimated_days: 5,
      notes: "计划川藏线骑行",
      quote_generated_at: new Date(Date.now() - 259200000).toISOString(),
      quote_confirmed_at: new Date(Date.now() - 255600000).toISOString(),
      quote_confirmed_by: "王五",
      quote_valid_hours: 24,
      stock_reserved: 1,
    },
    {
      order_no: "CB20240601006",
      customer_name: "赵六",
      customer_phone: "13800138004",
      use_type: "family",
      height: 165,
      riding_style: "upright",
      budget: 8000,
      color_preference: "黄色",
      status: "ready",
      frame_id: 7,
      wheelset_id: 15,
      drivetrain_id: 22,
      saddle_id: 26,
      handlebar_id: 30,
      smart_accessory_id: 32,
      total_price: 8500,
      estimated_days: 0,
      notes: "带5岁孩子周末骑行",
      quote_generated_at: new Date(Date.now() - 345600000).toISOString(),
      quote_confirmed_at: new Date(Date.now() - 342000000).toISOString(),
      quote_confirmed_by: "赵六",
      quote_valid_hours: 24,
      stock_reserved: 1,
    },
    {
      order_no: "CB20240601007",
      customer_name: "周八",
      customer_phone: "13800138006",
      use_type: "longdistance",
      height: 185,
      riding_style: "relaxed",
      budget: 20000,
      color_preference: "钛色",
      status: "delivered",
      frame_id: 4,
      wheelset_id: 11,
      drivetrain_id: 20,
      saddle_id: 24,
      handlebar_id: 28,
      smart_accessory_id: 35,
      total_price: 18800,
      estimated_days: 0,
      notes: "已交付，环岛骑行用",
      quote_generated_at: new Date(Date.now() - 604800000).toISOString(),
      quote_confirmed_at: new Date(Date.now() - 601200000).toISOString(),
      quote_confirmed_by: "周八",
      quote_valid_hours: 24,
      stock_reserved: 1,
      delivered_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_no, customer_name, customer_phone, use_type, height, riding_style,
      budget, color_preference, status, estimated_days, notes,
      frame_id, wheelset_id, drivetrain_id, saddle_id, handlebar_id, smart_accessory_id,
      total_price, quote_generated_at, quote_confirmed_at, quote_confirmed_by,
      quote_valid_hours, stock_reserved, delivered_at
    ) VALUES (
      @order_no, @customer_name, @customer_phone, @use_type, @height, @riding_style,
      @budget, @color_preference, @status, @estimated_days, @notes,
      @frame_id, @wheelset_id, @drivetrain_id, @saddle_id, @handlebar_id, @smart_accessory_id,
      @total_price, @quote_generated_at, @quote_confirmed_at, @quote_confirmed_by,
      @quote_valid_hours, @stock_reserved, @delivered_at
    )
  `);

  const insertManyOrders = db.transaction((orders) => {
    for (const o of orders) {
      o.delivered_at = o.delivered_at ?? null;
      insertOrder.run(o);
    }
  });

  insertManyOrders(sampleOrders);
  console.log(`成功导入 ${sampleOrders.length} 个示例订单`);

  const sampleReservations = [
    {
      order_id: 2,
      part_id: 5,
      quantity: 1,
      status: "reserved",
      reserved_at: new Date().toISOString(),
    },
    {
      order_id: 2,
      part_id: 13,
      quantity: 1,
      status: "reserved",
      reserved_at: new Date().toISOString(),
    },
    {
      order_id: 2,
      part_id: 21,
      quantity: 1,
      status: "reserved",
      reserved_at: new Date().toISOString(),
    },
    {
      order_id: 2,
      part_id: 25,
      quantity: 1,
      status: "reserved",
      reserved_at: new Date().toISOString(),
    },
    {
      order_id: 2,
      part_id: 29,
      quantity: 1,
      status: "reserved",
      reserved_at: new Date().toISOString(),
    },
    {
      order_id: 2,
      part_id: 33,
      quantity: 1,
      status: "reserved",
      reserved_at: new Date().toISOString(),
    },
  ];

  const insertReservation = db.prepare(`
    INSERT INTO stock_reservations (order_id, part_id, quantity, status, reserved_at)
    VALUES (@order_id, @part_id, @quantity, @status, @reserved_at)
  `);
  const insertManyReservations = db.transaction((list) => {
    for (const r of list) insertReservation.run(r);
  });
  insertManyReservations(sampleReservations);
  console.log(`成功导入 ${sampleReservations.length} 条库存预占记录`);

  const sampleLogs = [
    {
      order_id: 1,
      status: "draft",
      operator: "系统",
      remark: "订单创建（草稿报价）",
    },
    {
      order_id: 2,
      status: "draft",
      operator: "系统",
      remark: "订单创建（草稿报价）",
    },
    {
      order_id: 2,
      status: "quote_pending",
      operator: "顾问小王",
      remark: "报价生成并提交客户确认",
    },
    {
      order_id: 3,
      status: "draft",
      operator: "系统",
      remark: "订单创建（草稿报价）",
    },
    {
      order_id: 3,
      status: "quote_pending",
      operator: "顾问小王",
      remark: "报价生成并提交客户确认",
    },
    {
      order_id: 3,
      status: "preparing",
      operator: "张三",
      remark: "客户确认报价，进入备料阶段",
    },
    {
      order_id: 4,
      status: "draft",
      operator: "系统",
      remark: "订单创建（草稿报价）",
    },
    {
      order_id: 4,
      status: "quote_pending",
      operator: "顾问小王",
      remark: "报价生成并提交客户确认",
    },
    {
      order_id: 4,
      status: "preparing",
      operator: "李四",
      remark: "客户确认报价，进入备料阶段",
    },
    {
      order_id: 4,
      status: "assembling",
      operator: "装配师小李",
      remark: "推进至装配中",
    },
    {
      order_id: 5,
      status: "draft",
      operator: "系统",
      remark: "订单创建（草稿报价）",
    },
    {
      order_id: 5,
      status: "quote_pending",
      operator: "顾问小王",
      remark: "报价生成并提交客户确认",
    },
    {
      order_id: 5,
      status: "preparing",
      operator: "王五",
      remark: "客户确认报价，进入备料阶段",
    },
    {
      order_id: 5,
      status: "assembling",
      operator: "装配师小李",
      remark: "推进至装配中",
    },
    {
      order_id: 5,
      status: "debugging",
      operator: "装配师小李",
      remark: "推进至调试中",
    },
    {
      order_id: 6,
      status: "draft",
      operator: "系统",
      remark: "订单创建（草稿报价）",
    },
    {
      order_id: 6,
      status: "quote_pending",
      operator: "顾问小王",
      remark: "报价生成并提交客户确认",
    },
    {
      order_id: 6,
      status: "preparing",
      operator: "赵六",
      remark: "客户确认报价，进入备料阶段",
    },
    {
      order_id: 6,
      status: "assembling",
      operator: "装配师小李",
      remark: "推进至装配中",
    },
    {
      order_id: 6,
      status: "debugging",
      operator: "装配师小李",
      remark: "推进至调试中",
    },
    {
      order_id: 6,
      status: "ready",
      operator: "装配师小李",
      remark: "推进至可取车",
    },
    {
      order_id: 7,
      status: "draft",
      operator: "系统",
      remark: "订单创建（草稿报价）",
    },
    {
      order_id: 7,
      status: "quote_pending",
      operator: "顾问小王",
      remark: "报价生成并提交客户确认",
    },
    {
      order_id: 7,
      status: "preparing",
      operator: "周八",
      remark: "客户确认报价，进入备料阶段",
    },
    {
      order_id: 7,
      status: "assembling",
      operator: "装配师小李",
      remark: "推进至装配中",
    },
    {
      order_id: 7,
      status: "debugging",
      operator: "装配师小李",
      remark: "推进至调试中",
    },
    {
      order_id: 7,
      status: "ready",
      operator: "装配师小李",
      remark: "推进至可取车",
    },
    {
      order_id: 7,
      status: "delivered",
      operator: "前台小陈",
      remark: "客户已取车交付",
    },
  ];

  const insertLog = db.prepare(`
    INSERT INTO order_status_logs (order_id, status, operator, remark)
    VALUES (@order_id, @status, @operator, @remark)
  `);
  const insertManyLogs = db.transaction((list) => {
    for (const l of list) insertLog.run(l);
  });
  insertManyLogs(sampleLogs);
  console.log(`成功导入 ${sampleLogs.length} 条状态流转日志`);

  console.log("种子数据导入完成！");
}

if (require.main === module) {
  seedData();
}

module.exports = { seedData };
