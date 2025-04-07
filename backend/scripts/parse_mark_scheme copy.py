import fitz  # PyMuPDF
import re
import sys
import mysql.connector

# --- 初始化数据库连接 ---
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",  # 修改为你的数据库密码
    database="exam_system"
)
cursor = db.cursor()


def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    return "\n".join([page.get_text("text") for page in doc])


def extract_answers(raw_text):
    """粗略地以题号开头为分隔，拆分答案"""
    blocks = re.split(r"(?=\n?\(?\d+[a-zA-Z\)]?\))", raw_text)
    answers = []
    for block in blocks:
        match = re.match(r"\(?\d+[a-zA-Z\)]?\).*", block)
        if match:
            answers.append(block.strip())
    return answers


def insert_answers(answers, year, paper_type):
    cursor.execute("SELECT id FROM exams WHERE year=%s AND paper_type=%s", (year, paper_type))
    exam = cursor.fetchone()
    if not exam:
        print("❌ 未找到对应的 exam")
        return

    exam_id = exam[0]
    
    for raw in answers:
        # 尝试匹配题号
        q_match = re.match(r"\(?([0-9]+)[a-zA-Z\)]?\).*", raw)
        if not q_match:
            continue
        q_num = q_match.group(1)

        # 查找题目 ID
        cursor.execute("SELECT id FROM questions WHERE exam_id = %s AND question_number = %s", (exam_id, q_num))
        question = cursor.fetchone()
        if not question:
            print(f"⚠️ 未找到题号 {q_num} 的问题")
            continue

        qid = question[0]
        content = raw.strip()

        cursor.execute("INSERT INTO answers (question_id, answer_text) VALUES (%s, %s)", (qid, content))
    
    db.commit()
    print("✅ 所有答案已插入数据库")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python parse_mark_scheme.py <pdf_path> <year> <paper_type>")
        sys.exit(1)

    pdf_path, year, paper_type = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    print(f"📄 正在解析答案 PDF: {pdf_path}")
    text = extract_text_from_pdf(pdf_path)
    answers = extract_answers(text)
    print(f"📌 发现 {len(answers)} 段答案")
    insert_answers(answers, year, paper_type)
