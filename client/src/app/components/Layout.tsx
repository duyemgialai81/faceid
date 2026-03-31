import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Camera,
  Users,
  Activity,
  Code2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Scan,
  Wifi,
  WifiOff,
  Bell,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/live", label: "Live Nhận Diện", icon: Camera },
  { path: "/faces", label: "Khuôn Mặt Đã Đăng Ký", icon: Users },
  { path: "/activity", label: "Nhật Ký Hoạt Động", icon: Activity },
  { path: "/settings", label: "Cài Đặt", icon: Settings },
];

// Định nghĩa kiểu dữ liệu cho thông báo
interface NotificationEvent {
  id: number;
  name: string;
  type: "success" | "unknown";
  camera: string;
  time: Date;
  read: boolean;
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [online, setOnline] = useState(true);
  const [time, setTime] = useState(new Date());
  const location = useLocation();

  // --- STATE THÔNG BÁO ---
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  
  const [notifications, setNotifications] = useState<NotificationEvent[]>([
    { id: 1, name: "Vân Anh", type: "success", camera: "Cổng chính", time: new Date(), read: false },
    { id: 2, name: "Người lạ", type: "unknown", camera: "Sảnh A", time: new Date(Date.now() - 60000), read: false },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const toggle = setInterval(() => setOnline((o) => Math.random() > 0.05 ? true : o), 5000);
    return () => clearInterval(toggle);
  }, []);

