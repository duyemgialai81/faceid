"""
migrate_db.py — Thêm cột img_path vào bảng persons
────────────────────────────────────────────────────
Chạy 1 lần duy nhất:
  python migrate_db.py

Cột img_url cũ (lưu Base64 LONGTEXT) → cột img_path mới (lưu đường dẫn file VARCHAR)
"""

from database.database import get_db_connection

def migrate():
    conn   = get_db_connection()
    cursor = conn.cursor()

    print("🔄 Đang kiểm tra schema...")

    # Kiểm tra cột img_path đã tồn tại chưa
    cursor.execute("""
        SELECT COUNT(*) as cnt
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'persons'
          AND COLUMN_NAME  = 'img_path'
    """)
    exists = cursor.fetchone()[0]

    if not exists:
        print(" Thêm cột img_path...")
        cursor.execute("ALTER TABLE persons ADD COLUMN img_path VARCHAR(255) DEFAULT '' AFTER img_url")
        conn.commit()
        print(" Đã thêm cột img_path")
    else:
        print(" Cột img_path đã tồn tại, bỏ qua")

    cursor.close()
    conn.close()
    print(" Migration hoàn thành!")

if __name__ == "__main__":
    migrate()