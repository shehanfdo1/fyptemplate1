import pymysql
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MySQL connection settings
MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
MYSQL_USER = os.getenv('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
MYSQL_DB = os.getenv('MYSQL_DB', 'phishing_db')

def init_db():
    print(f"Connecting to MySQL at {MYSQL_HOST} as {MYSQL_USER}...")
    try:
        # First connect without DB to create it if it doesn't exist
        connection = pymysql.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD
        )
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_DB};")
            print(f"✅ Database '{MYSQL_DB}' ensured.")
        connection.close()

        # Connect to the specific DB
        connection = pymysql.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DB,
            cursorclass=pymysql.cursors.DictCursor
        )

        with connection.cursor() as cursor:
            # Create Users Table
            create_users_table = """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            cursor.execute(create_users_table)
            print("✅ 'users' table ensured.")

            # Create Reports Table
            create_reports_table = """
            CREATE TABLE IF NOT EXISTS reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                platform VARCHAR(100) NOT NULL,
                content TEXT NOT NULL,
                normalized_content TEXT,
                prediction VARCHAR(100),
                confidence VARCHAR(100),
                timestamp VARCHAR(100),
                keywords TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
            cursor.execute(create_reports_table)
            print("✅ 'reports' table ensured.")

        connection.commit()
        connection.close()
        print("🎉 Database initialization completed successfully!")
    
    except pymysql.Error as e:
        print(f"❌ Error connecting to MySQL Server: {e}")
        print("Please ensure MySQL is running and the credentials are correct.")

if __name__ == "__main__":
    init_db()