  // --- MÔ PHỎNG REAL-TIME NHẬN THÔNG BÁO TỪ CAMERA ---
  useEffect(() => {
    const mockRealtime = setInterval(() => {
      const isSuccess = Math.random() > 0.3;
      const cameras = ["Cổng chính", "Sảnh A", "Cổng phụ"];
      const randomCamera = cameras[Math.floor(Math.random() * cameras.length)];
      
      const newNotif: NotificationEvent = {
        id: Date.now(),
        name: isSuccess ? "Nhân viên FPT" : "Phát hiện người lạ",
        type: isSuccess ? "success" : "unknown",
        camera: randomCamera,
        time: new Date(),
        read: false,
      };
      
      // Thêm thông báo mới lên đầu (tối đa giữ 20 thông báo)
      setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
    }, 12000); // Mỗi 12 giây đẩy 1 thông báo mới

    return () => clearInterval(mockRealtime);
  }, []);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const formatDate = (d: Date) =>
    d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  const markAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div
      style={{
        background: "#050a0f",
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#e2e8f0",
      }}
    >
      {/* Animated background grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Glow blobs */}
      <div style={{ position: "fixed", top: "-20%", left: "-10%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-20%", right: "-10%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{
          background: "rgba(5,10,15,0.95)",
          borderRight: "1px solid rgba(0,212,255,0.12)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 10,
          flexShrink: 0,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "24px 16px", borderBottom: "1px solid rgba(0,212,255,0.08)", display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
          <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #00d4ff, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 20px rgba(0,212,255,0.4)" }}>
            <Scan size={20} color="#fff" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "14px", fontWeight: 700, color: "#00d4ff", letterSpacing: "1px", lineHeight: 1.2 }}>Vân Anh</div>
                <div style={{ fontSize: "10px", color: "#4a6fa5", letterSpacing: "2px" }}>RECOGNITION SYSTEM</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* System Status */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ margin: "12px", padding: "10px 12px", borderRadius: "10px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: "10px", color: "#4a6fa5", letterSpacing: "1px" }}>HỆ THỐNG</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: online ? "#00ff88" : "#ff2d55", boxShadow: online ? "0 0 8px #00ff88" : "0 0 8px #ff2d55", animation: "pulse 2s infinite" }} />
                  {online ? <Wifi size={10} color="#00ff88" /> : <WifiOff size={10} color="#ff2d55" />}
                </div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", color: "#00d4ff", fontWeight: 700, letterSpacing: "2px" }}>{formatTime(time)}</div>
              <div style={{ fontSize: "11px", color: "#4a6fa5", marginTop: 2 }}>{formatDate(time)}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px", overflow: "hidden" }}>
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} style={{ textDecoration: "none" }}>
              {({ isActive }) => (
                <motion.div whileHover={{ x: 2 }} style={{ display: "flex", alignItems: "center", gap: "12px", padding: collapsed ? "12px" : "10px 12px", borderRadius: "10px", marginBottom: "4px", cursor: "pointer", background: isActive ? "rgba(0,212,255,0.1)" : "transparent", border: isActive ? "1px solid rgba(0,212,255,0.25)" : "1px solid transparent", justifyContent: collapsed ? "center" : "flex-start", position: "relative", overflow: "hidden", transition: "all 0.2s" }}>
                  {isActive && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: "60%", borderRadius: "0 3px 3px 0", background: "#00d4ff", boxShadow: "0 0 10px #00d4ff" }} />}
                  <item.icon size={18} color={isActive ? "#00d4ff" : "#4a6fa5"} style={{ flexShrink: 0 }} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ fontSize: "13px", color: isActive ? "#00d4ff" : "#7a95b8", fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>{item.label}</motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: "16px", borderTop: "1px solid rgba(0,212,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #00d4ff, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>A</div>
                <div>
                  <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: 600 }}>Admin</div>
                  <div style={{ fontSize: "11px", color: "#4a6fa5" }}>Quản trị viên</div>
                </div>
                <Shield size={14} color="#00ff88" style={{ marginLeft: "auto" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse button */}
        <button onClick={() => setCollapsed(!collapsed)} style={{ position: "absolute", right: -12, top: "50%", transform: "translateY(-50%)", width: 24, height: 24, borderRadius: "50%", background: "#0d1520", border: "1px solid rgba(0,212,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 20, color: "#00d4ff" }}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>
        {/* Top bar */}
        <header
          style={{
            height: 64,
            borderBottom: "1px solid rgba(0,212,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "rgba(5,10,15,0.8)",
            backdropFilter: "blur(20px)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 8px #00ff88" }} />
            <span style={{ fontSize: "12px", color: "#4a6fa5", letterSpacing: "1px" }}>CAMERA ĐANG HOẠT ĐỘNG</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "20px",
                background: "rgba(0,255,136,0.08)",
                border: "1px solid rgba(0,255,136,0.2)",
              }}
            >
              <Zap size={12} color="#00ff88" />
              <span style={{ fontSize: "12px", color: "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}>
                GPU: 87% • RAM: 4.2GB
              </span>
            </div>
            
            {/* THÔNG BÁO QUẢ CHUÔNG CÓ MENU */}
            <div style={{ position: "relative" }} ref={notifRef}>
              <motion.div
                whileTap={{ scale: 0.9 }}
                style={{ cursor: "pointer", position: "relative" }}
                onClick={() => setShowNotifMenu(!showNotifMenu)}
              >
                <Bell size={20} color={unreadCount > 0 ? "#e2e8f0" : "#4a6fa5"} />
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#ff2d55",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      color: "#fff",
                      fontWeight: 700,
                      boxShadow: "0 0 8px rgba(255,45,85,0.5)"
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.div>
                )}
              </motion.div>

              {/* BẢNG DROPDOWN THÔNG BÁO */}
              <AnimatePresence>
                {showNotifMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: "absolute",
                      top: "40px",
                      right: 0,
                      width: "340px",
                      background: "rgba(10, 15, 25, 0.95)",
                      backdropFilter: "blur(24px)",
                      border: "1px solid rgba(0,212,255,0.2)",
                      borderRadius: "16px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                      overflow: "hidden",
                      zIndex: 100,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Header Notification */}
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(0,212,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>Thông báo mới</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          style={{ fontSize: "11px", color: "#00d4ff", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <CheckCircle2 size={12} /> Đánh dấu đã đọc
                        </button>
                      )}
                    </div>

                    {/* Danh sách List */}
                    <div style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                      {notifications.length === 0 ? (
                         <div style={{ padding: "30px", textAlign: "center", color: "#4a6fa5", fontSize: "13px" }}>
                            Không có thông báo nào.
                         </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            style={{
                              padding: "12px 16px",
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              display: "flex",
                              gap: "12px",
                              background: notif.read ? "transparent" : "rgba(0,212,255,0.05)",
                              transition: "background 0.2s"
                            }}
                          >
                            <div style={{ marginTop: "2px" }}>
                              {notif.type === "success" ? (
                                <UserCheck size={16} color="#00ff88" />
                              ) : (
                                <AlertTriangle size={16} color="#ff2d55" />
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: notif.read ? 400 : 600 }}>
                                <span style={{ color: notif.type === "success" ? "#00d4ff" : "#ff2d55" }}>
                                  {notif.name}
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: "#7a95b8", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span>{notif.camera}</span>
                                <span>•</span>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(notif.time)}</span>
                              </div>
                            </div>
                            {!notif.read && (
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4ff", alignSelf: "center", boxShadow: "0 0 8px rgba(0,212,255,0.6)" }} />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: "auto", padding: "0" }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{ height: "100%" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #050a0f; }
        ::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,212,255,0.4); }
      `}</style>
    </div>
  );
}