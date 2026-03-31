"""
main.py — FastAPI + InsightFace + In-Memory RAM + File Image Storage
─────────────────────────────────────────────────────────────────────
Thay đổi so với phiên bản cũ:
  • Dùng InsightFace thay face_recognition → nhanh ~15-20×
  • Ảnh lưu trên ổ đĩa (/uploads/) thay vì Base64 trong DB
  • Endpoint GET /uploads/{filename} để frontend hiển thị ảnh
  • match["distance"] là cosine distance (InsightFace), không phải Euclidean
"""

import uuid
import json
import time
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from bdconnect.database import get_db_connection
from service.face_service import face_ai_service, face_memory_store, UPLOAD_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── Startup ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[Startup] 🚀 Đang nạp embedding vào RAM...")
    _load_embeddings_to_ram()
    logger.info(f"[Startup] ✅ Sẵn sàng — {face_memory_store.count} khuôn mặt trên RAM")
    yield
    logger.info("[Shutdown] Bye!")


def _load_embeddings_to_ram() -> None:
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT e.person_id, p.name, p.role, p.img_path, e.embedding_vector
            FROM face_embeddings e
            JOIN persons p ON e.person_id = p.id
            WHERE p.status = 'active'
        """)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        parsed = []
        for row in rows:
            try:
                parsed.append({
                    "person_id":        row["person_id"],
                    "name":             row["name"],
                    "role":             row.get("role", ""),
                    "img_path":         row.get("img_path", ""),
                    "embedding_vector": json.loads(row["embedding_vector"]),
                })
            except Exception as e:
                logger.warning(f"[Startup] Bỏ qua: {e}")

        face_memory_store.load_all(parsed)
    except Exception as e:
        logger.error(f"[Startup] ❌ {e}")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve ảnh tĩnh: GET /uploads/abc.jpg
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ─── Models ───────────────────────────────────────────────────────────────────
class PersonUpdate(BaseModel):
    name: str
    role: str
    department: str


# ─── Background: lưu log ──────────────────────────────────────────────────────
def save_log_to_db(log_queries: list) -> None:
    if not log_queries:
        return
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.executemany(
            "INSERT INTO recognition_logs (id, person_id, status, confidence, camera, action) VALUES (%s,%s,%s,%s,%s,%s)",
            log_queries,
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        logger.error(f"[Log] {e}")


# ═════════════════════════════════════════════════════════════════════════════
# NHẬN DIỆN — chỉ RAM, không DB
# ═════════════════════════════════════════════════════════════════════════════
@app.post("/api/face/recognize")
async def recognize(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
):
    t0         = time.time()
    file_bytes = await image.read()

    detections = face_ai_service.extract_faces(file_bytes)
    if not detections:
        return {"success": True, "data": {"detected": False, "faces": []}}

    results    = []
    log_queries = []

    for face in detections:
        import numpy as np
        query_enc = np.array(face["descriptor"], dtype=np.float32)
        bbox      = face["box"]
        det_score = face.get("det_score", 1.0)

        # So khớp trên RAM
        match = face_memory_store.find_best_match(query_enc)

        if match:
            # Chuyển cosine distance → confidence %
            confidence = round(max(0.0, (1.0 - match["distance"]) * 100.0), 2)
            logger.info(
                f"[Recognize] ✅ {match['name']} | "
                f"dist={match['distance']:.4f} | conf={confidence:.1f}%"
            )

            # URL ảnh để frontend hiển thị
            img_url = (
                f"/uploads/{Path(match['img_path']).name}"
                if match.get("img_path") else ""
            )

            results.append({
                "id":         match["person_id"],
                "name":       match["name"],
                "role":       match["role"],
                "img":        img_url,
                "status":     "success",
                "confidence": confidence,
                "bbox":       bbox,
                "det_score":  det_score,
            })
            log_queries.append((
                str(uuid.uuid4()), match["person_id"],
                "success", confidence, "Cổng Chính", "Vào",
            ))
        else:
            results.append({
                "id":         None,
                "name":       "Người Lạ",
                "role":       "",
                "img":        "",
                "status":     "unknown",
                "confidence": 0,
                "bbox":       bbox,
            })
            log_queries.append((
                str(uuid.uuid4()), None,
                "unknown", 0, "Cổng Chính", "Từ chối",
            ))

    background_tasks.add_task(save_log_to_db, log_queries)

    return {
        "success": True,
        "data": {
            "detected":    True,
            "faces":       results,
            "processTime": int((time.time() - t0) * 1000),
            "model":       "InsightFace-buffalo_sc-RAM",
            "ramCount":    face_memory_store.count,
        },
    }


# ═════════════════════════════════════════════════════════════════════════════
# ĐĂNG KÝ — lưu ảnh file + ghi DB + cập nhật RAM
# ═════════════════════════════════════════════════════════════════════════════
@app.post("/api/face/register")
async def register(
    name:       str = Form(...),
    role:       str = Form(""),
    department: str = Form(""),
    images: list[UploadFile] = File(...),
):
    conn   = get_db_connection()
    cursor = conn.cursor()

    person_id = str(uuid.uuid4())
    new_encodings: list[tuple] = []
    avatar_path = ""

    try:
        for i, img_file in enumerate(images):
            img_bytes = await img_file.read()

            # Lưu ảnh lên disk
            saved_path = face_ai_service.save_image(img_bytes, person_id, index=i)
            if i == 0:
                avatar_path = saved_path   # ảnh đầu làm avatar

            # Trích xuất embedding
            detections = face_ai_service.extract_faces(img_bytes)

            if len(detections) == 0:
                raise Exception(f"Không tìm thấy khuôn mặt trong ảnh thứ {i + 1}.")
            if len(detections) > 1:
                raise Exception(f"Ảnh thứ {i + 1} có nhiều hơn 1 khuôn mặt.")

            descriptor     = detections[0]["descriptor"]
            embedding_json = json.dumps(descriptor)
            embedding_id   = str(uuid.uuid4())

            if i == 0:
                # Insert person record (dùng img_path thay vì Base64)
                cursor.execute(
                    """INSERT INTO persons (id, name, role, department, status, img_path)
                       VALUES (%s, %s, %s, %s, 'active', %s)""",
                    (person_id, name, role, department, avatar_path),
                )

            cursor.execute(
                "INSERT INTO face_embeddings (id, person_id, embedding_vector) VALUES (%s, %s, %s)",
                (embedding_id, person_id, embedding_json),
            )
            new_encodings.append((person_id, name, role, avatar_path, descriptor))

        conn.commit()

        # ✅ Cập nhật RAM ngay — nhận diện có hiệu lực lập tức
        for pid, pname, prole, pimg, enc in new_encodings:
            face_memory_store.add(pid, pname, prole, pimg, enc)

        logger.info(f"[Register] ✅ {name} | {len(new_encodings)} mẫu | RAM: {face_memory_store.count}")

        return {
            "success":  True,
            "message":  f"Đã đăng ký {name} với {len(new_encodings)} mẫu.",
            "img_url":  f"/uploads/{Path(avatar_path).name}",
            "ramCount": face_memory_store.count,
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"[Register] ❌ {e}")
        # Xóa ảnh đã lưu nếu lỗi
        for i in range(len(images)):
            p = Path(UPLOAD_DIR) / f"{person_id}_{i}.jpg"
            if p.exists():
                p.unlink()
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})
    finally:
        cursor.close()
        conn.close()


# ═════════════════════════════════════════════════════════════════════════════
# DANH SÁCH NGƯỜI DÙNG
# ═════════════════════════════════════════════════════════════════════════════
@app.get("/api/face/persons")
async def get_persons():
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT p.id, p.name, p.role, p.department, p.status,
                   p.img_path, p.registered_at AS registered,
                   (SELECT COUNT(*) FROM face_embeddings e WHERE e.person_id = p.id) AS embeddings,
                   (SELECT COUNT(*) FROM recognition_logs l WHERE l.person_id = p.id AND l.status='success') AS recognitions
            FROM persons p ORDER BY p.registered_at DESC
        """)
        rows = cursor.fetchall()

        # Chuyển img_path → img_url
        for row in rows:
            raw = row.get("img_path") or ""
            row["img"] = f"/uploads/{Path(raw).name}" if raw else ""

        return {"success": True, "data": rows, "total": len(rows), "ramCount": face_memory_store.count}
    finally:
        cursor.close()
        conn.close()


