import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const statusFlow = [
  { key: "pending", label: "待确认" },
  { key: "preparing", label: "备料中" },
  { key: "assembling", label: "装配中" },
  { key: "debugging", label: "调试中" },
  { key: "ready", label: "可取车" },
  { key: "delivered", label: "已交付" },
];

const partCategories = [
  { key: "frame", label: "车架", icon: "🚲" },
  { key: "wheelset", label: "轮组", icon: "🔘" },
  { key: "drivetrain", label: "传动", icon: "⚙️" },
  { key: "saddle", label: "座垫", icon: "🪑" },
  { key: "handlebar", label: "把组", icon: "🎯" },
  { key: "smart_accessory", label: "智能配件", icon: "📱" },
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const [orderRes, logsRes] = await Promise.all([
        fetch(`/api/orders/${id}`),
        fetch(`/api/orders/${id}/logs`),
      ]);
      if (orderRes.ok) {
        const data = await orderRes.json();
        setOrder(data);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("加载订单详情失败", e);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStatus = async () => {
    const currentIndex = statusFlow.findIndex((s) => s.key === order.status);
    if (currentIndex >= statusFlow.length - 1) return;

    const nextStatus = statusFlow[currentIndex + 1];
    if (!confirm(`确认将订单推进到「${nextStatus.label}」状态？`)) return;

    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus.key,
          operator: "装配师小李",
          remark: `推进至${nextStatus.label}`,
        }),
      });
      if (res.ok) {
        loadOrder();
      } else {
        const data = await res.json();
        alert(data.error || "操作失败");
      }
    } catch (e) {
      alert("网络错误");
    }
  };

  if (loading) {
    return <div className="card p-8 text-center text-gray-400">加载中...</div>;
  }

  if (!order) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500 mb-4">订单不存在</p>
        <button className="btn-primary" onClick={() => navigate("/assembly")}>
          返回看板
        </button>
      </div>
    );
  }

  const currentStep = statusFlow.findIndex((s) => s.key === order.status);

  return (
    <div className="max-w-4xl mx-auto">
      <button
        className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
        onClick={() => navigate(-1)}
      >
        ← 返回
      </button>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-dark">{order.order_no}</h2>
              <span className={`badge status-${order.status}`}>
                {order.status_label}
              </span>
              {order.is_overdue && (
                <span className="badge bg-danger/10 text-danger animate-pulse">
                  ⚠️ 已超期
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">创建于 {order.created_at}</p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">订单总价</div>
            <div className="text-3xl font-bold text-primary">
              ¥{order.total_price?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {statusFlow.map((s, i) => (
              <div key={s.key} className="flex-1 text-center">
                <div
                  className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                    i <= currentStep
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i < currentStep ? "✓" : i + 1}
                </div>
                <div
                  className={`text-sm ${
                    i <= currentStep
                      ? "text-gray-700 font-medium"
                      : "text-gray-400"
                  }`}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div className="relative h-2 bg-gray-100 rounded-full">
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
              style={{
                width: `${(currentStep / (statusFlow.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">客户信息</div>
            <div className="font-medium">{order.customer_name}</div>
            <div className="text-sm text-gray-500">{order.customer_phone}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">预计交付</div>
            <div
              className={`font-medium ${order.is_overdue ? "text-danger" : ""}`}
            >
              {order.estimated_date}
            </div>
            <div className="text-sm text-gray-500">
              {order.is_overdue
                ? `已超期 ${Math.abs(order.days_remaining)} 天`
                : `还剩 ${order.days_remaining} 天`}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">完成进度</div>
            <div className="font-medium text-xl">{order.progress}%</div>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4">客户需求</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">使用场景</div>
            <div className="font-medium">{order.use_type_label}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">身高</div>
            <div className="font-medium">{order.height} cm</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">颜色倾向</div>
            <div className="font-medium">
              {order.color_preference || "未指定"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">预算</div>
            <div className="font-medium">¥{order.budget?.toLocaleString()}</div>
          </div>
        </div>
        {order.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500 mb-1">备注</div>
            <div className="text-gray-700">{order.notes}</div>
          </div>
        )}
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4">配置清单</h3>
        {order.parts && order.parts.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {partCategories.map((cat) => {
              const part = order.parts.find((p) => p.category === cat.key);
              return (
                <div
                  key={cat.key}
                  className={`p-4 rounded-lg border ${
                    part
                      ? "bg-white border-gray-200"
                      : "bg-gray-50 border-dashed border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm text-gray-500">{cat.label}</span>
                  </div>
                  {part ? (
                    <div>
                      <div className="font-medium text-gray-800">
                        {part.name}
                      </div>
                      <div className="text-primary font-medium mt-1">
                        ¥{part.price?.toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">未配置</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            尚未配置配件，请前往顾问页面配置
          </div>
        )}
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4">状态流转记录</h3>
        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={log.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    index === 0
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {index + 1}
                </div>
                {index < logs.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-800">
                    {statusFlow.find((s) => s.key === log.status)?.label ||
                      log.status}
                  </span>
                  <span className="text-sm text-gray-400">
                    {log.created_at}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  操作人：{log.operator || "系统"}
                  {log.remark && ` · ${log.remark}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {order.status !== "delivered" && (
        <div className="flex justify-end gap-3">
          <button className="btn-primary" onClick={handleNextStatus}>
            推进到下一状态 →
          </button>
        </div>
      )}
    </div>
  );
}
