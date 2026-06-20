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
          const pendingOrder = data.find((o) => o.status === "pending");
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

    const newSelected = {
      frame: order.frame_id || null,
      wheelset: order.wheelset_id || null,
      drivetrain: order.drivetrain_id || null,
      saddle: order.saddle_id || null,
      handlebar: order.handlebar_id || null,
      smart_accessory: order.smart_accessory_id || null,
    };
    setSelectedParts(newSelected);

    for (const cat of categoryConfig) {
      loadParts(cat.key, order.use_type);
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

  const handleSelectPart = (category, part) => {
    setSelectedParts((prev) => ({
      ...prev,
      [category]: prev[category] === part.id ? null : part.id,
    }));
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
    return part && part.stock <= 0;
  });

  const canConfirm =
    selectedParts.frame &&
    selectedParts.wheelset &&
    selectedParts.drivetrain &&
    stockIssues.length === 0;

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
        alert("配置保存成功！");
        loadOrders();
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

  const handleConfirmOrder = async () => {
    if (!canConfirm) {
      if (stockIssues.length > 0) {
        alert("部分配件库存不足，无法确认订单");
        return;
      }
      alert("请至少选择车架、轮组和传动系统");
      return;
    }

    if (!selectedOrder) return;
    if (!confirm("确认开始备料？确认后将扣减库存。")) return;

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "preparing",
          operator: "顾问小王",
          remark: "配置完成，开始备料",
        }),
      });
      if (res.ok) {
        alert("订单已确认，进入备料阶段");
        loadOrders();
        navigate("/assembly");
      } else {
        const data = await res.json();
        alert(data.error || "操作失败");
      }
    } catch (e) {
      alert("网络错误");
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");

  const getPartById = (category, id) => {
    if (!parts[category] || !id) return null;
    return parts[category].find((p) => p.id === id);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-160px)]">
      <div className="w-72 card p-4 overflow-y-auto flex-shrink-0">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>📋</span>
          待配置订单
          <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
            {pendingOrders.length}
          </span>
        </h3>

        {loading ? (
          <div className="text-center text-gray-400 py-8">加载中...</div>
        ) : pendingOrders.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">
            暂无待配置订单
          </div>
        ) : (
          <div className="space-y-2">
            {pendingOrders.map((order) => (
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
                  <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">
                    {order.status_label}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {order.customer_name}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {order.use_type_label} · ¥{order.budget?.toLocaleString()}
                </div>
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
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold">
                    {selectedOrder.order_no}
                  </h3>
                  <span className="badge status-pending">
                    {selectedOrder.status_label}
                  </span>
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
                const partCount = parts[cat.key]?.length || 0;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      activeCategory === cat.key
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
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
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">
                {categoryConfig.find((c) => c.key === activeCategory)?.label}
                <span className="text-sm font-normal text-gray-400 ml-2">
                  共 {parts[activeCategory]?.length || 0} 款可选
                </span>
              </h4>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {parts[activeCategory]?.map((part) => {
                  const isSelected = selectedParts[activeCategory] === part.id;
                  const outOfStock = part.stock <= 0;
                  return (
                    <div
                      key={part.id}
                      onClick={() =>
                        !outOfStock && handleSelectPart(activeCategory, part)
                      }
                      className={`p-4 rounded-xl border-2 transition-all ${
                        outOfStock
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
                              : part.stock < 5
                                ? "bg-warning/10 text-warning"
                                : "bg-success/10 text-success"
                          }`}
                        >
                          库存 {part.stock}
                        </span>
                      </div>

                      {outOfStock && (
                        <div className="text-xs text-danger mt-2">
                          ⚠️ 库存不足
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {stockIssues.length > 0 && (
              <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 mb-6">
                <div className="text-danger font-medium text-sm mb-2">
                  ⚠️ 库存不足警告
                </div>
                <div className="text-sm text-gray-600">
                  以下配件库存不足，无法确认订单：
                  <ul className="list-disc list-inside mt-1">
                    {stockIssues.map((key) => {
                      const part = getPartById(key, selectedParts[key]);
                      return (
                        <li key={key}>
                          {categoryConfig.find((c) => c.key === key)?.label} -{" "}
                          {part?.name}
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
                <div className="text-sm text-gray-500">
                  预计交付周期：
                  <input
                    type="number"
                    className="w-16 ml-2 px-2 py-1 border border-gray-200 rounded text-center"
                    value={estimatedDays}
                    onChange={(e) =>
                      setEstimatedDays(parseInt(e.target.value) || 7)
                    }
                    min="1"
                  />
                  天
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {categoryConfig.map((cat) => {
                  const partId = selectedParts[cat.key];
                  const part = getPartById(cat.key, partId);
                  return (
                    <div
                      key={cat.key}
                      className={`p-3 rounded-lg border ${
                        part
                          ? "bg-white border-gray-200"
                          : "bg-gray-100 border-dashed border-gray-300"
                      }`}
                    >
                      <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        <span>{cat.icon}</span>
                        {cat.label}
                        {cat.required && <span className="text-danger">*</span>}
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
                  <span className="text-gray-500 text-sm">总价：</span>
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
                </div>

                <div className="flex gap-3">
                  <button
                    className="btn-secondary"
                    onClick={handleSaveConfig}
                    disabled={saving}
                  >
                    {saving ? "保存中..." : "保存配置"}
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleConfirmOrder}
                    disabled={!canConfirm}
                  >
                    确认并开始备料
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
