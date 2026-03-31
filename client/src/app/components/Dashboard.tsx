import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Users,
  Camera,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Eye,
  Clock,
  Cpu,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { apiClient } from "../services/api";

interface RecognitionEntry {
  time: string;
  nhận_diện: number;
  từ_chối: number;
  lạ: number;
}

interface WeeklyEntry {
  day: string;
  value: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  color,
  delay = 0,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  trend: number;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${color}22`,
        borderRadius: "16px",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 120,
          height: 120,
          background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
          transform: "translate(30%, -30%)",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            background: `${color}15`,
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={20} color={color} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 8px",
            borderRadius: "20px",
            background: trend >= 0 ? "rgba(0,255,136,0.1)" : "rgba(255,45,85,0.1)",
            border: `1px solid ${trend >= 0 ? "rgba(0,255,136,0.3)" : "rgba(255,45,85,0.3)"}`,
          }}
        >
          {trend >= 0 ? (
            <ArrowUpRight size={12} color="#00ff88" />
          ) : (
            <ArrowDownRight size={12} color="#ff2d55" />
          )}
          <span
            style={{
              fontSize: "11px",
              color: trend >= 0 ? "#00ff88" : "#ff2d55",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {Math.abs(trend)}%
          </span>
        </div>
      </div>
      <div style={{ marginTop: "16px" }}>
        <div
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color,
            fontFamily: "'Orbitron', monospace",
            letterSpacing: "1px",
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: "13px", color: "#7a95b8", marginTop: 4 }}>{label}</div>
        <div style={{ fontSize: "11px", color: "#4a6fa5", marginTop: 2 }}>{sub}</div>
      </div>
    </motion.div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const [liveCount, setLiveCount] = useState(0);
  const [recognitionData, setRecognitionData] = useState<RecognitionEntry[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyEntry[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [registeredFacesCount, setRegisteredFacesCount] = useState(0);
  const [todayRecognitions, setTodayRecognitions] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);

  const cameras = [
    { id: 1, name: "Cổng chính", status: "online", fps: 30, detections: 245, resolution: "1080p" },
    { id: 2, name: "Sảnh A", status: "online", fps: 25, detections: 189, resolution: "720p" },
    { id: 3, name: "Cổng phụ", status: "online", fps: 30, detections: 98, resolution: "1080p" },
    { id: 4, name: "Phòng lab", status: "offline", fps: 0, detections: 0, resolution: "4K" },
  ];

  // Load real data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch activity logs
        const logs = await apiClient.getActivityLog();
        
        // Set recent events (last 5)
        const recentLogsFormatted = logs.slice(0, 5).map((log, idx) => ({
          id: idx + 1,
          name: log.name,
          time: log.time,
          status: log.status,
          confidence: log.confidence,
          camera: log.camera,
          avatar: log.img,
        }));
        setRecentEvents(recentLogsFormatted);

        // Calculate today's statistics
        const todayLogs = logs.filter((log) =>
          log.date === new Date().toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        );
        
        const successToday = todayLogs.filter((l) => l.status === "success").length;
        const unknownToday = todayLogs.filter((l) => l.status === "unknown").length;
        
        setTodayRecognitions(successToday);
        setUnknownCount(unknownToday);

        // Fetch statistics
        const stats = await apiClient.getStatistics();
        setRecognitionData(stats.hourlyData);
        setWeeklyData(stats.weeklyData);

        // Fetch registered faces
        const persons = await apiClient.getPersons();
        setRegisteredFacesCount(persons.length);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        // If API fails, use empty/default data
        setRecognitionData([]);
        setWeeklyData([]);
        setRecentEvents([]);
      }
    };

    loadData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "#0d1520",
            border: "1px solid rgba(0,212,255,0.2)",
            borderRadius: "10px",
            padding: "10px 14px",
          }}
        >
          <div style={{ fontSize: "11px", color: "#4a6fa5", marginBottom: 6 }}>{label}</div>
          {payload.map((p: any) => (
            <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
              <span style={{ fontSize: "12px", color: "#e2e8f0" }}>{p.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: "24px", height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#e2e8f0",
            fontFamily: "'Orbitron', monospace",
            letterSpacing: "1px",
          }}
        >
          TỔNG QUAN HỆ THỐNG
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ fontSize: "13px", color: "#4a6fa5", marginTop: 4 }}
        >
          Giám sát real-time · Cập nhật lần cuối: vừa xong
        </motion.p>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <StatCard
          icon={Users}
          label="Khuôn Mặt Đã Đăng Ký"
          value={String(registeredFacesCount)}
          sub={`+${Math.max(0, registeredFacesCount - Math.floor(registeredFacesCount * 0.95))} trong tuần này`}
          trend={4.7}
          color="#00d4ff"
          delay={0.1}
        />
        <StatCard
          icon={Eye}
          label="Nhận Diện Hôm Nay"
          value={String(todayRecognitions)}
          sub="Cập nhật liên tục"
          trend={12.3}
          color="#00ff88"
          delay={0.15}
        />
        <StatCard
          icon={CheckCircle}
          label="Độ Chính Xác"
          value="97.4%"
          sub="Model FaceNet v2.0"
          trend={1.2}
          color="#8b5cf6"
          delay={0.2}
        />
        <StatCard
          icon={AlertTriangle}
          label="Phát Hiện Lạ"
          value={String(unknownCount)}
          sub="Hôm nay · Cần xem xét"
          trend={-8.5}
          color="#fbbf24"
          delay={0.25}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "24px" }}>
        {/* Area chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(0,212,255,0.1)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>
                Hoạt Động Nhận Diện 24h
              </div>
              <div style={{ fontSize: "11px", color: "#4a6fa5", marginTop: 2 }}>Theo thời gian thực</div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { label: "Nhận diện", color: "#00d4ff" },
                { label: "Từ chối", color: "#ff2d55" },
                { label: "Người lạ", color: "#fbbf24" },
              ].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                  <span style={{ fontSize: "10px", color: "#4a6fa5" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={recognitionData}>
              <defs>
                <linearGradient id="cyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="red" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff2d55" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ff2d55" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="yellow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fill: "#4a6fa5", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a6fa5", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="nhận_diện" stroke="#00d4ff" strokeWidth={2} fill="url(#cyan)" />
              <Area type="monotone" dataKey="từ_chối" stroke="#ff2d55" strokeWidth={2} fill="url(#red)" />
              <Area type="monotone" dataKey="lạ" stroke="#fbbf24" strokeWidth={2} fill="url(#yellow)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Weekly bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(139,92,246,0.1)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>Tuần Này</div>
            <div style={{ fontSize: "11px", color: "#4a6fa5", marginTop: 2 }}>
              Tổng: 3,343 lượt
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#4a6fa5", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a6fa5", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Recent events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(0,212,255,0.1)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>Sự Kiện Gần Đây</div>
            <button
              onClick={() => navigate("/activity")}
              style={{
                fontSize: "11px",
                color: "#00d4ff",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Xem tất cả <TrendingUp size={10} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${event.status === "unknown" ? "rgba(255,187,36,0.15)" : "rgba(0,212,255,0.06)"}`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    overflow: "hidden",
                    flexShrink: 0,
                    border: `2px solid ${event.status === "success" ? "#00ff88" : "#fbbf24"}`,
                  }}
                >
                  {event.avatar ? (
                    <ImageWithFallback
                      src={event.avatar}
                      alt={event.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "rgba(255,187,36,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                      }}
                    >
                      ?
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: 500 }}>{event.name}</div>
                  <div style={{ fontSize: "11px", color: "#4a6fa5" }}>{event.camera}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {event.status === "success" && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#00ff88",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                      }}
                    >
                      {event.confidence}%
                    </div>
                  )}
                  <div style={{ fontSize: "10px", color: "#4a6fa5", fontFamily: "'JetBrains Mono', monospace" }}>
                    {event.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Camera status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(139,92,246,0.1)",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>Trạng Thái Camera</div>
            <button
              onClick={() => navigate("/live")}
              style={{
                fontSize: "11px",
                color: "#8b5cf6",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Live feed <Camera size={10} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cameras.map((cam) => (
              <div
                key={cam.id}
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${cam.status === "online" ? "rgba(0,255,136,0.12)" : "rgba(255,45,85,0.12)"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ position: "relative" }}>
                      <Camera size={18} color={cam.status === "online" ? "#00d4ff" : "#4a6fa5"} />
                      <div
                        style={{
                          position: "absolute",
                          bottom: -1,
                          right: -1,
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: cam.status === "online" ? "#00ff88" : "#ff2d55",
                          boxShadow: cam.status === "online" ? "0 0 6px #00ff88" : "none",
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: 500 }}>{cam.name}</div>
                      <div style={{ fontSize: "10px", color: "#4a6fa5" }}>{cam.resolution}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        color: cam.status === "online" ? "#00ff88" : "#ff2d55",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {cam.status === "online" ? `${cam.fps} FPS` : "OFFLINE"}
                    </div>
                    <div style={{ fontSize: "10px", color: "#4a6fa5" }}>
                      {cam.detections > 0 ? `${cam.detections} lượt` : "—"}
                    </div>
                  </div>
                </div>
                {cam.status === "online" && (
                  <div style={{ marginTop: 10 }}>
                    <div
                      style={{
                        height: 3,
                        borderRadius: "2px",
                        background: "rgba(255,255,255,0.05)",
                        overflow: "hidden",
                      }}
                    >
                      <motion.div
                        animate={{ width: ["0%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        style={{
                          height: "100%",
                          background: "linear-gradient(90deg, transparent, #00d4ff, transparent)",
                          width: "30%",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* System resources */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: "16px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(0,212,255,0.1)",
          borderRadius: "16px",
          padding: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>Tài Nguyên Hệ Thống</div>
          <Cpu size={14} color="#4a6fa5" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {[
            { label: "CPU", value: 42, color: "#00d4ff", unit: "%" },
            { label: "GPU", value: 87, color: "#8b5cf6", unit: "%" },
            { label: "RAM", value: 65, color: "#00ff88", unit: "%" },
            { label: "Disk I/O", value: 28, color: "#fbbf24", unit: "%" },
          ].map((item) => (
            <div key={item.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: "12px", color: "#7a95b8" }}>{item.label}</span>
                <span
                  style={{
                    fontSize: "12px",
                    color: item.color,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {item.value}{item.unit}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: "3px", background: "rgba(255,255,255,0.05)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    borderRadius: "3px",
                    background: item.color,
                    boxShadow: `0 0 8px ${item.color}60`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