# ═════════════════════════════════════════════════════════════════════════════
# CẬP NHẬT
# ═════════════════════════════════════════════════════════════════════════════
@app.put("/api/face/persons/{id}")
async def update_person(id: str, person_data: PersonUpdate):
    conn   = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE persons SET name=%s, role=%s, department=%s WHERE id=%s",
            (person_data.name, person_data.role, person_data.department, id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return JSONResponse(status_code=404, content={"success": False, "error": "Không tìm thấy"})

        face_memory_store.update_info(id, person_data.name, person_data.role)
        return {"success": True, "message": "Cập nhật thành công"}
    finally:
        cursor.close()
        conn.close()


# ═════════════════════════════════════════════════════════════════════════════
# XÓA
# ═════════════════════════════════════════════════════════════════════════════
@app.delete("/api/face/persons/{id}")
async def delete_person(id: str):
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Lấy img_path để xóa file
        cursor.execute("SELECT img_path FROM persons WHERE id=%s", (id,))
        row = cursor.fetchone()

        cursor2 = conn.cursor()
        cursor2.execute("DELETE FROM persons WHERE id=%s", (id,))
        conn.commit()

        if cursor2.rowcount == 0:
            return JSONResponse(status_code=404, content={"success": False, "error": "Không tìm thấy"})

        # Xóa file ảnh trên disk
        if row and row.get("img_path"):
            p = Path(row["img_path"])
            if p.exists():
                p.unlink()

        removed = face_memory_store.remove_by_person(id)
        return {"success": True, "message": "Đã xóa", "removedFromRam": removed}
    finally:
        cursor.close()
        conn.close()


# ═════════════════════════════════════════════════════════════════════════════
# LỊCH SỬ
# ═════════════════════════════════════════════════════════════════════════════
@app.get("/api/face/logs")
async def get_logs():
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT l.id, COALESCE(p.name,'Người lạ') AS name,
                   DATE_FORMAT(l.created_at,'%H:%i:%s') AS time,
                   DATE_FORMAT(l.created_at,'%d/%m/%Y') AS date,
                   l.status, l.confidence, l.camera, l.action,
                   p.img_path AS img_raw
            FROM recognition_logs l
            LEFT JOIN persons p ON l.person_id = p.id
            ORDER BY l.created_at DESC LIMIT 100
        """)
        rows = cursor.fetchall()
        for row in rows:
            raw = row.pop("img_raw", "") or ""
            row["img"] = f"/uploads/{Path(raw).name}" if raw else ""
        return {"success": True, "data": rows, "total": len(rows)}
    finally:
        cursor.close()
        conn.close()


# ═════════════════════════════════════════════════════════════════════════════
# THỐNG KÊ
# ═════════════════════════════════════════════════════════════════════════════
@app.get("/api/face/statistics")
async def get_statistics():
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT status, created_at FROM recognition_logs ORDER BY created_at DESC LIMIT 1000")
        all_logs = cursor.fetchall()

        hourly = {f"{i:02d}:00": {"nhận_diện": 0, "từ_chối": 0, "lạ": 0} for i in range(24)}
        days   = ["T2","T3","T4","T5","T6","T7","CN"]
        weekly = {d: 0 for d in days}

        for log in all_logs:
            h = f"{log['created_at'].hour:02d}:00"
            d = days[log["created_at"].weekday()]
            if log["status"] == "success":
                hourly[h]["nhận_diện"] += 1
                weekly[d] += 1
            elif log["status"] == "unknown":
                hourly[h]["lạ"] += 1

        return {
            "success": True,
            "data": {
                "hourlyData": [{"time": t, **v} for t, v in hourly.items()],
                "weeklyData": [{"day": d, "value": v} for d, v in weekly.items()],
            },
        }
    finally:
        cursor.close()
        conn.close()


# ═════════════════════════════════════════════════════════════════════════════
# DEBUG
# ═════════════════════════════════════════════════════════════════════════════
@app.get("/api/face/memory-status")
async def memory_status():
    return {
        "success":  True,
        "loaded":   face_memory_store.is_loaded,
        "ramCount": face_memory_store.count,
    }

@app.post("/api/face/reload-memory")
async def reload_memory():
    _load_embeddings_to_ram()
    return {"success": True, "ramCount": face_memory_store.count}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)