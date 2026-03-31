import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Shield,
  Camera,
  Cpu,
  Bell,
  Database, // Removed if unused, but kept for your future use
  Save,
  RotateCcw,
  ChevronRight,
  Eye,      // Removed if unused
  Sliders,  // Removed if unused
  Zap,
  Lock,     // Removed if unused
} from "lucide-react";

// --- CÁC COMPONENT DÙNG CHUNG ---

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: "12px",
        background: value ? "#00d4ff" : "rgba(255,255,255,0.08)",
        border: `1px solid ${value ? "#00d4ff" : "rgba(255,255,255,0.1)"}`,
        cursor: "pointer",
        position: "relative",
        transition: "all 0.3s",
        flexShrink: 0,
        boxShadow: value ? "0 0 12px rgba(0,212,255,0.4)" : "none",
      }}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "absolute",
          top: 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
        }}
      />
    </div>
  );
}

function Slider({ value, onChange, min = 0, max = 100, label, unit = "%" }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: "13px", color: "#7a95b8" }}>{label}</span>
        <span style={{ fontSize: "13px", color: "#00d4ff", fontFamily: "'JetBrains Mono', monospace" }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: "3px", background: "rgba(255,255,255,0.05)" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${((value - min) / (max - min)) * 100}%`,
            borderRadius: "3px",
            background: "linear-gradient(90deg, #00d4ff, #8b5cf6)",
            boxShadow: "0 0 8px rgba(0,212,255,0.4)",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            opacity: 0,
            cursor: "pointer",
            height: "100%",
          }}
        />
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, color = "#00d4ff" }: {
  title: string;
  icon: any;
  children: React.ReactNode;
  color?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        borderRadius: "16px",
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${color}15`,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: `${color}06`,
          border: "none",
          cursor: "pointer",
          borderBottom: open ? `1px solid ${color}10` : "none",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "10px",
            background: `${color}12`,
            border: `1px solid ${color}25`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600, flex: 1, textAlign: "left" }}>
          {title}
        </span>
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={16} color="#4a6fa5" />
        </motion.div>
      </button>
      {open && (
        <div style={{ padding: "20px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function SettingRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
      }}
    >
      <div>
        <div style={{ fontSize: "13px", color: "#e2e8f0" }}>{label}</div>
        {sub && <div style={{ fontSize: "11px", color: "#4a6fa5", marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// --- MAIN COMPONENT ---

const DEFAULT_SETTINGS = {
  confidence: 70,
  similarity: 60,
  maxFaces: 10,
  activeModel: "SSD MobileNet v1",
  resolution: "720p",
  fps: 30,
  mirror: true,
  autoBrightness: true,
  notifyUnknown: true,
  notifyLowConf: true,
  notifyOffline: true,
  soundAlert: false,
  twoFactor: false,
  logRetention: 30,
  encryption: true,
  useGpu: true,
  batchSize: 8,
  quantization: false,
};

export function Settings() {
  // Model settings
  const [confidence, setConfidence] = useState(DEFAULT_SETTINGS.confidence);
  const [similarity, setSimilarity] = useState(DEFAULT_SETTINGS.similarity);
  const [maxFaces, setMaxFaces] = useState(DEFAULT_SETTINGS.maxFaces);
  const [activeModel, setActiveModel] = useState(DEFAULT_SETTINGS.activeModel);

  // Camera
  const [resolution, setResolution] = useState(DEFAULT_SETTINGS.resolution);
  const [fps, setFps] = useState(DEFAULT_SETTINGS.fps);
  const [mirror, setMirror] = useState(DEFAULT_SETTINGS.mirror);
  const [autoBrightness, setAutoBrightness] = useState(DEFAULT_SETTINGS.autoBrightness);

  // Notifications
  const [notifyUnknown, setNotifyUnknown] = useState(DEFAULT_SETTINGS.notifyUnknown);
  const [notifyLowConf, setNotifyLowConf] = useState(DEFAULT_SETTINGS.notifyLowConf);
  const [notifyOffline, setNotifyOffline] = useState(DEFAULT_SETTINGS.notifyOffline);
  const [soundAlert, setSoundAlert] = useState(DEFAULT_SETTINGS.soundAlert);

  // Security
  const [twoFactor, setTwoFactor] = useState(DEFAULT_SETTINGS.twoFactor);
  const [logRetention, setLogRetention] = useState(DEFAULT_SETTINGS.logRetention);
  const [encryption, setEncryption] = useState(DEFAULT_SETTINGS.encryption);

  // Performance
  const [useGpu, setUseGpu] = useState(DEFAULT_SETTINGS.useGpu);
  const [batchSize, setBatchSize] = useState(DEFAULT_SETTINGS.batchSize);
  const [quantization, setQuantization] = useState(DEFAULT_SETTINGS.quantization);

  const [saved, setSaved] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // Tránh lỗi hydration nếu dùng SSR

  const models = ["SSD MobileNet v1", "YuNet (OpenCV)", "RetinaFace"];

  // Load cài đặt từ localStorage khi component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("app_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setConfidence(parsed.confidence ?? DEFAULT_SETTINGS.confidence);
        setSimilarity(parsed.similarity ?? DEFAULT_SETTINGS.similarity);
        setMaxFaces(parsed.maxFaces ?? DEFAULT_SETTINGS.maxFaces);
        setActiveModel(parsed.activeModel ?? DEFAULT_SETTINGS.activeModel);
        setResolution(parsed.resolution ?? DEFAULT_SETTINGS.resolution);
        setFps(parsed.fps ?? DEFAULT_SETTINGS.fps);
        setMirror(parsed.mirror ?? DEFAULT_SETTINGS.mirror);
        setAutoBrightness(parsed.autoBrightness ?? DEFAULT_SETTINGS.autoBrightness);
        setNotifyUnknown(parsed.notifyUnknown ?? DEFAULT_SETTINGS.notifyUnknown);
        setNotifyLowConf(parsed.notifyLowConf ?? DEFAULT_SETTINGS.notifyLowConf);
        setNotifyOffline(parsed.notifyOffline ?? DEFAULT_SETTINGS.notifyOffline);
        setSoundAlert(parsed.soundAlert ?? DEFAULT_SETTINGS.soundAlert);
        setTwoFactor(parsed.twoFactor ?? DEFAULT_SETTINGS.twoFactor);
        setLogRetention(parsed.logRetention ?? DEFAULT_SETTINGS.logRetention);
        setEncryption(parsed.encryption ?? DEFAULT_SETTINGS.encryption);
        setUseGpu(parsed.useGpu ?? DEFAULT_SETTINGS.useGpu);
        setBatchSize(parsed.batchSize ?? DEFAULT_SETTINGS.batchSize);
        setQuantization(parsed.quantization ?? DEFAULT_SETTINGS.quantization);
      } catch (e) {
        console.error("Lỗi parse cấu hình", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const handleSave = () => {
    const currentSettings = {
      confidence, similarity, maxFaces, activeModel,
      resolution, fps, mirror, autoBrightness,
      notifyUnknown, notifyLowConf, notifyOffline, soundAlert,
      twoFactor, logRetention, encryption,
      useGpu, batchSize, quantization
    };
    
    // Lưu vào localStorage
    localStorage.setItem("app_settings", JSON.stringify(currentSettings));
    
    // Giao diện
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    
    // TODO: Bắn API update cài đặt lên backend tại đây nếu cần
  };

  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt về mặc định?")) {
      setConfidence(DEFAULT_SETTINGS.confidence);
      setSimilarity(DEFAULT_SETTINGS.similarity);
      setMaxFaces(DEFAULT_SETTINGS.maxFaces);
      setActiveModel(DEFAULT_SETTINGS.activeModel);
      setResolution(DEFAULT_SETTINGS.resolution);
      setFps(DEFAULT_SETTINGS.fps);
      setMirror(DEFAULT_SETTINGS.mirror);
      setAutoBrightness(DEFAULT_SETTINGS.autoBrightness);
      setNotifyUnknown(DEFAULT_SETTINGS.notifyUnknown);
      setNotifyLowConf(DEFAULT_SETTINGS.notifyLowConf);
      setNotifyOffline(DEFAULT_SETTINGS.notifyOffline);
      setSoundAlert(DEFAULT_SETTINGS.soundAlert);
      setTwoFactor(DEFAULT_SETTINGS.twoFactor);
      setLogRetention(DEFAULT_SETTINGS.logRetention);
      setEncryption(DEFAULT_SETTINGS.encryption);
      setUseGpu(DEFAULT_SETTINGS.useGpu);
      setBatchSize(DEFAULT_SETTINGS.batchSize);
      setQuantization(DEFAULT_SETTINGS.quantization);
      
      localStorage.removeItem("app_settings");
    }
  };

  if (!isLoaded) return null; // Render mượt mà hơn

  return (
    <div style={{ padding: "24px", height: "100%", overflowY: "auto", fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#e2e8f0", fontFamily: "'Orbitron', monospace", letterSpacing: "1px" }}>
            CÀI ĐẶT HỆ THỐNG
          </h1>
          <p style={{ fontSize: "13px", color: "#4a6fa5", marginTop: 4 }}>
            Cấu hình model, camera, bảo mật và hiệu suất
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleReset}
            style={{
              padding: "10px 16px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#4a6fa5",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "13px",
              fontFamily: "'Space Grotesk', sans-serif",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
          >
            <RotateCcw size={14} />
            Đặt lại
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            style={{
              padding: "10px 20px",
              borderRadius: "12px",
              background: saved ? "rgba(0,255,136,0.15)" : "linear-gradient(135deg, #00d4ff, #8b5cf6)",
              border: saved ? "1px solid rgba(0,255,136,0.4)" : "none",
              color: saved ? "#00ff88" : "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif",
              transition: "all 0.3s",
            }}
          >
            <Save size={14} />
            {saved ? "Đã lưu!" : "Lưu cài đặt"}
          </motion.button>
        </div>
      </div>

      {/* Thay vì fix cứng 1fr 1fr dễ lỗi trên màn hình nhỏ, mình dùng grid với auto-fit cho responsive */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        
        {/* Cột 1 */}
        <div>
          {/* Model settings */}
          <Section title="Cài đặt Model AI" icon={Cpu} color="#00d4ff">
            <div style={{ marginBottom: 16 }}>
              <Slider value={confidence} onChange={setConfidence} label="Ngưỡng độ tin cậy tối thiểu" min={50} max={99} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Slider value={similarity} onChange={setSimilarity} label="Ngưỡng tương đồng (FaceMatcher)" min={40} max={90} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <Slider value={maxFaces} onChange={setMaxFaces} label="Số khuôn mặt tối đa mỗi frame" min={1} max={20} unit="" />
            </div>

            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: "10px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)" }}>
              <div style={{ fontSize: "11px", color: "#4a6fa5", marginBottom: 6 }}>MODEL HIỆN TẠI</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {models.map((model) => {
                  const isActive = activeModel === model;
                  return (
                    <div
                      key={model}
                      onClick={() => setActiveModel(model)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        background: isActive ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isActive ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                        fontSize: "11px",
                        color: isActive ? "#00d4ff" : "#4a6fa5",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {model}
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* Camera */}
          <Section title="Cài đặt Camera" icon={Camera} color="#8b5cf6">
            <SettingRow label="Độ phân giải" sub="Cao hơn = chính xác hơn nhưng nặng hơn">
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#e2e8f0",
                  fontSize: "13px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="4K">4K</option>
              </select>
            </SettingRow>
            <SettingRow label="Frame rate (FPS)" sub={`Hiện tại: ${fps} FPS`}>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#e2e8f0",
                  fontSize: "13px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {[15, 24, 30, 60].map((f) => (
                  <option key={f} value={f}>{f} FPS</option>
                ))}
              </select>
            </SettingRow>
            <SettingRow label="Phản chiếu video (Mirror)" sub="Lật ngang hình ảnh webcam">
              <Toggle value={mirror} onChange={setMirror} />
            </SettingRow>
            <SettingRow label="Tự chỉnh sáng" sub="Điều chỉnh độ sáng tự động">
              <Toggle value={autoBrightness} onChange={setAutoBrightness} />
            </SettingRow>
          </Section>
        </div>

        {/* Cột 2 */}
        <div>
          {/* Notifications */}
          <Section title="Thông báo" icon={Bell} color="#fbbf24">
            <SettingRow label="Cảnh báo người lạ" sub="Thông báo khi phát hiện người chưa đăng ký">
              <Toggle value={notifyUnknown} onChange={setNotifyUnknown} />
            </SettingRow>
            <SettingRow label="Cảnh báo độ tin cậy thấp" sub="Thông báo khi độ tin cậy < 70%">
              <Toggle value={notifyLowConf} onChange={setNotifyLowConf} />
            </SettingRow>
            <SettingRow label="Camera offline" sub="Thông báo khi camera mất kết nối">
              <Toggle value={notifyOffline} onChange={setNotifyOffline} />
            </SettingRow>
            <SettingRow label="Âm thanh cảnh báo" sub="Phát âm thanh khi có sự kiện">
              <Toggle value={soundAlert} onChange={setSoundAlert} />
            </SettingRow>
          </Section>

          {/* Security */}
          <Section title="Bảo mật" icon={Shield} color="#00ff88">
            <SettingRow label="Xác thực 2 yếu tố" sub="Bảo vệ tài khoản admin">
              <Toggle value={twoFactor} onChange={setTwoFactor} />
            </SettingRow>
            <SettingRow label="Mã hóa embeddings" sub="AES-256 cho dữ liệu khuôn mặt">
              <Toggle value={encryption} onChange={setEncryption} />
            </SettingRow>
            <div style={{ padding: "12px 0" }}>
              <Slider
                value={logRetention}
                onChange={setLogRetention}
                label="Lưu nhật ký (ngày)"
                min={7}
                max={365}
                unit=" ngày"
              />
            </div>
          </Section>

          {/* Performance */}
          <Section title="Hiệu suất" icon={Zap} color="#f97316">
            <SettingRow label="Sử dụng GPU" sub="CUDA acceleration cho inference">
              <Toggle value={useGpu} onChange={setUseGpu} />
            </SettingRow>
            <SettingRow label="Model quantization" sub="Giảm kích thước model (int8)">
              <Toggle value={quantization} onChange={setQuantization} />
            </SettingRow>
            <div style={{ padding: "12px 0" }}>
              <Slider value={batchSize} onChange={setBatchSize} label="Batch size (frame/lần)" min={1} max={32} unit="" />
            </div>

            <div style={{ marginTop: 8, padding: "12px", borderRadius: "10px", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
              <div style={{ fontSize: "11px", color: "#4a6fa5", marginBottom: 8 }}>TÀI NGUYÊN HIỆN TẠI</div>
              {[
                { label: "GPU", value: "NVIDIA RTX 4060", detail: "87% | 8GB VRAM" },
                { label: "CPU", value: "Intel i7-13700K", detail: "42% | 16 cores" },
                { label: "RAM", value: "32GB DDR5", detail: "65% (20.8GB)" },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: "11px", color: "#4a6fa5" }}>{r.label}: <span style={{ color: "#e2e8f0" }}>{r.value}</span></span>
                  <span style={{ fontSize: "11px", color: "#f97316", fontFamily: "'JetBrains Mono', monospace" }}>{r.detail}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}