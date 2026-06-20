import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const useTypes = [
  { key: "commute", label: "通勤", icon: "🏙️", desc: "日常上下班，舒适便捷" },
  {
    key: "longdistance",
    label: "长途",
    icon: "🛣️",
    desc: "长途旅行，耐用可靠",
  },
  { key: "race", label: "竞赛", icon: "🏁", desc: "速度竞技，轻量化" },
  { key: "family", label: "亲子", icon: "👨‍👩‍👧", desc: "带娃出行，安全舒适" },
];

const ridingStyles = [
  { key: "upright", label: "直立", desc: "放松休闲，适合通勤" },
  { key: "relaxed", label: "稍前倾", desc: "均衡舒适，适合长途" },
  { key: "aggressive", label: "前倾", desc: "气动姿势，适合竞赛" },
];

const colors = [
  { key: "黑色", color: "#1d2129" },
  { key: "白色", color: "#ffffff", border: true },
  { key: "红色", color: "#f53f3f" },
  { key: "蓝色", color: "#165dff" },
  { key: "黄色", color: "#ff7d00" },
  { key: "绿色", color: "#00b42a" },
  { key: "钛色", color: "#86909c" },
  { key: "粉色", color: "#f596d0" },
];

export default function CustomerOrderPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    use_type: "",
    height: "",
    riding_style: "",
    budget: "",
    color_preference: "",
    customer_name: "",
    customer_phone: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => setMeta(d))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!formData.customer_name || !formData.customer_phone) {
      alert("请填写姓名和电话");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`定制需求提交成功！订单号：${data.order_no}`);
        navigate(`/consultant/${data.id}`);
      } else {
        alert(data.error || "提交失败");
      }
    } catch (e) {
      alert("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = () => {
    switch (step) {
      case 1:
        return !!formData.use_type;
      case 2:
        return (
          formData.height >= 140 &&
          formData.height <= 210 &&
          !!formData.riding_style
        );
      case 3:
        return !!formData.budget && formData.budget > 0;
      case 4:
        return !!formData.color_preference;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-dark mb-2">
          定制你的专属自行车
        </h2>
        <p className="text-gray-500">
          告诉我们你的需求，顾问将为你推荐最佳配置
        </p>
      </div>

      <div className="flex items-center justify-center mb-10">
        {[1, 2, 3, 4, 5].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                step >= s
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            {i < 4 && (
              <div
                className={`w-16 h-1 mx-2 rounded transition-all ${
                  step > s ? "bg-primary" : "bg-gray-100"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="card p-8">
        {step === 1 && (
          <div>
            <h3 className="text-xl font-semibold mb-2">选择使用场景</h3>
            <p className="text-gray-500 mb-6 text-sm">
              不同的用途有不同的配置侧重
            </p>

            <div className="grid grid-cols-2 gap-4">
              {useTypes.map((type) => (
                <button
                  key={type.key}
                  onClick={() =>
                    setFormData({ ...formData, use_type: type.key })
                  }
                  className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                    formData.use_type === type.key
                      ? "border-primary bg-primary/5"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="text-4xl mb-3">{type.icon}</div>
                  <div className="font-semibold text-lg mb-1">{type.label}</div>
                  <div className="text-sm text-gray-500">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-xl font-semibold mb-2">身高与骑姿</h3>
            <p className="text-gray-500 mb-6 text-sm">
              帮助我们选择合适的车架尺寸和把型
            </p>

            <div className="space-y-6">
              <div>
                <label className="label">身高 (cm)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="请输入身高，如 175"
                  value={formData.height}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      height: parseInt(e.target.value) || "",
                    })
                  }
                  min="140"
                  max="210"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>140cm</span>
                  <span>210cm</span>
                </div>
              </div>

              <div>
                <label className="label">骑姿偏好</label>
                <div className="grid grid-cols-3 gap-3">
                  {ridingStyles.map((style) => (
                    <button
                      key={style.key}
                      onClick={() =>
                        setFormData({ ...formData, riding_style: style.key })
                      }
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        formData.riding_style === style.key
                          ? "border-primary bg-primary/5"
                          : "border-gray-100"
                      }`}
                    >
                      <div className="text-2xl mb-2">
                        {style.key === "upright"
                          ? "🧍"
                          : style.key === "relaxed"
                            ? "🚴"
                            : "🏃"}
                      </div>
                      <div className="font-medium text-sm">{style.label}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {style.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="text-xl font-semibold mb-2">预算范围</h3>
            <p className="text-gray-500 mb-6 text-sm">
              我们会在预算内为你搭配最优配置
            </p>

            <div className="space-y-6">
              <div>
                <label className="label">预算金额 (元)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="请输入预算金额，如 5000"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      budget: parseInt(e.target.value) || "",
                    })
                  }
                  min="1000"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[3000, 5000, 10000, 20000].map((b) => (
                  <button
                    key={b}
                    onClick={() => setFormData({ ...formData, budget: b })}
                    className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                      formData.budget === b
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    ¥{b.toLocaleString()}
                  </button>
                ))}
              </div>

              {formData.budget && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">参考配置：</span>
                    {formData.budget < 5000 && "入门级配置，满足日常通勤需求"}
                    {formData.budget >= 5000 &&
                      formData.budget < 10000 &&
                      "进阶级配置，性能与舒适兼顾"}
                    {formData.budget >= 10000 &&
                      formData.budget < 20000 &&
                      "专业级配置，高品质零部件"}
                    {formData.budget >= 20000 && "旗舰级配置，顶级材质与性能"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="text-xl font-semibold mb-2">颜色倾向</h3>
            <p className="text-gray-500 mb-6 text-sm">选择你喜欢的配色风格</p>

            <div className="flex flex-wrap gap-4">
              {colors.map((c) => (
                <button
                  key={c.key}
                  onClick={() =>
                    setFormData({ ...formData, color_preference: c.key })
                  }
                  className={`w-16 h-16 rounded-full border-4 transition-all hover:scale-110 ${
                    formData.color_preference === c.key
                      ? "border-primary shadow-lg scale-110"
                      : c.border
                        ? "border-gray-200"
                        : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.key}
                />
              ))}
            </div>

            <p className="text-center mt-4 text-gray-600 font-medium">
              已选择：{formData.color_preference || "未选择"}
            </p>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="text-xl font-semibold mb-2">联系方式</h3>
            <p className="text-gray-500 mb-6 text-sm">
              填写联系方式，完成定制需求提交
            </p>

            <div className="space-y-5">
              <div>
                <label className="label">姓名 *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="请输入您的姓名"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">手机号 *</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="请输入您的手机号"
                  value={formData.customer_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_phone: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">其他备注</label>
                <textarea
                  className="input-field h-24 resize-none"
                  placeholder="有其他特殊需求可以在这里说明..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-5 space-y-3">
                <h4 className="font-medium text-gray-700">需求汇总</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">使用场景：</div>
                  <div className="text-gray-700">
                    {useTypes.find((t) => t.key === formData.use_type)?.label}
                  </div>
                  <div className="text-gray-500">身高：</div>
                  <div className="text-gray-700">{formData.height} cm</div>
                  <div className="text-gray-500">骑姿：</div>
                  <div className="text-gray-700">
                    {
                      ridingStyles.find((s) => s.key === formData.riding_style)
                        ?.label
                    }
                  </div>
                  <div className="text-gray-500">预算：</div>
                  <div className="text-gray-700">
                    ¥{formData.budget?.toLocaleString()}
                  </div>
                  <div className="text-gray-500">颜色：</div>
                  <div className="text-gray-700">
                    {formData.color_preference}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
          <button
            className="btn-secondary"
            onClick={() => setStep(step - 1)}
            disabled={step === 1 || submitting}
          >
            上一步
          </button>

          {step < 5 ? (
            <button
              className="btn-primary"
              onClick={() => setStep(step + 1)}
              disabled={!canNext() || submitting}
            >
              下一步
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "提交中..." : "提交定制需求"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
