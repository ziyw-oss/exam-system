import openai
import mysql.connector
import json
import time
import os
from dotenv import load_dotenv
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
# ✅ 加载 .env 文件
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "exam_system"
}

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def fetch_questions_and_keypoints(exam_id):
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)

    # 正确通过 exam_questions 获取题目
    cursor.execute("""
        SELECT qb.id, qb.text
        FROM question_bank qb
        JOIN exam_questions eq ON qb.id = eq.question_bank_id
        WHERE eq.exam_id = %s
    """, (exam_id,))
    questions = cursor.fetchall()

    cursor.execute("SELECT id, name FROM keypoints")
    keypoints = cursor.fetchall()

    cursor.close()
    conn.close()

    return questions, keypoints

def build_prompt(question_text, keypoints):
    keypoint_list = [f"{{\"id\": {kp['id']}, \"name\": \"{kp['name']}\"}}" for kp in keypoints]
    prompt = f"""
你是一个教育知识点匹配系统，请从以下知识点中选择最相关的项：

题目：{question_text}

知识点列表：
[{', '.join(keypoint_list)}]

请只返回最相关的知识点 ID 数组，例如：[1, 3, 5]
"""
    return prompt

def call_openai(prompt):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )
    content = response.choices[0].message.content.strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        print("解析失败，返回内容：", content)
        return []

def save_matches(question_id, keypoint_ids):
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # 删除旧匹配（如有）
    cursor.execute("DELETE FROM question_keypoints WHERE question_id = %s", (question_id,))

    # 插入新匹配
    for kid in keypoint_ids:
        cursor.execute(
            "INSERT INTO question_keypoints (question_id, keypoint_id) VALUES (%s, %s)",
            (question_id, kid)
        )

    conn.commit()
    cursor.close()
    conn.close()

def mark_exam_matched(exam_id):
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    cursor.execute("UPDATE exams SET auto_matched = TRUE WHERE id = %s", (exam_id,))
    conn.commit()
    cursor.close()
    conn.close()

def auto_match_exam(exam_id):
    questions, keypoints = fetch_questions_and_keypoints(exam_id)
    print(f"共获取到 {len(questions)} 道题，{len(keypoints)} 个知识点")

    for q in questions:
        print(f"\n🔍 正在匹配题目 Q{q['id']}...")
        prompt = build_prompt(q['text'], keypoints)
        keypoint_ids = call_openai(prompt)
        save_matches(q['id'], keypoint_ids)
        print(f"✅ 已匹配 Q{q['id']} → {keypoint_ids}")
        time.sleep(1.2)  # 避免 API 速率限制

    mark_exam_matched(exam_id)
    print(f"\n🎉 exam_id={exam_id} 所有题目匹配完成，状态已更新为 auto_matched ✅")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("❌ 请提供 exam_id，例如：python auto_match_keypoints.py 24")
        exit(1)

    exam_id = int(sys.argv[1])
    auto_match_exam(exam_id)
