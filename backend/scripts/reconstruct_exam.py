import mysql.connector
import json
from typing import Any, Dict, List

def int_to_letter(n: int) -> str:
    return chr(ord('a') + n)

def int_to_roman(n: int) -> str:
    romans = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']
    return romans[n] if n < len(romans) else f"i{n+1}"

def auto_number_questions(data: list[dict]):
    for q in data:
        sub_counter = 0
        for sub in q.get("sub_questions", []):
            sub["letter"] = int_to_letter(sub_counter)
            sub_counter += 1

            subsub_counter = 0
            for subsub in sub.get("subsub_questions", []):
                subsub["roman"] = int_to_roman(subsub_counter)
                subsub_counter += 1

def load_exam_json_from_db(exam_id: int) -> List[Dict[str, Any]]:
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="exam_system"
    )
    cursor = db.cursor(dictionary=True)

    cursor.execute(f"""
        SELECT
            eq.sort_order,
            qb.id,
            qb.level,
            qb.parent_id,
            qb.text,
            qb.question_type,
            qb.marks,
            COALESCE(qc.code, '') AS code
        FROM exam_questions eq
        JOIN question_bank qb ON eq.question_bank_id = qb.id
        LEFT JOIN question_codeblock qc ON qb.id = qc.question_bank_id
        WHERE eq.exam_id = %s
        ORDER BY eq.sort_order
    """, (exam_id,))

    rows = cursor.fetchall()

    # Index all by ID
    qmap = {row["id"]: row for row in rows}
    for row in rows:
        row["children"] = []
        row["extensions"] = {
            "code_block": [row["code"]] if row["code"] else [],
            "table_data": {},
            "trace_steps": [],
            "diagram_ref": "",
            "options": [],
            "structure_type": ""
        }
        row["keypoints"] = []
        row["sub_questions"] = []
        row["subsub_questions"] = []

    # Build hierarchy
    for row in rows:
        if row["parent_id"]:
            parent = qmap.get(row["parent_id"])
            if parent:
                parent["children"].append(row)

    # Recursive builder
    def build_tree(q: dict, q_number: int) -> dict:
        # 主题结构
        sub_children = sorted(
            [sub for sub in q["children"] if sub["level"] == "sub_question"],
            key=lambda x: (x["sort_order"], x["id"])
        )
        q["sub_questions"] = [build_sub(sub) for sub in sub_children]
        
        return {
            "exam_id": exam_id,
            "number": q_number,
            "text": q["text"],
            "question_type": q["question_type"],
            "marks": q["marks"],
            "keypoints": [],
            "extensions": q["extensions"],
            "sub_questions": q["sub_questions"]
        }

    def build_sub(sub: dict) -> dict:
        subsub_children = sorted(
            [ss for ss in sub["children"] if ss["level"] == "subsub_question"],
            key=lambda x: (x["sort_order"], x["id"])
        )
        sub["subsub_questions"] = [build_subsub(ss) for ss in subsub_children]
        return {
            "letter": "",  # 将被 auto_number_questions() 赋值
            "text": sub["text"],
            "question_type": sub["question_type"],
            "marks": sub["marks"],
            "keypoints": [],
            "extensions": sub["extensions"],
            "subsub_questions": sub["subsub_questions"]
        }

    def build_subsub(ss: dict) -> dict:
        return {
            "roman": "",
            "text": ss["text"],
            "question_type": ss["question_type"],
            "marks": ss["marks"],
            "keypoints": [],
            "extensions": ss["extensions"]
        }

    json_data = []
    q_counter = 1

    # 先过滤主问题，并按 sort_order 排序
    questions_sorted = sorted(
        [q for q in rows if q["level"] == "question"],
        key=lambda x: (x["sort_order"], x["id"])
    )

    for q in questions_sorted:
        json_data.append(build_tree(q, q_counter))
        q_counter += 1
    cursor.close()

    db.close()
    return json_data

# 保存为 JSON 文件
def save_to_json_file(data: List[Dict[str, Any]], filename: str = "reconstructed_exam.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# 用法
if __name__ == "__main__":
    exam_id = 18
    data = load_exam_json_from_db(exam_id)
    auto_number_questions(data)
    save_to_json_file(data)
    print(f"✅ 成功导出试卷 {exam_id} 到 JSON 文件")