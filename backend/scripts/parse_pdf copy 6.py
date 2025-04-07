import fitz  # PyMuPDF
import re
import mysql.connector
import os

# --- 初始化数据库连接 ---
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="exam_system"
)
cursor = db.cursor()

import fitz  # PyMuPDF
import re

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = []

    for i, page in enumerate(doc):
        raw_text = page.get_text("text")
        
        # 🔍 DEBUG: 打印每页前500个字符，检查文本是否提取正确
        #print(f"\n📄 [DEBUG] 第 {i+1} 页原始文本（前500字符）：\n{raw_text[:500]}")

        if not raw_text.strip():
            print(f"⚠️ 第 {i+1} 页提取失败，内容为空")
            continue

        lines = raw_text.split("\n")
        filtered_lines = []
        first_line = True  # 处理页码问题

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 🛑 识别页码（单独一行）
            if first_line and re.fullmatch(r"\d{1,3}", line):
                #print(f"🔹 忽略页码: {line}")
                first_line = False
                continue

            # **✅ 自动跳过所有年份的 OCR 版权页脚**
            if re.match(r"^(Turn over|© OCR \d{4}|Copyright|BLANK PAGE|PLEASE DO NOT WRITE ON THIS PAGE)", line):
                #print(f"🔹 忽略页脚: {line}")
                continue

            # 题号识别：必须有文本，且题号后面是文字
            match = re.match(r"^(\d+)\s+(.+)", line)
            if match:
                question_number, question_text = match.groups()
                if len(question_text.split()) > 2:  # 确保不是页码，而是真题号
                    filtered_lines.append(line)
                    first_line = False  # 题目后面的文本不再是页码
                    continue

            # 保留正文
            filtered_lines.append(line)
            first_line = False  # 确保只在第一页时检查页码

        # 合并并存储
        page_text = "\n".join(filtered_lines)
        text.append(page_text)

    return "\n".join(text)


def parse_questions(text):
    lines = text.split("\n")

    questions = []
    current_question_number = None
    current_question_text = ""
    sub_questions = []
    marks = 5
    auto_question_number = 1

    for line in lines:
        raw_line = line.strip()

        # print(f"📜 解析行: {raw_line}")

        if not raw_line or re.fullmatch(r"[.\s]+", raw_line):
            continue

        if any(x in raw_line for x in ["OCR", "Turn over", "BLANK PAGE", "PLEASE DO NOT WRITE ON THIS PAGE", "Copyright"]):
            continue

        marks_match = re.search(r"\[(\d+)]$", raw_line)
        if marks_match:
            marks = int(marks_match.group(1))
            continue

        match = re.match(r"^(\d+)\s(.+)", raw_line)
        if match:
            print(f"🔹 发现主问题: {raw_line}")
            if current_question_number is not None:
                combined_text = current_question_text + "\n" + "\n".join(sub_questions)
                questions.append((current_question_number, combined_text.strip(), marks))

            current_question_number = int(match.group(1))
            current_question_text = match.group(2).strip()
            sub_questions = []
            continue

        if re.match(r"^\([a-z]\)", raw_line):
            print(f"🔸 发现子问题: {raw_line}")
            sub_questions.append(raw_line)
            continue

        if current_question_number is None:
            current_question_number = auto_question_number
            auto_question_number += 1

        if sub_questions:
            sub_questions[-1] += " " + raw_line
        else:
            current_question_text += " " + raw_line

    if current_question_number is not None:
        combined_text = current_question_text + "\n" + "\n".join(sub_questions)
        questions.append((current_question_number, combined_text.strip(), marks))

    return questions

def insert_exam(year, paper_type):
    cursor.execute("SELECT id FROM exams WHERE year=%s AND paper_type=%s", (year, paper_type))
    result = cursor.fetchone()
    if result:
        return result[0]
    cursor.execute("INSERT INTO exams (year, paper_type) VALUES (%s, %s)", (year, paper_type))
    db.commit()
    return cursor.lastrowid

def insert_questions(questions, exam_id):
    for q_number, q_text, marks in questions:
        print(f"存入数据库: 题号={q_number}, 内容={q_text[:100]}..., 分数={marks}")
        cursor.execute("""
            INSERT INTO questions (exam_id, question_number, question_text, question_type, marks)
            VALUES (%s, %s, %s, %s, %s)
        """, (exam_id, q_number, q_text, "short_answer", marks))
    db.commit()

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 4:
        print("Usage: python parse_pdf.py <pdf_path> <year> <paper_type>")
        sys.exit(1)

    pdf_path, year, paper_type = sys.argv[1], int(sys.argv[2]), sys.argv[3]

    print(f"📄 解析 PDF: {pdf_path}")
    print("✅ 文件是否存在:", os.path.exists(pdf_path))

    full_text = extract_text_from_pdf(pdf_path)
    questions = parse_questions(full_text)

    print(f"✅ 发现 {len(questions)} 道题目")

    exam_id = insert_exam(year, paper_type)
    insert_questions(questions, exam_id)

    print("🎉 所有题目已成功写入数据库！")
