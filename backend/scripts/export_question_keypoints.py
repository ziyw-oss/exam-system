import mysql.connector
import csv

# ✅ 数据库配置
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "exam_system"
}

# ✅ 导出函数
def export_question_keypoints(filename="question_keypoints.csv"):
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
          qb.id AS question_id,
          qb.text AS question_text,
          kp.id AS keypoint_id,
          kp.name AS keypoint_name
        FROM 
          question_keypoints qk
        JOIN 
          question_bank qb ON qb.id = qk.question_id
        JOIN 
          keypoints kp ON kp.id = qk.keypoint_id
        ORDER BY 
          qb.id;
    """)

    rows = cursor.fetchall()
    headers = [i[0] for i in cursor.description]

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    cursor.close()
    conn.close()
    print(f"✅ 匹配结果已导出到 {filename}")

# ✅ 执行
if __name__ == "__main__":
    export_question_keypoints()
