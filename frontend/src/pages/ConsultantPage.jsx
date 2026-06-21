import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const categoryConfig = [
  { key: "frame", label: "车架", icon: "🚲", required: true },
  { key: "wheelset", label: "轮组", icon: "🔘", required: true },
  { key: "drivetrain", label: "传动", icon: "⚙️", required: true },
  { key: "saddle", label: "座垫", icon: "🪑", required: false },
  { key: "handlebar", label: "把组", icon: "🎯", required: false },
  { key: "smart_accessory", label: "智能配件", icon: "📱", required: false },
];

const categoryLabelMap = categoryConfig.reduce((acc, c) => {
  acc[c.key] = c.label;
  return acc;
}, {});

export default function ConsultantPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [parts, setParts] = useState({});
  const [selectedParts, setSelectedParts] = useState({
    frame: null,
    wheelset: null,
    drivetrain: null,
    saddle: null,
    handlebar: null,
    smart_accessory: null,
  });
  const [estimatedDays, setEstimatedDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState("frame");
  const [compatibility, setCompatibility] = useState({ compatible: true, issues: [] });
  const [stockOccupation, setStockOccupation] = useState([]);
  const [showQuote, setShowQuote] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteData, setQuoteData] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (orderId && orders.length > 0) {
      const order = orders.find((o) => o.id === parseInt(orderId));
      if (order) {
        selectOrder(order);
      }
    }
  }, [orderId, orders]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        if (!orderId && data.length > 0) {
          const pendingOrder = data.find(
            (o) => o.status === "draft" || o.status === "quote_pending",
          );
          if (pendingOrder) {
            selectOrder(pendingOrder);
          }
        }
      }
    } catch (e) {
      console.error("加载订单失败", e);
    } finally {
      setLoading(false);
    }
  };

  const selectOrder = async (order) => {
    setSelectedOrder(order);
    setEstimatedDays(order.estimated_days || 7);
    setShowQuote(order.status === "quote_pending");

    const newSelected = {
      frame: order.frame_id || null,
      wheelset: order.wheelset_id || null,
      drivetrain: order.drivetrain_id || null,
      saddle: order.saddle_id || null,
      handlebar: order.handlebar_id || null,
      smart_accessory: order.smart_accessory_id || null,
    };
    setSelectedParts(newSelected);
    setQuoteData(order.quote || null);

    for (const cat of categoryConfig) {
      loadParts(cat.key, order.use_type);
    }

    if (Object.values(newSelected).filter(Boolean).length >= 2) {
      checkCompat(newSelected);
    }
  };

  const loadParts = async (category, useType) => {
    try {
      const res = await fetch(
        `/api/parts?category=${category}&use_type=${useType}`,
      );
      if (res.ok) {
        const data = await res.json();
        setParts((prev) => ({ ...prev, [category]: data }));
      }
    } catch (e) {
      console.error(`加载${category}配件失败`, e);
    }
  };

  const checkCompat = (sel) => {
    const ids = Object.values(sel).filter(Boolean);
    if (ids.length < 2) {
      setCompatibility({ compatible: true, issues: [] });
      return;
    }
    fetch(`/api/compatibility/check?part_ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d) => setCompatibility(d))
      .catch(() => setCompatibility({ compatible: true, issues: [] }));
  };

  const handleSelectPart = (category, part) => {
    if (selectedOrder?.status === "quote_pending" ||
        selectedOrder?.status === "preparing" ||
        selectedOrder?.status === "assembling") {
      alert("当前状态不可修改配件，请先取消报价或等待当前流程完成");
      return;
    }
    const newSel = {
      ...selectedParts,
      [category]: selectedParts[category] === part.id ? null : part.id,
    };
    setSelectedParts(newSel);
    checkCompat(newSel);
  };

  const totalPrice = Object.keys(selectedParts).reduce((sum, key) => {
    const partId = selectedParts[key];
    if (!partId || !parts[key]) return sum;
    const part = parts[key].find((p) => p.id === partId);
    return sum + (part?.price || 0);
  }, 0);

  const stockIssues = Object.keys(selectedParts).filter((key) => {
    const partId = selectedParts[key];
    if (!partId || !parts[key]) return false;
    const part = parts[key].find((p) => p.id === partId);
    const eff = part?.effective_stock != null ? part.effective_stock : part?.stock;
    return part && eff <= 0;
  });

  const configuredCount = Object.values(selectedParts).filter(Boolean).length;
  const canGenerateQuote =
    selectedParts.frame &&
    selectedParts.wheelset &&
    selectedParts.drivetrain &&
    stockIssues.length === 0 &&
    compatibility.compatible;

  const isLockedForEdit =
    selectedOrder?.status === "quote_pending" ||
    selectedOrder?.status === "preparing" ||
    selectedOrder?.status === "assembling" ||
    selectedOrder?.status === "debugging" ||
    selectedOrder?.status === "ready" ||
    selectedOrder?.status === "delivered";

  const getPartById = (category, id) => {
    if (!parts[category] || !id) return null;
    return parts[category].find((p) => p.id === id);
  };

  const calcQuoteBreakdown = () => {
    const items = [];
    let subtotal = 0;
    for (const cat of categoryConfig) {
      const partId = selectedParts[cat.key];
      const part = getPartById(cat.key, partId);
      if (part) {
        const eff = part.effective_stock != null ? part.effective_stock : part.stock;
        subtotal += part.price;
        items.push({
          category: cat.key,
          category_label: cat.label,
          part_id: part.id,
          name: part.name,
          brand: part.brand,
          specs: part.specs,
          unit_price: part.price,
          quantity: 1,
          subtotal: part.price,
          original_stock: part.stock,
          effective_stock: eff,
          stock_status: eff > 0 ? "available" : "shortage",
          after_reservation: eff - 1,
        });
      }
    }
    const laborFee = Math.round(subtotal * 0.08);
    const assemblyFee = 300;
    return {
      items,
      parts_subtotal: subtotal,
      labor_fee: laborFee,
      assembly_fee: assemblyFee,
      total_price: subtotal + laborFee + assemblyFee,
    };
  };

  const handleSaveConfig = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/configure`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frame_id: selectedParts.frame,
          wheelset_id: selectedParts.wheelset,
          drivetrain_id: selectedParts.drivetrain,
          saddle_id: selectedParts.saddle,
          handlebar_id: selectedParts.handlebar,
          smart_accessory_id: selectedParts.smart_accessory,
          estimated_days: estimatedDays,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStockOccupation(data.stock_occupation || []);
        setCompatibility(data.compatibility || { compatible: true, issues: [] });
        alert("配置保存成功！");
        await loadOrders();
      } else {
        const data = await res.json();
        alert(data.error || "保存失败");
      }
    } catch (e) {
      alert("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQuote = async () => {
    if (!canGenerateQuote) {
      if (stockIssues.length > 0) {
        alert("部分配件可用库存不足，无法生成报价");
        return;
      }
      if (!compatibility.compatible) {
        alert("存在兼容性冲突，无法生成报价");
        return;
      }
      alert("请至少选择车架、轮组和传动系统");
      return;
    }
    if (!selectedOrder) return;

    setSubmittingQuote(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/generate-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "顾问小王" }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuoteData(data.quote || null);
        setShowQuote(true);
        alert("报价已生成！库存已预占，等待客户确认。");
        await loadOrders();
      } else {
        const data = await res.json();
        alert(data.error || "生成报价失败");
      }
    } catch (e) {
      alert("网络错误");
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleConfirmQuote = async () => {
    if (!selectedOrder) return;
    if (!confirm("确认客户已同意报价？确认后将扣减库存并进入备料阶段。")) return;
    setSubmittingQuote(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/confirm-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: selectedOrder.customer_name || "客户" }),
      });
      if (res.ok) {
        alert("客户已确认报价，订单进入备料阶段！");
        await loadOrders();
        navigate("/assembly");
      } else {
        const data = await res.json();
        alert(data.error || "确认失败");
      }
    } catch (e) {
      alert("网络错误");
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleCancelQuote = async () => {
    if (!selectedOrder) return;
    const reason = prompt("请输入取消原因（可选）：") || "";
    setSubmittingQuote(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/cancel-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "顾问小王", reason }),
      });
      if (res.ok) {
        setShowQuote(false);
        setQuoteData(null);
        alert("报价已取消，库存预占已释放。");
        await loadOrders();
      } else {
        const data = await res.json();
        alert(data.error || "取消失败");
      }
    } catch (e) {
      alert("网络错误");
    } finally {
      setSubmittingQuote(false);
    }
  };

  const editableOrders = orders.filter(
    (o) => o.status === "draft" || o.status === "quote_pending",
  );

  const getStatusBadge = (order) => {
    const base = "text-xs px-2 py-0.5 rounded-full";
    switch (order.status) {
      case "draft":
        return `${base} bg-gray-100 text-gray-600`;
      case "quote_pending":
        return `${base} bg-warning/10 text-warning`;
      default:
        return `${base} bg-primary/10 text-primary`;
    }
  };

  const liveQuote = quoteData || calcQuoteBreakdown();
  const createdDate = selectedOrder ? new Date(selectedOrder.created_at) : new Date();
  const estimatedDate = new Date(
    createdDate.getTime() + estimatedDays * 24 * 60 * 60 * 1000,
  );

  return (
    <div className="flex gap-6 h-[calc(100vh-160px)]">
      <div className="w-72 card p-4 overflow-y-auto flex-shrink-0">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>📋</span>
          顾问工作台
          <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
            {editableOrders.length}
          </span>
        </h3>

        {loading ? (
          <div className="text-center text-gray-400 py-8">加载中...</div>
        ) : editableOrders.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">
            暂无待处理订单
          </div>
        ) : (
          <div className="space-y-2">
            {editableOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => selectOrder(order)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  selectedOrder?.id === order.id
                    ? "bg-primary/5 border-primary"
                    : "bg-gray-50 border-transparent hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{order.order_no}</span>
                  <span className={getStatusBadge(order)}>
                    {order.status_label}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {order.customer_name}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {order.use_type_label} · ¥{order.budget?.toLocaleString()}
                </div>
                {order.quote_expired && (
                  <div className="text-xs text-danger mt-1 font-medium">
                    ⚠️ 报价已过期
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 card p-6 overflow-y-auto">
        {!selectedOrder ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            请从左侧选择一个订单进行配置
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-xl font-semibold">
                    {selectedOrder.order_no}
                  </h3>
                  <span
                    className={`badge ${
                      selectedOrder.status === "draft"
                        ? "bg-gray-100 text-gray-600"
                        : selectedOrder.status === "quote_pending"
                          ? selectedOrder.quote_expired
                            ? "bg-danger/10 text-danger"
                            : "status-pending"
                          : `status-${selectedOrder.status}`
                    }`}
                  >
                    {selectedOrder.status_label}
                    {selectedOrder.quote_expired && "（已过期）"}
                  </span>
                  {selectedOrder.stock_reserved === 1 &&
                    selectedOrder.status === "quote_pending" && (
                      <span className="badge bg-secondary/10 text-secondary">
                        🔒 库存已预占
                      </span>
                    )}
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">客户：</span>
                    <span className="text-gray-700">
                      {selectedOrder.customer_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">用途：</span>
                    <span className="text-gray-700">
                      {selectedOrder.use_type_label}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">身高：</span>
                    <span className="text-gray-700">
                      {selectedOrder.height} cm
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">预算：</span>
                    <span className="text-primary font-medium">
                      ¥{selectedOrder.budget?.toLocaleString()}
                    </span>
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="text-sm text-gray-500 mt-2">
                    备注：{selectedOrder.notes}
                  </div>
                )}
                {selectedOrder.quote_generated_at && (
                  <div className="text-xs text-gray-400 mt-2">
                    报价生成时间：{selectedOrder.quote_generated_at}
                    {selectedOrder.quote_confirmed_at &&
                      ` · 确认时间：${selectedOrder.quote_confirmed_at} (${selectedOrder.quote_confirmed_by || "客户"})`}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">配置总价</div>
                <div
                  className={`text-2xl font-bold ${
                    totalPrice > selectedOrder.budget
                      ? "text-danger"
                      : "text-primary"
                  }`}
                >
                  ¥{totalPrice.toLocaleString()}
                </div>
                {totalPrice > selectedOrder.budget && (
                  <div className="text-xs text-danger mt-1">
                    超出预算 ¥
                    {(totalPrice - selectedOrder.budget).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              {categoryConfig.map((cat) => {
                const selected = selectedParts[cat.key];
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      activeCategory === cat.key
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } ${isLockedForEdit ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={isLockedForEdit}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                    {cat.required && (
                      <span className="text-xs text-danger">*</span>
                    )}
                    {selected && (
                      <span className="w-2 h-2 bg-success rounded-full"></span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => setShowQuote(!showQuote)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ml-auto ${
                  showQuote
                    ? "bg-secondary text-white"
                    : "bg-secondary/10 text-secondary hover:bg-secondary/20"
                }`}
              >
                📄 {showQuote ? "返回配置" : "查看报价预览"}
              </button>
            </div>

            {!showQuote ? (
              <>
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-3">
                    {categoryConfig.find((c) => c.key === activeCategory)?.label}
                    <span className="text-sm font-normal text-gray-400 ml-2">
                      共 {parts[activeCategory]?.length || 0} 款可选
                      {isLockedForEdit && (
                        <span className="text-warning ml-2">
                          （当前状态不可修改）
                        </span>
                      )}
                    </span>
                  </h4>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {parts[activeCategory]?.map((part) => {
                      const isSelected = selectedParts[activeCategory] === part.id;
                      const eff =
                        part.effective_stock != null
                          ? part.effective_stock
                          : part.stock;
                      const outOfStock = eff <= 0;
                      const reservedByOthers =
                        part.stock > 0 && part.effective_stock != null && part.effective_stock < part.stock;
                      return (
                        <div
                          key={part.id}
                          onClick={() =>
                            !outOfStock &&
                            !isLockedForEdit &&
                            handleSelectPart(activeCategory, part)
                          }
                          className={`p-4 rounded-xl border-2 transition-all ${
                            isLockedForEdit
                              ? "opacity-60 cursor-not-allowed"
                              : outOfStock
                                ? "opacity-50 cursor-not-allowed border-gray-100 bg-gray-50"
                                : isSelected
                                  ? "border-primary bg-primary/5 cursor-pointer"
                                  : "border-gray-100 hover:border-gray-200 cursor-pointer hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-gray-800">
                                {part.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                {part.brand}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs">
                                ✓
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-gray-500 mb-3">
                            {part.specs}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">
                              ¥{part.price.toLocaleString()}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                outOfStock
                                  ? "bg-danger/10 text-danger"
                                  : eff < 5
                                    ? "bg-warning/10 text-warning"
                                    : "bg-success/10 text-success"
                              }`}
                            >
                              可用 {eff}
                              {reservedByOthers && (
                                <span className="text-gray-400 ml-1">
                                  (总{part.stock})
                                </span>
                              )}
                            </span>
                          </div>

                          {outOfStock && (
                            <div className="text-xs text-danger mt-2">
                              ⚠️ 可用库存不足
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {!compatibility.compatible && compatibility.issues.length > 0 && (
                  <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 mb-6">
                    <div className="text-danger font-medium text-sm mb-2">
                      ⚠️ 兼容性冲突
                    </div>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {compatibility.issues.map((issue, i) => (
                        <li key={i}>
                          {issue.part_a} 与 {issue.part_b}：{issue.note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {stockIssues.length > 0 && (
                  <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 mb-6">
                    <div className="text-danger font-medium text-sm mb-2">
                      ⚠️ 库存不足警告
                    </div>
                    <div className="text-sm text-gray-600">
                      以下配件可用库存不足：
                      <ul className="list-disc list-inside mt-1">
                        {stockIssues.map((key) => {
                          const part = getPartById(key, selectedParts[key]);
                          return (
                            <li key={key}>
                              {categoryLabelMap[key]} - {part?.name}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-700">配置清单</h4>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      预计交付：
                      <input
                        type="number"
                        className={`w-16 px-2 py-1 border border-gray-200 rounded text-center ${
                          isLockedForEdit ? "bg-gray-100" : ""
                        }`}
                        value={estimatedDays}
                        onChange={(e) =>
                          setEstimatedDays(parseInt(e.target.value) || 7)
                        }
                        min="1"
                        disabled={isLockedForEdit}
                      />
                      天（约 {estimatedDate.toISOString().split("T")[0]}）
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {categoryConfig.map((cat) => {
                      const partId = selectedParts[cat.key];
                      const part = getPartById(cat.key, partId);
                      const eff =
                        part?.effective_stock != null
                          ? part.effective_stock
                          : part?.stock;
                      return (
                        <div
                          key={cat.key}
                          className={`p-3 rounded-lg border ${
                            part
                              ? "bg-white border-gray-200"
                              : "bg-gray-100 border-dashed border-gray-300"
                          }`}
                        >
                          <div className="text-xs text-gray-400 mb-1 flex items-center gap-1 justify-between">
                            <span className="flex items-center gap-1">
                              <span>{cat.icon}</span>
                              {cat.label}
                              {cat.required && (
                                <span className="text-danger">*</span>
                              )}
                            </span>
                            {part && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  eff <= 0
                                    ? "bg-danger/10 text-danger"
                                    : "bg-success/10 text-success"
                                }`}
                              >
                                可{eff}
                              </span>
                            )}
                          </div>
                          {part ? (
                            <div>
                              <div className="text-sm font-medium text-gray-700 truncate">
                                {part.name}
                              </div>
                              <div className="text-sm text-primary font-medium">
                                ¥{part.price.toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">未选择</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <span className="text-gray-500 text-sm">配件小计：</span>
                      <span
                        className={`text-xl font-bold ${
                          totalPrice > selectedOrder.budget
                            ? "text-danger"
                            : "text-primary"
                        }`}
                      >
                        ¥{totalPrice.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-400 ml-2">
                        (预算 ¥{selectedOrder.budget?.toLocaleString()})
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        已选 {configuredCount}/6 项配件
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {!isLockedForEdit && (
                        <button
                          className="btn-secondary"
                          onClick={handleSaveConfig}
                          disabled={saving}
                        >
                          {saving ? "保存中..." : "保存配置"}
                        </button>
                      )}
                      {selectedOrder.status === "draft" && (
                        <button
                          className="btn-primary"
                          onClick={handleGenerateQuote}
                          disabled={!canGenerateQuote || submittingQuote}
                        >
                          {submittingQuote ? "生成中..." : "📄 生成报价并提交客户"}
                        </button>
                      )}
                      {selectedOrder.status === "quote_pending" &&
                        !selectedOrder.quote_expired && (
                          <>
                            <button
                              className="btn-secondary"
                              onClick={handleCancelQuote}
                              disabled={submittingQuote}
                            >
                              {submittingQuote ? "处理中..." : "取消报价"}
                            </button>
                            <button
                              className="btn-primary"
                              onClick={handleConfirmQuote}
                              disabled={submittingQuote}
                            >
                              ✅ 客户确认报价
                            </button>
                          </>
                        )}
                      {selectedOrder.status === "quote_pending" &&
                        selectedOrder.quote_expired && (
                          <button
                            className="btn-secondary"
                            onClick={handleCancelQuote}
                            disabled={submittingQuote}
                          >
                            报价已过期，重新生成
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">定制自行车报价单</h3>
                      <p className="text-white/80 text-sm">
                        订单号：{selectedOrder.order_no} · 客户：
                        {selectedOrder.customer_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-white/70 text-xs mb-1">报价有效期</div>
                      <div className="font-medium">
                        {selectedOrder.quote_valid_hours || 24} 小时
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span>🔧</span> 配置配件明细
                  </h4>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="text-left p-3 rounded-l-lg">类别</th>
                          <th className="text-left p-3">配件名称</th>
                          <th className="text-left p-3">规格</th>
                          <th className="text-right p-3">单价</th>
                          <th className="text-center p-3">数量</th>
                          <th className="text-right p-3">小计</th>
                          <th className="text-center p-3 rounded-r-lg">库存状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveQuote.items.map((item, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-50 hover:bg-gray-50"
                          >
                            <td className="p-3 text-gray-600">
                              {item.category_label}
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-gray-800">
                                {item.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                {item.brand}
                              </div>
                            </td>
                            <td className="p-3 text-gray-600 text-xs">
                              {item.specs}
                            </td>
                            <td className="p-3 text-right text-gray-700">
                              ¥{item.unit_price.toLocaleString()}
                            </td>
                            <td className="p-3 text-center text-gray-700">1</td>
                            <td className="p-3 text-right font-medium text-gray-800">
                              ¥{item.subtotal.toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  item.stock_status === "available"
                                    ? "bg-success/10 text-success"
                                    : "bg-danger/10 text-danger"
                                }`}
                              >
                                {item.stock_status === "available"
                                  ? `可用 ${item.effective_stock}（预占后剩 ${item.after_reservation ?? item.effective_stock - 1}）`
                                  : "库存不足"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {liveQuote.items.length === 0 && (
                          <tr>
                            <td
                              colSpan="7"
                              className="p-8 text-center text-gray-400"
                            >
                              请先选择配件
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-blue-50/50 rounded-lg p-5 border border-blue-100">
                      <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <span>📦</span> 库存占用说明
                      </h5>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>
                            报价生成后，系统将为您<span className="font-medium text-primary">预占所选配件库存</span>
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>
                            预占有效期：{selectedOrder.quote_valid_hours || 24} 小时，过期自动释放
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>客户确认后库存正式扣减，进入备料阶段</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>若库存有变动，需重新生成报价</span>
                        </div>
                      </div>
                      {selectedOrder.status === "quote_pending" && (
                        <div className="mt-4 pt-3 border-t border-blue-100 text-xs text-secondary">
                          🔒 当前报价已预占 {liveQuote.items.length} 件配件库存
                        </div>
                      )}
                    </div>

                    <div className="bg-orange-50/50 rounded-lg p-5 border border-orange-100">
                      <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <span>📅</span> 交付与兼容说明
                      </h5>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-start gap-2">
                          <span className="text-warning">•</span>
                          <span>
                            预计交付周期：<span className="font-medium">{estimatedDays} 天</span>
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-warning">•</span>
                          <span>
                            预计交付日期：
                            <span className="font-medium">
                              {estimatedDate.toISOString().split("T")[0]}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-warning">•</span>
                          <span>
                            兼容性：
                            {compatibility.compatible ? (
                              <span className="text-success font-medium">
                                ✓ 已通过兼容性检查
                              </span>
                            ) : (
                              <span className="text-danger font-medium">
                                ✗ 存在兼容性冲突
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-warning">•</span>
                          <span>
                            装配包含调试与质检，约需 1-2 天
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6">
                    <div className="space-y-3 max-w-md ml-auto text-right">
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>配件小计</span>
                        <span>¥{liveQuote.parts_subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>人工服务费（8%）</span>
                        <span>¥{liveQuote.labor_fee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>装配调试费</span>
                        <span>¥{liveQuote.assembly_fee.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-800">
                            报价总计
                          </span>
                          <span
                            className={`text-3xl font-bold ${
                              liveQuote.total_price > selectedOrder.budget
                                ? "text-danger"
                                : "text-primary"
                            }`}
                          >
                            ¥{liveQuote.total_price.toLocaleString()}
                          </span>
                        </div>
                        {liveQuote.total_price > selectedOrder.budget && (
                          <div className="text-xs text-danger mt-1">
                            超出客户预算 ¥
                            {(liveQuote.total_price - selectedOrder.budget).toLocaleString()}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          客户预算：¥
                          {selectedOrder.budget?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                    <button
                      className="btn-secondary"
                      onClick={() => setShowQuote(false)}
                    >
                      返回配置
                    </button>
                    {selectedOrder.status === "draft" && (
                      <button
                        className="btn-primary"
                        onClick={handleGenerateQuote}
                        disabled={!canGenerateQuote || submittingQuote}
                      >
                        {submittingQuote ? "处理中..." : "📄 确认生成报价"}
                      </button>
                    )}
                    {selectedOrder.status === "quote_pending" &&
                      !selectedOrder.quote_expired && (
                        <>
                          <button
                            className="btn-secondary"
                            onClick={handleCancelQuote}
                            disabled={submittingQuote}
                          >
                            取消报价
                          </button>
                          <button
                            className="btn-primary"
                            onClick={handleConfirmQuote}
                            disabled={submittingQuote}
                          >
                            ✅ 客户确认并进入备料
                          </button>
                        </>
                      )}
                    {selectedOrder.status === "quote_pending" &&
                      selectedOrder.quote_expired && (
                        <button
                          className="btn-primary"
                          onClick={handleCancelQuote}
                          disabled={submittingQuote}
                        >
                          报价已过期，重新配置
                        </button>
                      )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
