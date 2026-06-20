import { Routes, Route, Link, useLocation } from "react-router-dom";
import CustomerOrderPage from "./pages/CustomerOrderPage.jsx";
import ConsultantPage from "./pages/ConsultantPage.jsx";
import AssemblyBoardPage from "./pages/AssemblyBoardPage.jsx";
import OrderDetailPage from "./pages/OrderDetailPage.jsx";

function App() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "顾客定制", icon: "🚲" },
    { path: "/consultant", label: "顾问配置", icon: "🛠️" },
    { path: "/assembly", label: "装配看板", icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white text-xl">
              🚲
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark">定制自行车</h1>
              <p className="text-xs text-gray-400">专属你的骑行体验</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive
                      ? "bg-white text-primary shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">门店顾问</p>
              <p className="text-xs text-gray-400">小王</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-medium">
              王
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<CustomerOrderPage />} />
          <Route path="/consultant" element={<ConsultantPage />} />
          <Route path="/consultant/:orderId" element={<ConsultantPage />} />
          <Route path="/assembly" element={<AssemblyBoardPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
