import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const adjustmentStatusFlow = [
  { key: "adjust_pending", label: "待调整" },
  { key: "adjusting", label: "调整中" },
  { key: "adjust_debugging", label: "调试中" },
  { key: "adjust_ready", label: "完成可取" },
  { key: "adjust_delivered", label: "已交付" },
];

const partCategories = [
  { key: "frame", label: "车架", icon: "🚲" },
  { key: "wheelset", label: "轮组", icon: "🔘" },
  { key: "drivetrain", label: "传动", icon: "⚙️" },
  { key: "saddle", label: "座垫", icon: "🪑" },
  { key: "handlebar", label: "把组", icon: "🎯" },
  { key: "smart_accessory", label: "智能配件", icon: "📱" },
];

export default function AdjustmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [adjustment, setAdjustment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdjustment();
  }, [id]);

  const loadAdjustment = async () => {
    setLoading(true);
    try {
      const [adjRes, logsRes, resRes] = await Promise.all([
        fetch(`/api/adjustments/${id}`),
        fetch(`/api/adjustments/${id}/logs`),
        fetch(`/api/adjustments/${id}/reservations`),
      ]);
      if (adjRes.ok) {
        const data = await adjRes.json();
        setAdjustment(data);
        setReservations(data.reservations || []);
        setLogs(data.logs || []);
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
      console.error("加载调整单详情失败", e);
    } finally {
      setLoading(false);
    }
  };

  const canAdvance = () => {
    if (!adjustment) return { ok: false, reason: "" };
    const currentIndex = adjustmentStatusFlow.findIndex(
      (s) => s.key === adjustment.status,
    );
    if (currentIndex >= adjustmentStatusFlow.length - 1)
      return { ok: false, reason: "" };

    const nextStatus = adjustmentStatusFlow[currentIndex + 1];

    if (adjustment.status === "adjust_pending") {
      if (!adjustment.new_part_id) {
        return { ok: false, reason: "请先选择更换的配件" };
      }
      if (!adjustment.stock_consumed) {
        return { ok: false, reason: "库存未完成扣减" };
      }
    }

    return { ok: true };
  };

  const canRollback = () => {
    if (!adjustment) return { ok: false };
    if (
      adjustment.status === "adjust_pending" ||
      adjustment.status === "adjust_delivered"
    ) {
      return { ok: false };
    }
    if (adjustment.status === "adjusting") {
      return { ok: false, reason: "调整已开始，不能回退" };
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

    const currentIndex = adjustmentStatusFlow.findIndex(
      (s) => s.key === adjustment.status,
    );
    if (currentIndex >= adjustmentStatusFlow.length - 1) return;

    const nextStatus = adjustmentStatusFlow[currentIndex + 1];

    if (adjustment.status === "adjust_pending") {
      if (!confirm("确认开始调整？确认后将正式扣减库存。")) return;
    } else if (nextStatus.key === "adjust_delivered") {
      if (!confirm("确认车辆已交付客户？")) return;
    } else {
      if (!confirm(`确认推进到「${nextStatus.label}」状态？`)) return;
    }

    try {
      const res = await fetch(`/api/adjustments/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus.key,
          operator: "技师小李",
          remark: `推进至${nextStatus.label}`,
        }),
      });
      if (res.ok) {
        loadAdjustment();
      } else {
        const data = await res.json();
        alert(data.error || "操作失败");
      }
    } catch (e) {
      alert("网络错误");
    }
  };

  const handlePrevStatus = async () => {
    const currentIndex = adjustmentStatusFlow.findIndex(
      (s) => s.key === adjustment.status,
    );
    if (currentIndex <= 0) return;

    const prevStatus = adjustmentStatusFlow[currentIndex - 1];

    if (!confirm(`确认回退到「${prevStatus.label}」状态？`)) return;

    try {
      const res = await fetch(`/api/adjustments/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: prevStatus.key,
          operator: "技师小李",
          remark: `回退至${prevStatus.label}`,
        }),
      });
      if (res.ok) {
        loadAdjustment();
      } else {
        const data = await res.json();
        alert(data.error || "操作失败");
      }
    } catch (e) {
      alert("网络错误");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "adjust_pending":
        return "status-pending";
      case "adjusting":
        return "status-preparing";
      case "adjust_debugging":
        return "bg-secondary/10 text-secondary";
      case "adjust_ready":
        return "bg-success/10 text-success";
      case "adjust_delivered":
        return "bg-gray-100 text-gray-500";
      default:
        return `status-${status}`;
    }
  };

  if (loading) {
    return <div className="card p-8 text-center text-gray-400">加载中...</div>;
  }

  if (!adjustment) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500 mb-4">调整单不存在</p>
        <button className="btn-primary" onClick={() => navigate("/assembly")}>
          返回看板
        </button>
      </div>
    );
  }

  const currentStep = adjustmentStatusFlow.findIndex(
    (s) => s.key === adjustment.status,
  );
  const isInProgress = [
    "adjust_pending",
    "adjusting",
    "adjust_debugging",
    "adjust_ready",
  ].includes(adjustment.status);

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
              <h2 className="text-2xl font-bold text-dark">
                {adjustment.adjustment_no}
              </h2>
              <span
                className={`badge ${getStatusBadgeClass(adjustment.status)}`}
              >
                {adjustment.status_label}
              </span>
              {adjustment.stock_reserved === 1 &&
                adjustment.status === "adjust_pending" && (
                  <span className="badge bg-secondary/10 text-secondary">
                    🔒 库存已预占
                  </span>
                )}
              {adjustment.is_overdue && isInProgress && (
                <span className="badge bg-danger/10 text-danger animate-pulse">
                  ⚠️ 已超期
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">
              创建于 {adjustment.created_at}
              {adjustment.order_no && (
                <span className="ml-2">
                  · 原订单：
                  <span
                    className="text-primary cursor-pointer hover:underline"
                    onClick={() => navigate(`/orders/${adjustment.order_id}`)}
                  >
                    {adjustment.order_no}
                  </span>
                </span>
              )}
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">价格调整</div>
            <div
              className={`text-2xl font-bold ${
                adjustment.price_adjustment > 0
                  ? "text-danger"
                  : adjustment.price_adjustment < 0
                    ? "text-success"
                    : "text-gray-500"
              }`}
            >
              {adjustment.price_adjustment > 0 ? "+" : ""}¥
              {adjustment.price_adjustment?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-3">调整流程</div>
          <div className="flex items-center justify-between mb-2">
            {adjustmentStatusFlow.map((s, i) => (
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
                width: `${
                  (currentStep / (adjustmentStatusFlow.length - 1)) * 100
                }%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">客户信息</div>
            <div className="font-medium">{adjustment.customer_name}</div>
            <div className="text-sm text-gray-500">
              {adjustment.customer_phone}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">预计完成</div>
            <div
              className={`font-medium ${
                adjustment.is_overdue && isInProgress ? "text-danger" : ""
              }`}
            >
              {adjustment.estimated_date}
            </div>
            <div className="text-sm text-gray-500">
              {adjustment.is_overdue
                ? `已超期 ${Math.abs(adjustment.days_remaining)} 天`
                : `还剩 ${adjustment.days_remaining} 天`}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">完成进度</div>
            <div className="font-medium text-xl">{adjustment.progress}%</div>
            <div className="text-xs text-gray-400 mt-1">
              {adjustment.technician &&
                `负责技师：${adjustment.technician}`}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4">问题描述</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">问题类型</div>
            <div className="font-medium flex items-center gap-2">
              <span>{adjustment.issue_type_icon}</span>
              {adjustment.issue_type_label}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">涉及部件</div>
            <div className="font-medium">
              {adjustment.part_category_label}
            </div>
          </div>
        </div>
        {adjustment.issue_description && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">详细描述</div>
            <div className="text-gray-700">{adjustment.issue_description}</div>
          </div>
        )}
        {adjustment.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500 mb-1">备注</div>
            <div className="text-gray-700">{adjustment.notes}</div>
          </div>
        )}
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4">配件更换</h3>
        <div className="grid grid-cols-2 gap-6">
          <div
            className={`p-4 rounded-lg border ${
              adjustment.original_part
                ? "bg-white border-gray-200"
                : "bg-gray-50 border-dashed border-gray-300"
            }`}
          >
            <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
              <span>
                {partCategories.find(
                  (c) => c.key === adjustment.part_category,
                )?.icon}
              </span>
              原配件
            </div>
            {adjustment.original_part ? (
              <div>
                <div className="font-medium text-gray-800">
                  {adjustment.original_part.name}
                </div>
                <div className="text-xs text-gray-400 mb-1">
                  {adjustment.original_part.brand} ·{" "}
                  {adjustment.original_part.specs}
                </div>
                <div className="text-primary font-medium">
                  ¥{adjustment.original_part.price?.toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">无记录</div>
            )}
          </div>

          <div
            className={`p-4 rounded-lg border ${
              adjustment.new_part
                ? "bg-white border-primary"
                : "bg-gray-50 border-dashed border-gray-300"
            }`}
          >
            <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
              <span>
                {partCategories.find(
                  (c) => c.key === adjustment.part_category,
                )?.icon}
              </span>
              更换为
            </div>
            {adjustment.new_part ? (
              <div>
                <div className="font-medium text-gray-800">
                  {adjustment.new_part.name}
                </div>
                <div className="text-xs text-gray-400 mb-1">
                  {adjustment.new_part.brand} ·{" "}
                  {adjustment.new_part.specs}
                </div>
                <div className="text-primary font-medium">
                  ¥{adjustment.new_part.price?.toLocaleString()}
                </div>
                {adjustment.new_part.effective_stock != null && (
                  <div
                    className={`text-xs mt-1 ${
                      adjustment.new_part.effective_stock <= 0
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    可用库存：{adjustment.new_part.effective_stock}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-sm">未选择配件</div>
            )}
          </div>
        </div>

        {adjustment.original_part && adjustment.new_part && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">差价</span>
              <span
                className={`font-bold text-lg ${
                  adjustment.price_adjustment > 0
                    ? "text-danger"
                    : adjustment.price_adjustment < 0
                      ? "text-success"
                      : "text-gray-500"
                }`}
              >
                {adjustment.price_adjustment > 0 ? "+" : ""}¥
                {adjustment.price_adjustment.toLocaleString()}
              </span>
            </div>
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
                      {
                        partCategories.find((c) => c.key === r.category)
                          ?.label
                      }{" "}
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
                    {adjustmentStatusFlow.find((s) => s.key === log.status)
                      ?.label || log.status}
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

      {adjustment.status !== "adjust_delivered" && (
        <div className="space-y-3">
          {adjustment.status === "adjust_pending" && !adjustment.can_adjust && (
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-4">
              <div className="text-danger font-medium text-sm mb-2">
                ⚠️ 无法开始调整，存在以下问题：
              </div>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {!adjustment.new_part_id && (
                  <li>
                    <span className="text-danger">未选择配件：</span>
                    请先选择需要更换的配件
                  </li>
                )}
                {!adjustment.stock_consumed && (
                  <li>
                    <span className="text-danger">库存未扣减：</span>
                    库存预占尚未正式扣减
                  </li>
                )}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              className="btn-secondary"
              onClick={() => navigate(`/orders/${adjustment.order_id}`)}
            >
              📋 查看原订单
            </button>
            <div className="ml-auto flex gap-3 items-center">
              {!canRollback().ok &&
                canRollback().reason &&
                adjustment.status !== "adjust_pending" && (
                  <span className="text-xs text-gray-400 mr-2">
                    {canRollback().reason}
                  </span>
                )}
              {adjustment.status !== "adjust_pending" && (
                <button
                  className="btn-secondary"
                  onClick={handlePrevStatus}
                  disabled={!canRollback().ok}
                  style={{
                    opacity: !canRollback().ok ? 0.5 : 1,
                    cursor: !canRollback().ok ? "not-allowed" : "pointer",
                  }}
                >
                  ← 回退
                </button>
              )}
              {!canAdvance().ok &&
                canAdvance().reason &&
                adjustment.status !== "adjust_delivered" && (
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
                {adjustment.status === "adjust_pending"
                  ? "🔧 开始调整 →"
                  : adjustment.status === "adjust_ready"
                    ? "✅ 确认交付 →"
                    : "推进到下一状态 →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustment.status === "adjust_delivered" && (
        <div className="space-y-3">
          <div className="bg-success/5 border border-success/20 rounded-lg p-4">
            <div className="text-success font-medium text-sm mb-2">
              ✅ 调整已完成并交付
            </div>
            <p className="text-sm text-gray-600">
              本次调整已完成，所有记录已归档。如有其他问题，可在原订单中发起新的调整。
            </p>
          </div>
          <div className="flex justify-end">
            <button
              className="btn-secondary"
              onClick={() => navigate(`/orders/${adjustment.order_id}`)}
            >
              📋 返回原订单
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
