import os
import sys
import json
import pdfplumber
import mysql.connector
import re


#静默 pdfminer 日志
import logging
logging.getLogger("pdfminer").setLevel(logging.ERROR)

import re

FOOTER_KEYWORDS = [
    "Turn over",
    "© OCR",
    "Copyright",
    "BLANK PAGE",
    "PLEASE DO NOT WRITE ON THIS PAGE",
    "cambridge",
    "acknowledgements",
    "triangle building",
    "university of cambridge",
    "ocr is committed",
    "AS Level Computer Science - H046/02 - Summer 2023",
    "Examiners’ report",
    "© OCR 2023"
]

APPENDIX_KEYWORDS = [
    "access to scripts",
    "exambuilder",
    "professional development",
    "support@ocr.org.uk",
    "ocr is an exempt charity",
    "stay connected",
    "online support",
    "ocr provides high-quality support",
    "interchange",
    "resources to support delivery",
    "ocr is part of cambridge university press",
    "registered in england",
    "registered office the triangle building",
    "ocr provides resources to help you deliver",
    "ocr acknowledges the use of the following content",
    "you always use information in the latest specification",
    "you can request more information"
]

def clean_lines(lines):
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if re.fullmatch(r"\d{1,3}", stripped):
            continue
        if re.fullmatch(r"[-_=~•·.]{4,}", stripped.replace(" ", "")):
            continue
        lowered = stripped.lower()
        if any(keyword.lower() in lowered for keyword in FOOTER_KEYWORDS):
            continue
        cleaned.append(stripped)
    return cleaned

def extract_examiner_report(pdf_path: str) -> dict:
    output = {}
    question_pattern = re.compile(r"^Question\s+(\d+(?:\s*\([a-zA-Zivxlcdm]+\))*)", re.IGNORECASE)
    current_key = None
    buffer = []
    in_exemplar = False
    exemplar_buffer = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            lines = page.extract_text().split("\n") if page.extract_text() else []
            lines = clean_lines(lines)

            has_question = any(question_pattern.match(line) for line in lines)
            has_appendix = any(any(kw in line.lower() for kw in APPENDIX_KEYWORDS) for line in lines)
            if not has_question and has_appendix:
                print(f"⛔️ 第 {page_num+1} 页疑似附录内容，终止收集")
                break

            for line in lines:
                if line.lower().startswith("exemplar"):
                    in_exemplar = True
                    continue

                if in_exemplar and current_key:
                    if question_pattern.match(line):
                        # stop exemplar block
                        if buffer:
                            entry = output.setdefault(current_key, {})
                            entry["text"] = " ".join(buffer).strip()
                        if exemplar_buffer:
                            output[current_key]["exemplar"] = " ".join(exemplar_buffer).strip()
                        exemplar_buffer = []
                        buffer = []
                        in_exemplar = False

                    else:
                        exemplar_buffer.append(line)
                        continue

                match = question_pattern.match(line)
                if match:
                    if current_key:
                        if buffer:
                            entry = output.setdefault(current_key, {})
                            entry["text"] = " ".join(buffer).strip()
                        if exemplar_buffer:
                            output[current_key]["exemplar"] = " ".join(exemplar_buffer).strip()
                        buffer = []
                        exemplar_buffer = []
                    raw_key = match.group(1)
                    normalized = re.sub(r"\s+", "", raw_key)
                    normalized = normalized.replace(")(", ") (")
                    current_key = normalized
                    in_exemplar = False
                elif current_key:
                    buffer.append(line)

        if current_key:
            if buffer:
                output.setdefault(current_key, {})["text"] = " ".join(buffer).strip()
            if exemplar_buffer:
                output[current_key]["exemplar"] = " ".join(exemplar_buffer).strip()

    return output

def save_json(data: dict, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)



def save_examiner_report_to_db(report_data: dict, exam_id: int):
    import mysql.connector
    from parse_markscheme import build_question_id_map_by_structure, standardize_question_id

    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="exam_system"
    )
    
    cursor = db.cursor(dictionary=True)

    # ✅ 检查 exam_id 是否存在于 exam_questions
    cursor.execute("SELECT COUNT(*) FROM exam_questions WHERE exam_id = %s", (exam_id,))
    count_result = cursor.fetchone()  # tuple: (37,)
    count_value = count_result["COUNT(*)"] if count_result else 0

    print(f"🧪 查询结果 exam_id={exam_id} count={count_value}")

    if count_value == 0:
        print(f"❌ 无法插入：exam_id={exam_id} 不存在于 exam_questions 中")
        db.close()
        return

    def insert_report(qid, comment, exemplar):
        print(f"📥 插入: qid={qid}, comment长度={len(comment)} exemplar={bool(exemplar)}")
        cursor.execute("""
            INSERT INTO question_report (question_bank_id, exam_id, report_text, exemplar_text)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            report_text = VALUES(report_text),
            exemplar_text = VALUES(exemplar_text)
        """, (qid, exam_id, comment, exemplar))

    print("🧭 正在构建题号映射...")
    question_map = build_question_id_map_by_structure(exam_id, cursor)
    print("🧭 当前卷题号映射 keys:", list(question_map.keys()))

    for raw_key, entry in report_data.items():
        raw_key_cleaned = raw_key.strip().replace("\u200b", "")
        print("🔍 正在尝试匹配:", repr(raw_key_cleaned))

        normalized_key = standardize_question_id(raw_key_cleaned)
        if not normalized_key:
            print(f"⚠️ 输入非法题号: {raw_key_cleaned!r}")
            continue

        print(f"🧪 标准化结果: {normalized_key!r}")
        qid = question_map.get(normalized_key)

        if qid:
            print(f"✅ 匹配成功: {normalized_key} → qid={qid}")
            insert_report(qid, entry.get("text", ""), entry.get("exemplar", ""))
        else:
            print(f"⚠️ 无法匹配题号: {raw_key_cleaned}（标准化: {normalized_key}）")

    db.commit()
    cursor.close()
    db.close()
    print(f"✅ Examiner report 插入完成 for exam_id={exam_id}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python parse_report.py <pdf_path> <output_dir> <exam_id>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    output_path = os.path.join(output_dir, "report.json")
    exam_id = int(sys.argv[3]) 
    

    if not os.path.exists(pdf_path):
        print(f"❌ 文件不存在: {pdf_path}")
        sys.exit(1)

    print("📄 正在提取 Examiner Report:", pdf_path)
    report_data = extract_examiner_report(pdf_path)
    save_json(report_data, output_path)
    print("✅ Examiner report 结构化已保存:", output_path)
    save_examiner_report_to_db(report_data, exam_id)
