import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CameraOff,
  Play,
  Square,
  RefreshCw,
  Sun,
  Moon,
} from "lucide-react";
import { apiClient } from "../services/api";

type DetectionResult = {
  status: "success" | "unknown";
  person?: { name: string; role: string };
  confidence?: number;
  box?: { x: number; y: number; w: number; h: number };
};

// ─── Scan Line Animation ───────────────────────────────────────────────────
function ScanLine() {
  return (
    <motion.div
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        height: "2px",
        background: "linear-gradient(90deg, transparent, #00d4ff, transparent)",
        boxShadow: "0 0 20px #00d4ff",
        zIndex: 10,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Face Bounding Box ─────────────────────────────────────────────────────
function FaceBox({
  box,
  status,
  name,
  confidence,
}: {
  box: { x: number; y: number; w: number; h: number };
  status: string;
  name?: string;
  confidence?: number;
}) {
  const color = status === "success" ? "#00ff88" : "#ff2d55";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.w}%`,
        height: `${box.h}%`,
        border: `2px solid ${color}`,
        boxShadow: `0 0 20px ${color}40, inset 0 0 20px ${color}10`,
        borderRadius: "4px",
        pointerEvents: "none",
      }}
    >
      {/* Corner accents */}
      {[
        { top: -2, left: -2, borderTop: `3px solid ${color}`, borderLeft: `3px solid ${color}` },
        { top: -2, right: -2, borderTop: `3px solid ${color}`, borderRight: `3px solid ${color}` },
        { bottom: -2, left: -2, borderBottom: `3px solid ${color}`, borderLeft: `3px solid ${color}` },
        { bottom: -2, right: -2, borderBottom: `3px solid ${color}`, borderRight: `3px solid ${color}` },
      ].map((c, i) => (
        <div key={i} style={{ position: "absolute", width: 12, height: 12, ...c }} />
      ))}

      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#0d1520ee",
          border: `1px solid ${color}50`,
          borderRadius: "6px",
          padding: "4px 10px",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "11px", color, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
          {name || "NGƯỜI LẠ"}
        </div>
        {confidence !== undefined && (
          <div style={{ fontSize: "10px", color: "#4a6fa5" }}>{confidence.toFixed(1)}%</div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export function LiveRecognition() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [history, setHistory] = useState<Array<{ time: string; result: DetectionResult }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Trạng thái ánh sáng để hiển thị icon cảnh báo
  const [lightLevel, setLightLevel] = useState<"ok" | "dim" | "dark">("ok");

  // ─── Capture + Enhance + Recognize ──────────────────────────────────────
  const captureAndRecognize = async (): Promise<void> => {
    if (!isStreaming || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // ✅ Tăng độ phân giải: 640×480 → 1280×720
    const captureWidth = 1280;
    const captureHeight = 720;
    canvas.width = captureWidth;
    canvas.height = captureHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Vẽ frame gốc
    ctx.drawImage(video, 0, 0, captureWidth, captureHeight);

    // ✅ Phân tích độ sáng trung bình vùng giữa frame (tránh viền nhiễu)
    const sampleX = Math.floor(captureWidth / 4);
    const sampleY = Math.floor(captureHeight / 4);
    const sampleW = Math.floor(captureWidth / 2);
    const sampleH = Math.floor(captureHeight / 2);
    const sample = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);

    let totalBrightness = 0;
    for (let i = 0; i < sample.data.length; i += 4) {
      // Trọng số màu thị giác (luma BT.601)
      totalBrightness +=
        sample.data[i] * 0.299 +
        sample.data[i + 1] * 0.587 +
        sample.data[i + 2] * 0.114;
    }
    const avgBrightness = totalBrightness / (sample.data.length / 4);

    // Cập nhật UI cảnh báo ánh sáng
    if (avgBrightness < 40) setLightLevel("dark");
    else if (avgBrightness < 100) setLightLevel("dim");
    else setLightLevel("ok");

    // ✅ Tăng sáng + tương phản tự động khi thiếu sáng
    if (avgBrightness < 100) {
      // Tăng sáng tối đa 60%, tỷ lệ theo độ thiếu sáng
      const brightnessBoost = Math.round(Math.min(60, (100 - avgBrightness) * 0.6));
      // Tương phản mạnh hơn khi rất tối
      const contrastFactor = avgBrightness < 40 ? 1.5 : avgBrightness < 70 ? 1.35 : 1.2;

      ctx.filter = `brightness(${100 + brightnessBoost}%) contrast(${contrastFactor * 100}%)`;
      ctx.drawImage(video, 0, 0, captureWidth, captureHeight);
      ctx.filter = "none";
    }

    // ✅ Gửi ảnh JPEG chất lượng cao hơn (0.90 thay vì 0.85)
    return new Promise((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) { resolve(); return; }
          try {
            setScanning(true);
            const res = await apiClient.recognize(blob);

            if (res.success && res.data.faces && res.data.faces.length > 0) {
              const face = res.data.faces[0];
              const rawBox = face.bbox;

              const boxWidthPercent  = (rawBox.width  / captureWidth)  * 100;
              const boxHeightPercent = (rawBox.height / captureHeight) * 100;
              const xPercent         = (rawBox.x      / captureWidth)  * 100;
              const yPercent         = (rawBox.y      / captureHeight) * 100;
              const mirroredX        = 100 - (xPercent + boxWidthPercent);

              const newResult: DetectionResult = {
                status: face.status,
                person: face.status === "success"
                  ? { name: face.name, role: "Nhân Sự" }
                  : undefined,
                confidence: face.confidence,
                box: {
                  x: mirroredX,
                  y: yPercent,
                  w: boxWidthPercent,
                  h: boxHeightPercent,
                },
              };

              setDetection(newResult);
              setHistory((prev) =>
                [{ time: new Date().toLocaleTimeString("vi-VN", { hour12: false }), result: newResult }, ...prev].slice(0, 10)
              );
            } else {
              setDetection(null);
            }
          } catch (err) {
            console.error("Lỗi gửi ảnh lên Backend:", err);
          } finally {
            setScanning(false);
            resolve();
          }
        },
        "image/jpeg",
        0.90 // ✅ Tăng chất lượng nén
      );
    });
  };

  // ─── Recognition Loop (sequential, không overlap request) ────────────────
  useEffect(() => {
    let isRunning = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const loop = async () => {
      if (!isRunning || !isStreaming) return;
      await captureAndRecognize();
      if (isRunning) {
        timeoutId = setTimeout(loop, 300);
      }
    };

    if (isStreaming) loop();

    return () => {
      isRunning = false;
      clearTimeout(timeoutId);
    };
  }, [isStreaming]);

  // ─── Start Camera ─────────────────────────────────────────────────────────
  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          // ✅ Yêu cầu độ phân giải cao nhất có thể
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user",
          frameRate: { ideal: 30 },
          // ✅ Yêu cầu thiết bị tự điều chỉnh phơi sáng & cân bằng trắng
          // (chỉ có tác dụng nếu driver/trình duyệt hỗ trợ)
          advanced: [
            { exposureMode: "continuous" } as any,
            { whiteBalanceMode: "continuous" } as any,
          ],
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStreaming(true);
    } catch {
      setError("Không thể mở Camera. Kiểm tra quyền truy cập trình duyệt.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Stop Camera ──────────────────────────────────────────────────────────
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
    setDetection(null);
    setScanning(false);
    setLightLevel("ok");
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px", height: "100%", overflowY: "auto", fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#e2e8f0", fontFamily: "'Orbitron', monospace", letterSpacing: "1px" }}>
          NHẬN DIỆN TRỰC TIẾP
        </h1>
        <p style={{ fontSize: "13px", color: "#4a6fa5", marginTop: 4 }}>
          Mô hình: face_recognition · Chế độ: HOG + ResNet Real-time · Độ phân giải: 1280×720
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px" }}>

        {/* ═══ CAMERA BLOCK ═══════════════════════════════════════════════ */}
        <div>
          <div style={{
            position: "relative",
            borderRadius: "16px",
            overflow: "hidden",
            background: "#080d14",
            border: `1px solid ${isStreaming ? "#00d4ff50" : "#ffffff10"}`,
            aspectRatio: "16/9",
          }}>
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: isStreaming ? "block" : "none",
                transform: "scaleX(-1)",
              }}
            />

            {/* Camera off placeholder */}
            {!isStreaming && (
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}>
                <CameraOff size={48} color="#4a6fa5" />
                <div style={{ textAlign: "center", color: "#4a6fa5" }}>Camera đang tắt</div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                position: "absolute",
                bottom: 12,
                left: 12,
                right: 12,
                background: "rgba(255,45,85,0.15)",
                border: "1px solid rgba(255,45,85,0.3)",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                color: "#ff2d55",
                textAlign: "center",
              }}>
                {error}
              </div>
            )}

            {/* ✅ Cảnh báo ánh sáng yếu */}
            <AnimatePresence>
              {isStreaming && lightLevel !== "ok" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{
                    position: "absolute",
                    top: 12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(255, 200, 0, 0.15)",
                    border: "1px solid rgba(255, 200, 0, 0.4)",
                    borderRadius: "20px",
                    padding: "4px 14px",
                    fontSize: "11px",
                    color: "#ffc800",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    zIndex: 20,
                  }}
                >
                  {lightLevel === "dark" ? <Moon size={12} /> : <Sun size={12} />}
                  {lightLevel === "dark"
                    ? "Rất tối — đã tăng sáng tối đa, độ chính xác có thể giảm"
                    : "Ánh sáng yếu — đang tự động cải thiện ảnh"}
                </motion.div>
              )}
            </AnimatePresence>

            {isStreaming && <ScanLine />}

            {/* Face box overlay */}
            <AnimatePresence>
              {isStreaming && detection?.box && (
                <FaceBox
                  box={detection.box}
                  status={detection.status}
                  name={detection.person?.name}
                  confidence={detection.confidence}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Camera controls */}
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            {!isStreaming ? (
              <button
                onClick={startCamera}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  background: "#00d4ff20",
                  border: "1px solid #00d4ff50",
                  color: "#00d4ff",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: isLoading ? 0.7 : 1,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "14px",
                }}
              >
                <Play size={18} />
                {isLoading ? "Đang khởi động..." : "Bật Camera"}
              </button>
            ) : (
              <button
                onClick={stopCamera}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  background: "#ff2d5520",
                  border: "1px solid #ff2d5550",
                  color: "#ff2d55",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "14px",
                }}
              >
                <Square size={18} /> Dừng Camera
              </button>
            )}
          </div>
        </div>

        {/* ═══ PANEL KẾT QUẢ ══════════════════════════════════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Trạng thái AI */}
          <div style={{
            background: "#ffffff05",
            border: "1px solid #ffffff10",
            borderRadius: "16px",
            padding: "20px",
          }}>
            <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 16 }}>TRẠNG THÁI AI</div>

            {scanning ? (
              <div style={{ textAlign: "center", color: "#00d4ff" }}>
                <RefreshCw
                  size={24}
                  style={{ margin: "0 auto 8px", display: "block", animation: "spin 1s linear infinite" }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Đang xử lý khuôn mặt...
              </div>
            ) : detection ? (
              <div style={{ textAlign: "center" }}>
                <div style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  borderRadius: "20px",
                  fontSize: "10px",
                  fontWeight: 700,
                  marginBottom: 8,
                  background: detection.status === "success"
                    ? "rgba(0,255,136,0.1)"
                    : "rgba(255,45,85,0.1)",
                  color: detection.status === "success" ? "#00ff88" : "#ff2d55",
                  border: `1px solid ${detection.status === "success" ? "rgba(0,255,136,0.3)" : "rgba(255,45,85,0.3)"}`,
                }}>
                  {detection.status === "success" ? "✓ NHẬN DIỆN THÀNH CÔNG" : "✗ KHÔNG XÁC ĐỊNH"}
                </div>

                <div style={{
                  fontSize: "18px",
                  color: detection.status === "success" ? "#00ff88" : "#ff2d55",
                  fontWeight: 700,
                  marginBottom: 4,
                }}>
                  {detection.person?.name || "NGƯỜI LẠ"}
                </div>

                {detection.confidence !== undefined && (
                  <>
                    <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 8 }}>
                      Độ chính xác: {detection.confidence.toFixed(1)}%
                    </div>
                    <div style={{
                      height: 4,
                      borderRadius: "2px",
                      background: "rgba(255,255,255,0.05)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${detection.confidence}%`,
                        background: detection.status === "success"
                          ? "linear-gradient(90deg, #00ff88, #00d4ff)"
                          : "linear-gradient(90deg, #ff2d55, #ff6b6b)",
                        borderRadius: "2px",
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#2d3f55" }}>
                {isStreaming ? "Đang chờ phát hiện khuôn mặt..." : "Bật camera để bắt đầu"}
              </div>
            )}
          </div>

          {/* Lịch sử nhận diện */}
          <div style={{
            flex: 1,
            background: "#ffffff05",
            border: "1px solid #ffffff10",
            borderRadius: "16px",
            padding: "16px",
            overflowY: "auto",
            maxHeight: "320px",
          }}>
            <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 12 }}>LỊCH SỬ NHẬN DIỆN</div>

            {history.length === 0 ? (
              <div style={{ textAlign: "center", color: "#2d3f55", fontSize: "12px", paddingTop: 20 }}>
                Chưa có lịch sử
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      background: "#ffffff05",
                      borderRadius: "8px",
                      fontSize: "12px",
                      borderLeft: `2px solid ${h.result.status === "success" ? "#00ff88" : "#ff2d55"}`,
                    }}
                  >
                    <span style={{ color: h.result.status === "success" ? "#00ff88" : "#ff2d55" }}>
                      {h.result.person?.name || "Người lạ"}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                      <span style={{ color: "#4a6fa5" }}>{h.time}</span>
                      {h.result.confidence !== undefined && (
                        <span style={{ color: "#2d3f55", fontSize: "10px" }}>
                          {h.result.confidence.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}