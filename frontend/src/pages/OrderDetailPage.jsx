import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const statusFlow = [
  { key: "draft", label: "草稿报价" },
  { key: "quote_pending", label: "待客户确认" },
  { key: "preparing", label: "备料中" },
  { key: "assembling", label: "装配中" },
  { key: "debugging", label: "调试中" },
  { key: "ready", label: "可取车" },
  { key: "delivered", label: "已交付" },
];

const productionFlow = [
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
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const [orderRes, logsRes, resRes] = await Promise.all([
        fetch(`/api/orders/${id}`),
        fetch(`/api/orders/${id}/logs`),
        fetch(`/api/orders/${id}/reservations`),
      ]);
      if (orderRes.ok) {
        const data = await orderRes.json();
        setOrder(data);
        setReservations(data.reservations || []);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data);
      }
      if (resRes.ok) {
        const data = await resRes.json();
        setReservations(data);
      }
    } catch (e) {
      console.error("加载订单详情失败", e);
    } finally {
      setLoading(false);
    }
  };

  const canAdvance = () => {
    const currentIndex = statusFlow.findIndex((s) => s.key === order.status);
    if (currentIndex >= statusFlow.length - 1) return { ok: false, reason: "" };
    const nextStatus = statusFlow[currentIndex + 1];

    if (order.status === "draft") {
      return { ok: false, reason: "请前往顾问页面配置并生成报价" };
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
          reasons.push("库存未完成扣减（未确认报价）");
        }
        const partCount = order.parts?.length || 0;
        if (partCount < 3) {
          reasons.push("至少需要配置车架/轮组/传动");
        }
        return {
          ok: false,
          reason: reasons.length > 0 ? reasons.join("；") : "条件未满足",
        };
      }
      return { ok: true };
    }

    return { ok: true };
  };

  const handleNextStatus = async () => {
    const check = canAdvance();
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
      const res = await fetch(`/api/orders/${id}/status`, {
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
  const isInProduction = [
    "preparing",
    "assembling",
    "debugging",
    "ready",
    "delivered",
  ].includes(order.status);
  const prodIndex = Math.max(
    0,
    productionFlow.findIndex((s) => s.key === order.status),
  );

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-600";
      case "quote_pending":
        return order.quote_expired
          ? "bg-danger/10 text-danger"
          : "status-pending";
      case "preparing":
      case "assembling":
        return "status-preparing";
      case "debugging":
        return "bg-secondary/10 text-secondary";
      case "ready":
        return "bg-success/10 text-success";
      case "delivered":
        return "bg-gray-100 text-gray-500";
      default:
        return `status-${status}`;
    }
  };

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
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h2 className="text-2xl font-bold text-dark">{order.order_no}</h2>
              <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                {order.status_label}
                {order.quote_expired && "（已过期）"}
              </span>
              {order.stock_reserved === 1 &&
                order.status === "quote_pending" && (
                  <span className="badge bg-secondary/10 text-secondary">
                    🔒 库存已预占
                  </span>
                )}
              {order.is_overdue && isInProduction && (
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
          <div className="text-sm text-gray-500 mb-3">订单全流程</div>
          <div className="flex items-center justify-between mb-2">
            {statusFlow.map((s, i) => (
              <div key={s.key} className="flex-1 text-center px-1">
                <div
                  className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center text-xs font-medium mb-2 ${
                    i <= currentStep
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i < currentStep ? "✓" : i + 1}
                </div>
                <div
                  className={`text-xs ${
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

        {isInProduction && order.status !== "delivered" && (
          <div className="mb-6 bg-success/5 border border-success/20 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-3">
              生产进度（当前阶段：{productionFlow[prodIndex]?.label}）
            </div>
            <div className="flex items-center justify-between mb-2">
              {productionFlow.map((s, i) => (
                <div key={s.key} className="flex-1 text-center">
                  <div
                    className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                      i <= prodIndex
                        ? "bg-success text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i < prodIndex ? "✓" : i + 1}
                  </div>
                  <div
                    className={`text-xs ${
                      i <= prodIndex
                        ? "text-gray-700 font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="relative h-1.5 bg-gray-100 rounded-full">
              <div
                className="absolute top-0 left-0 h-full bg-success rounded-full transition-all"
                style={{
                  width: `${(prodIndex / (productionFlow.length - 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">客户信息</div>
            <div className="font-medium">{order.customer_name}</div>
            <div className="text-sm text-gray-500">{order.customer_phone}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">预计交付</div>
            <div
              className={`font-medium ${
                order.is_overdue && isInProduction ? "text-danger" : ""
              }`}
            >
              {order.estimated_date}
            </div>
            <div className="text-sm text-gray-500">
              {!isInProduction
                ? order.status === "draft"
                  ? "配置未完成"
                  : order.status === "quote_pending"
                    ? "等待客户确认报价"
                    : "-"
                : order.is_overdue
                  ? `已超期 ${Math.abs(order.days_remaining)} 天`
                  : `还剩 ${order.days_remaining} 天`}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">完成进度</div>
            <div className="font-medium text-xl">{order.progress}%</div>
            <div className="text-xs text-gray-400 mt-1">
              {order.quote_confirmed_by &&
                `报价由 ${order.quote_confirmed_by} 确认`}
            </div>
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

      {order.quote && (
        <div className="card p-6 mb-6 bg-gradient-to-br from-blue-50/30 to-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span>📄</span>
              报价明细
            </h3>
            {order.quote_generated_at && (
              <div className="text-xs text-gray-500">
                报价时间：{order.quote_generated_at}
              </div>
            )}
          </div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left p-2 rounded-l">类别</th>
                  <th className="text-left p-2">配件</th>
                  <th className="text-right p-2">单价</th>
                  <th className="text-center p-2">数量</th>
                  <th className="text-right p-2 rounded-r">小计</th>
                </tr>
              </thead>
              <tbody>
                {order.quote.items?.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="p-2 text-gray-600">{item.category_label}</td>
                    <td className="p-2 font-medium">{item.name}</td>
                    <td className="p-2 text-right text-gray-600">
                      ¥{item.unit_price.toLocaleString()}
                    </td>
                    <td className="p-2 text-center">1</td>
                    <td className="p-2 text-right font-medium">
                      ¥{item.subtotal.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 max-w-sm ml-auto text-right">
            <div className="flex justify-between text-sm text-gray-600">
              <span>配件小计</span>
              <span>¥{order.quote.parts_subtotal?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>人工费（8%）</span>
              <span>¥{order.quote.labor_fee?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>装配调试费</span>
              <span>¥{order.quote.assembly_fee?.toLocaleString()}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between">
              <span className="font-semibold">总计</span>
              <span className="text-xl font-bold text-primary">
                ¥{order.quote.total_price?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

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
                    {part && part.effective_stock != null && (
                      <span
                        className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                          part.effective_stock <= 0
                            ? "bg-danger/10 text-danger"
                            : "bg-success/10 text-success"
                        }`}
                      >
                        可用 {part.effective_stock}
                      </span>
                    )}
                  </div>
                  {part ? (
                    <div>
                      <div className="font-medium text-gray-800">
                        {part.name}
                      </div>
                      <div className="text-xs text-gray-400 mb-1">
                        {part.brand} · {part.specs}
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

      {reservations && reservations.length > 0 && (
        <div className="card p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span>🔒</span>
            库存预占记录
          </h3>
          <div className="space-y-2">
            {reservations.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === "reserved"
                        ? "bg-secondary/10 text-secondary"
                        : r.status === "consumed"
                          ? "bg-success/10 text-success"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {r.status === "reserved"
                      ? "已预占"
                      : r.status === "consumed"
                        ? "已扣减"
                        : "已释放"}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {r.part_name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {partCategories.find((c) => c.key === r.category)?.label}{" "}
                      · 数量 {r.quantity}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {r.reserved_at?.slice(0, 19).replace("T", " ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4">状态流转记录</h3>
        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={log.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    index === logs.length - 1
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
                    {log.created_at?.slice(0, 19).replace("T", " ")}
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
        <div className="space-y-3">
          {order.status === "preparing" && !order.can_assemble && (
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-4">
              <div className="text-danger font-medium text-sm mb-2">
                ⚠️ 无法进入装配，存在以下问题：
              </div>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {!order.compatibility?.compatible && (
                  <li>
                    <span className="text-danger">兼容性冲突：</span>
                    {order.compatibility?.issues?.map((iss, i) => (
                      <span key={i}>
                        {iss.part_a} 与 {iss.part_b}：{iss.note}
                        {i < order.compatibility.issues.length - 1 ? "；" : ""}
                      </span>
                    )) || "存在兼容性冲突"}
                  </li>
                )}
                {!order.stock_consumed && (
                  <li>
                    <span className="text-danger">库存未扣减：</span>
                    请确认报价完成备料（客户需确认报价）
                  </li>
                )}
                {(order.parts?.length || 0) < 3 && (
                  <li>
                    <span className="text-danger">配置不完整：</span>
                    至少需要配置车架、轮组、传动系统
                  </li>
                )}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between">
            {order.status === "draft" && (
              <button
                className="btn-secondary"
                onClick={() => navigate(`/consultant/${order.id}`)}
              >
                🛠️ 前往配置
              </button>
            )}
            {order.status === "quote_pending" && (
              <button
                className="btn-secondary"
                onClick={() => navigate(`/consultant/${order.id}`)}
              >
                📄 查看报价
              </button>
            )}
            <div className="ml-auto flex gap-3 items-center">
              {!canAdvance().ok &&
                canAdvance().reason &&
                order.status !== "draft" && (
                  <span className="text-xs text-gray-400 mr-2">
                    {canAdvance().reason}
                  </span>
                )}
              <button
                className="btn-primary"
                onClick={handleNextStatus}
                disabled={!canAdvance().ok}
                style={{
                  opacity: !canAdvance().ok ? 0.5 : 1,
                  cursor: !canAdvance().ok ? "not-allowed" : "pointer",
                }}
              >
                {order.status === "quote_pending"
                  ? "✅ 客户确认报价 →"
                  : "推进到下一状态 →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
