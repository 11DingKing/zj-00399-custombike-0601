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
      customer_name: "张三",
      customer_phone: "13800138001",
      use_type: "commute",
      height: 175,
      riding_style: "upright",
      budget: 5000,
      color_preference: "黑色",
      status: "pending",
      estimated_days: 7,
      notes: "每天上下班通勤用，约10公里",
    },
    {
      order_no: "CB20240601002",
      customer_name: "李四",
      customer_phone: "13800138002",
      use_type: "race",
      height: 180,
      riding_style: "aggressive",
      budget: 30000,
      color_preference: "红色",
      status: "preparing",
      estimated_days: 10,
      notes: "参加业余公路赛使用",
    },
    {
      order_no: "CB20240601003",
      customer_name: "王五",
      customer_phone: "13800138003",
      use_type: "longdistance",
      height: 170,
      riding_style: "relaxed",
      budget: 15000,
      color_preference: "蓝色",
      status: "assembling",
      estimated_days: 5,
      notes: "计划川藏线骑行",
    },
    {
      order_no: "CB20240601004",
      customer_name: "赵六",
      customer_phone: "13800138004",
      use_type: "family",
      height: 165,
      riding_style: "upright",
      budget: 8000,
      color_preference: "黄色",
      status: "debugging",
      estimated_days: 3,
      notes: "带5岁孩子周末骑行",
    },
    {
      order_no: "CB20240601005",
      customer_name: "孙七",
      customer_phone: "13800138005",
      use_type: "commute",
      height: 160,
      riding_style: "upright",
      budget: 3000,
      color_preference: "白色",
      status: "ready",
      estimated_days: 0,
      notes: "女生通勤使用",
    },
    {
      order_no: "CB20240601006",
      customer_name: "周八",
      customer_phone: "13800138006",
      use_type: "longdistance",
      height: 185,
      riding_style: "relaxed",
      budget: 20000,
      color_preference: "钛色",
      status: "delivered",
      estimated_days: 0,
      notes: "已交付，环岛骑行用",
    },
  ];

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_no, customer_name, customer_phone, use_type, height, riding_style, budget, color_preference, status, estimated_days, notes)
    VALUES (@order_no, @customer_name, @customer_phone, @use_type, @height, @riding_style, @budget, @color_preference, @status, @estimated_days, @notes)
  `);

  const insertManyOrders = db.transaction((orders) => {
    for (const o of orders) {
      insertOrder.run(o);
    }
  });

  insertManyOrders(sampleOrders);
  console.log(`成功导入 ${sampleOrders.length} 个示例订单`);

  console.log("种子数据导入完成！");
}

if (require.main === module) {
  seedData();
}

module.exports = { seedData };
