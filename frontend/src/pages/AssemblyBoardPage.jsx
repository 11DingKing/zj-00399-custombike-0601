import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const statusFlow = [
  { key: "pending", label: "待确认", color: "warning", icon: "📝" },
  { key: "preparing", label: "备料中", color: "primary", icon: "📦" },
  { key: "assembling", label: "装配中", color: "primary", icon: "🔧" },
  { key: "debugging", label: "调试中", color: "secondary", icon: "⚡" },
  { key: "ready", label: "可取车", color: "success", icon: "✅" },
  { key: "delivered", label: "已交付", color: "gray-500", icon: "🚚" },
];

export default function AssemblyBoardPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetch(
          filter === "all" ? "/api/orders" : `/api/orders?use_type=${filter}`,
        ),
        fetch("/api/stats"),
      ]);
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
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

  const handleNextStatus = async (order) => {
    const currentIndex = statusFlow.findIndex((s) => s.key === order.status);
    if (currentIndex >= statusFlow.length - 1) return;

    const nextStatus = statusFlow[currentIndex + 1];
    if (!confirm(`确认将订单推进到「${nextStatus.label}」状态？`)) return;

    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus.key,
          operator: "装配师小李",
          remark: `推进至${nextStatus.label}`,
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
    if (!confirm(`确认将订单回退到「${prevStatus.label}」状态？`)) return;

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-dark mb-1">装配看板</h2>
          <p className="text-gray-500 text-sm">实时追踪订单装配进度</p>
        </div>

        <div className="flex items-center gap-4">
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
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card p-5">
            <div className="text-3xl font-bold text-primary mb-1">
              {orders.filter((o) => o.status !== "delivered").length}
            </div>
            <div className="text-sm text-gray-500">进行中订单</div>
          </div>
          <div className="card p-5">
            <div className="text-3xl font-bold text-warning mb-1">
              {stats.overdue_count || 0}
            </div>
            <div className="text-sm text-gray-500">超期预警</div>
          </div>
          <div className="card p-5">
            <div className="text-3xl font-bold text-success mb-1">
              {stats.status_counts?.delivered || 0}
            </div>
            <div className="text-sm text-gray-500">已交付</div>
          </div>
          <div className="card p-5">
            <div className="text-3xl font-bold text-secondary mb-1">
              {stats.status_counts?.ready || 0}
            </div>
            <div className="text-sm text-gray-500">待取车</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-6 gap-4">
        {statusFlow.map((status) => {
          const statusOrders = getOrdersByStatus(status.key);
          const colorClass =
            statusColorClasses[status.color] || statusColorClasses.primary;

          return (
            <div key={status.key} className="flex flex-col">
              <div
                className={`rounded-t-xl p-3 border border-b-0 ${colorClass}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{status.icon}</span>
                    <span className="font-medium">{status.label}</span>
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
                        className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-800">
                            {order.order_no}
                          </span>
                          {order.is_overdue && (
                            <span className="text-xs bg-danger/10 text-danger px-2 py-0.5 rounded-full animate-pulse">
                              超期
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          {order.customer_name}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {order.use_type_label}
                          </span>
                          {order.total_price > 0 && (
                            <span className="text-xs text-primary font-medium">
                              ¥{order.total_price?.toLocaleString()}
                            </span>
                          )}
                        </div>

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
                              order.is_overdue ? "text-danger" : "text-gray-500"
                            }`}
                          >
                            {order.is_overdue
                              ? `超期${Math.abs(order.days_remaining)}天`
                              : `剩${order.days_remaining}天`}
                          </span>
                        </div>

                        <div className="flex gap-1 mt-3 pt-2 border-t border-gray-50">
                          {status.key !== "pending" && (
                            <button
                              className="flex-1 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrevStatus(order);
                              }}
                            >
                              ← 回退
                            </button>
                          )}
                          {status.key !== "delivered" && (
                            <button
                              className="flex-1 py-1 text-xs text-primary hover:bg-primary/5 rounded font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNextStatus(order);
                              }}
                            >
                              推进 →
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
