import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)), # Thêm port cho đồng bộ với file .env
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "duyem123"), 
    "database": os.getenv("DB_NAME", "face_recognition"),
    "pool_name": "mypool",
    "pool_size": 5,
}

# Tạo pool kết nối
connection_pool = mysql.connector.pooling.MySQLConnectionPool(**db_config)

def get_db_connection():
    return connection_pool.get_connection()