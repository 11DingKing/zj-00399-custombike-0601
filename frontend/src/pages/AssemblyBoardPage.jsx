import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const statusFlow = [
  { key: "draft", label: "草稿报价", color: "gray-500", icon: "📝" },
  { key: "quote_pending", label: "待客户确认", color: "warning", icon: "⏳" },
  { key: "preparing", label: "备料中", color: "primary", icon: "📦" },
  { key: "assembling", label: "装配中", color: "primary", icon: "🔧" },
  { key: "debugging", label: "调试中", color: "secondary", icon: "⚡" },
  { key: "ready", label: "可取车", color: "success", icon: "✅" },
  { key: "delivered", label: "已交付", color: "gray-500", icon: "🚚" },
];

const quoteStatuses = ["draft", "quote_pending"];
const productionStatuses = [
  "preparing",
  "assembling",
  "debugging",
  "ready",
  "delivered",
];

export default function AssemblyBoardPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [reservationStats, setReservationStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("production");

  useEffect(() => {
    loadData();
  }, [filter, viewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises = [
        fetch(
          filter === "all" ? "/api/orders" : `/api/orders?use_type=${filter}`,
        ),
        fetch("/api/stats"),
      ];
      if (viewMode === "quote") {
        promises.push(fetch("/api/stats/reservations"));
      }
      const [ordersRes, statsRes, resRes] = await Promise.all(promises);
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (resRes && resRes.ok) {
        const data = await resRes.json();
        setReservationStats(data);
      }
    } catch (e) {
      console.error("加载数据失败", e);
    } finally {
      setLoading(false);
    }
  };

  const getOrdersByStatus = (status) => {
    return orders.filter((o) => o.status === status);
  };

  const canAdvance = (order) => {
    const currentIndex = statusFlow.findIndex((s) => s.key === order.status);
    if (currentIndex >= statusFlow.length - 1) return { ok: false, reason: "" };

    const nextStatus = statusFlow[currentIndex + 1];

    if (order.status === "draft") {
      return { ok: false, reason: "请前往顾问页面生成报价" };
    }

    if (order.status === "quote_pending") {
      if (order.quote_expired) {
        return { ok: false, reason: "报价已过期，请在顾问页面重新生成" };
      }
      return { ok: true };
    }

    if (order.status === "preparing" && nextStatus.key === "assembling") {
      if (!order.can_assemble) {
        const reasons = [];
        if (!order.compatibility?.compatible) {
          reasons.push("存在兼容性冲突");
        }
        if (!order.stock_consumed) {
          reasons.push("库存未完成扣减");
        }
        const partCount = order.parts?.length || 0;
        if (partCount < 3) {
          reasons.push("至少需要配置车架/轮组/传动");
        }
        return {
          ok: false,
          reason: reasons.length > 0 ? reasons.join("，") : "条件未满足",
        };
      }
      return { ok: true };
    }

    return { ok: true };
  };

  const canRollback = (order) => {
    if (order.status === "draft" || order.status === "delivered") {
      return { ok: false };
    }
    if (
      ["assembling", "debugging", "ready"].includes(order.status) &&
      ["quote_pending", "draft"].includes(
        statusFlow[statusFlow.findIndex((s) => s.key === order.status) - 1]
          ?.key,
      )
    ) {
      return { ok: false, reason: "生产阶段订单不能回退到报价阶段" };
    }
    return { ok: true };
  };

  const handleNextStatus = async (order) => {
    const check = canAdvance(order);
    if (!check.ok) {
      if (check.reason) {
        alert(`不能推进：${check.reason}`);
      }
      return;
    }

    const currentIndex = statusFlow.findIndex((s) => s.key === order.status);
    if (currentIndex >= statusFlow.length - 1) return;

    const nextStatus = statusFlow[currentIndex + 1];

    if (order.status === "quote_pending") {
      if (!confirm("客户是否已确认报价？确认后将正式扣减库存并进入备料。"))
        return;
    } else {
      if (!confirm(`确认将订单推进到「${nextStatus.label}」状态？`)) return;
    }

    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus.key,
          operator:
            order.status === "quote_pending"
              ? order.customer_name || "客户"
              : "装配师小李",
          remark:
            order.status === "quote_pending"
              ? "客户确认报价，进入备料"
              : `推进至${nextStatus.label}`,
        }),
      });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "操作失败");
      }
    } catch (e) {
      alert("网络错误");
    }
  };

  const handlePrevStatus = async (order) => {
    const currentIndex = statusFlow.findIndex((s) => s.key === order.status);
    if (currentIndex <= 0) return;

    const prevStatus = statusFlow[currentIndex - 1];

    if (order.status === "preparing" && prevStatus.key === "quote_pending") {
      if (!confirm("回退到待确认状态会释放已扣减的库存，确认继续？")) return;
    } else if (!confirm(`确认将订单回退到「${prevStatus.label}」状态？`))
      return;

    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: prevStatus.key,
          operator: "装配师小李",
          remark: `回退至${prevStatus.label}`,
        }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      alert("网络错误");
    }
  };

  const statusColorClasses = {
    warning: "bg-warning/10 text-warning border-warning/20",
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
    success: "bg-success/10 text-success border-success/20",
    "gray-500": "bg-gray-100 text-gray-500 border-gray-200",
  };

  const displayedStatuses =
    viewMode === "quote" ? quoteStatuses : productionStatuses;

  const getStatusBadge = (order) => {
    switch (order.status) {
      case "draft":
        return (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            草稿
          </span>
        );
      case "quote_pending":
        return order.quote_expired ? (
          <span className="text-xs bg-danger/10 text-danger px-2 py-0.5 rounded-full animate-pulse">
            已过期
          </span>
        ) : (
          <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
            🔒 预占
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-dark mb-1">装配看板</h2>
          <p className="text-gray-500 text-sm">
            实时追踪订单装配进度与报价状态
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === "quote"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setViewMode("quote")}
            >
              📄 报价阶段
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === "production"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setViewMode("production")}
            >
              🏭 生产阶段
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">用途筛选：</span>
            <select
              className="input-field w-32"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="commute">通勤</option>
              <option value="longdistance">长途</option>
              <option value="race">竞赛</option>
              <option value="family">亲子</option>
            </select>
          </div>

          <button
            className="btn-secondary flex items-center gap-2"
            onClick={loadData}
          >
            <span>🔄</span>
            刷新
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="card p-5">
            <div className="text-3xl font-bold text-gray-600 mb-1">
              {stats.status_counts?.draft || 0}
            </div>
            <div className="text-sm text-gray-500">草稿报价</div>
          </div>
          <div className="card p-5">
            <div className="text-3xl font-bold text-warning mb-1">
              {stats.status_counts?.quote_pending || 0}
            </div>
            <div className="text-sm text-gray-500">待客户确认</div>
            {(stats.quote_expired_count || 0) > 0 && (
              <div className="text-xs text-danger mt-1 font-medium animate-pulse">
                ⚠️ 过期 {stats.quote_expired_count}
              </div>
            )}
          </div>
          <div className="card p-5">
            <div className="text-3xl font-bold text-primary mb-1">
              {(stats.status_counts?.preparing || 0) +
                (stats.status_counts?.assembling || 0)}
            </div>
            <div className="text-sm text-gray-500">进行中(备料+装配)</div>
          </div>
          <div className="card p-5">
            <div className="text-3xl font-bold text-danger mb-1">
              {stats.overdue_count || 0}
            </div>
            <div className="text-sm text-gray-500">超期预警</div>
          </div>
          <div className="card p-5">
            <div className="text-3xl font-bold text-success mb-1">
              {stats.status_counts?.ready || 0}
            </div>
            <div className="text-sm text-gray-500">待取车</div>
          </div>
          <div className="card p-5">
            <div className="text-3xl font-bold text-gray-500 mb-1">
              {stats.status_counts?.delivered || 0}
            </div>
            <div className="text-sm text-gray-500">已交付</div>
          </div>
        </div>
      )}

      {viewMode === "quote" &&
        reservationStats &&
        reservationStats.length > 0 && (
          <div className="card p-6 mb-8">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>🔒</span>
              库存预占概览
              <span className="text-xs font-normal text-gray-400 ml-2">
                共 {stats?.reserved_stock_count || 0} 件预占
              </span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {reservationStats.slice(0, 12).map((p) => (
                <div
                  key={p.id}
                  className={`p-3 rounded-lg border ${
                    p.available_qty <= 0
                      ? "bg-danger/5 border-danger/20"
                      : p.available_qty < 2
                        ? "bg-warning/5 border-warning/20"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {p.name}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{p.category}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={
                        p.reserved_qty > 0
                          ? "text-secondary font-medium"
                          : "text-gray-400"
                      }
                    >
                      预占 {p.reserved_qty}
                    </span>
                    <span
                      className={
                        p.available_qty <= 0
                          ? "text-danger font-medium"
                          : "text-success font-medium"
                      }
                    >
                      可用 {p.available_qty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      <div
        className={`grid gap-4 ${
          displayedStatuses.length <= 3 ? "grid-cols-3" : "grid-cols-5"
        }`}
      >
        {displayedStatuses.map((statusKey) => {
          const status = statusFlow.find((s) => s.key === statusKey);
          const statusOrders = getOrdersByStatus(statusKey);
          const colorClass =
            statusColorClasses[status.color] || statusColorClasses.primary;

          return (
            <div key={statusKey} className="flex flex-col">
              <div
                className={`rounded-t-xl p-3 border border-b-0 ${colorClass}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{status.icon}</span>
                    <span className="font-medium text-sm">{status.label}</span>
                  </div>
                  <span className="text-sm font-medium bg-white/50 px-2 py-0.5 rounded-full">
                    {statusOrders.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 bg-gray-50 rounded-b-xl border border-t-0 border-gray-200 p-2 min-h-[400px]">
                {loading ? (
                  <div className="text-center text-gray-400 py-8 text-sm">
                    加载中...
                  </div>
                ) : statusOrders.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">
                    暂无订单
                  </div>
                ) : (
                  <div className="space-y-2">
                    {statusOrders.map((order) => (
                      <div
                        key={order.id}
                        className={`bg-white rounded-lg p-3 shadow-sm border hover:shadow-md transition-shadow cursor-pointer ${
                          order.quote_expired
                            ? "border-danger/30 bg-danger/5"
                            : "border-gray-100"
                        }`}
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-800">
                            {order.order_no}
                          </span>
                          <div className="flex items-center gap-1">
                            {getStatusBadge(order)}
                            {order.is_overdue && viewMode === "production" && (
                              <span className="text-xs bg-danger/10 text-danger px-2 py-0.5 rounded-full animate-pulse">
                                超期
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          {order.customer_name}
                        </div>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {order.use_type_label}
                          </span>
                          {order.total_price > 0 && (
                            <span className="text-xs text-primary font-medium">
                              ¥{order.total_price?.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {quoteStatuses.includes(statusKey) ? (
                          <div className="text-xs text-gray-400 space-y-0.5">
                            {order.status === "draft" && (
                              <div>已配置：{order.parts?.length || 0}/6 项</div>
                            )}
                            {order.status === "quote_pending" && (
                              <>
                                <div>
                                  报价时间：
                                  {order.quote_generated_at
                                    ?.slice(5, 16)
                                    .replace("T", " ") || "-"}
                                </div>
                                <div
                                  className={
                                    order.quote_expired
                                      ? "text-danger font-medium"
                                      : ""
                                  }
                                >
                                  {order.quote_expired
                                    ? "⚠️ 报价已过期"
                                    : `有效期：${order.quote_valid_hours || 24}h`}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                              <div
                                className="bg-primary h-1.5 rounded-full transition-all"
                                style={{ width: `${order.progress}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">
                                预计 {order.estimated_date}
                              </span>
                              <span
                                className={`font-medium ${
                                  order.is_overdue
                                    ? "text-danger"
                                    : "text-gray-500"
                                }`}
                              >
                                {order.is_overdue
                                  ? `超期${Math.abs(order.days_remaining)}天`
                                  : `剩${order.days_remaining}天`}
                              </span>
                            </div>
                          </>
                        )}

                        <div className="flex gap-1 mt-3 pt-2 border-t border-gray-50">
                          {statusKey !== "draft" &&
                            statusKey !== "delivered" && (
                              <button
                                className={`flex-1 py-1 text-xs rounded ${
                                  !canRollback(order).ok
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrevStatus(order);
                                }}
                                disabled={!canRollback(order).ok}
                                title={canRollback(order).reason || ""}
                              >
                                ← 回退
                              </button>
                            )}
                          {statusKey !== "delivered" && (
                            <button
                              className={`flex-1 py-1 text-xs rounded font-medium ${
                                !canAdvance(order).ok
                                  ? "text-gray-300 cursor-not-allowed bg-gray-50"
                                  : "text-primary hover:bg-primary/5"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNextStatus(order);
                              }}
                              disabled={!canAdvance(order).ok}
                              title={canAdvance(order).reason || ""}
                            >
                              {statusKey === "quote_pending"
                                ? "✅ 确认 →"
                                : !canAdvance(order).ok
                                  ? canAdvance(order).reason?.slice(0, 8) +
                                    "… →"
                                  : "推进 →"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
