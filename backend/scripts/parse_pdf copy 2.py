import fitz  # PyMuPDF
import re
from typing import List
import mysql.connector
import os

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
    "ocr is committed"
]

# --- 初始化数据库连接 ---
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="exam_system"
)
cursor = db.cursor()

# 模块：清理页面噪声信息（页脚、装饰线、版权声明等）
def filter_page_noise(lines: List[str], debug: bool = False, is_last_page: bool = False) -> List[str]:

    if is_last_page:
        lowered_lines = "\n".join(lines).lower()
        footer_signatures = [
            "ocr is committed",
            "acknowledgements booklet",
            "triangle building",
            "university of cambridge",
            "ocr will be happy to correct its mistake"
        ]
        footer_hits = sum(1 for s in footer_signatures if s in lowered_lines)
        if footer_hits >= 2:
            if debug:
                print("⛔️ 跳过最后一页（OCR 版权声明页识别命中）")
            return []

    cleaned = []
    first_line = True
    
    for line in lines:
        
        # 跳过空行
        stripped = line.strip()
        if not stripped:
            continue

        # 跳过装饰线
        if re.fullmatch(r"[-_=~•·.]{4,}", stripped.replace(" ", "")):
            continue

        # 跳过页脚固定语句
        lowered = stripped.lower()
        if any(keyword.lower() in lowered for keyword in FOOTER_KEYWORDS):
            continue
        cleaned.append(stripped)

        first_line = False
    return cleaned

# 模块：合并题号（如 '1'）与其后的题干（如 'Describe...') 成一行
def merge_question_number_and_text(lines: List[str], debug: bool = True) -> List[str]:
    """
    合并题号行与其后的题干行（主问题结构分行），例如：
        '1' + 'Describe two factors...' => '1 Describe two factors...'
        '3' + '(a) Describe...' => '3 (a) Describe...'
        '5' + '(a)(i)' => '5 (a)(i)'
        '6' + '(a)(i) Describe...' => '6 (a)(i) Describe...'

    合并条件：
    - 当前行为题号（1~99 的整数）
    - 下一行存在，且：
        - 开头是大写字母，或
        - 子题格式 (a)，或
        - 子子题格式 (i)，或
        - 混合结构 (a)(i) + 题干
    """
    
    merged_lines = []
    idx = 0
    while idx < len(lines):
        current = lines[idx].strip()

        if (
            re.fullmatch(r"\d{1,2}", current) and
            idx + 1 < len(lines)
        ):
            next_line = lines[idx + 1].strip()

            # 🚫 排除伪代码行合并：下一行以关键字开头（常见关键字）
            if re.match(r"^(procedure|for|if|while|repeat|end|print|input|flag|total|smallest|largest)\\b", next_line, re.IGNORECASE):
                if debug:
                    print(f"⛔️ 跳过伪代码行合并: '{current}' + '{next_line}'")
                merged_lines.append(current)
                idx += 1
                continue

            # ✅ 匹配大写开头，或子题/子子题结构，如 (a)、(i)、(a)(i)
            if re.match(r"^(\([a-z]\)(\([ivxlcdm]+\))?|[A-Z])", next_line, re.IGNORECASE):
                merged = f"{current} {next_line}"
                if debug:
                    print(f"✅ 合并题号行: '{current}' + '{next_line}' -> '{merged}'")
                merged_lines.append(merged)
                idx += 2
                continue

        # 默认情况：不合并
        merged_lines.append(current)
        idx += 1

    return merged_lines

def parse_line_structure(line: str) -> dict:
    line = line.strip()
    result = {
        "type": None,         # 类型标记：main, sub, subsub, combo 等
        "main": None,         # 主问题编号
        "sub": None,          # 子题编号
        "subsub": None,       # 子子题编号
        "text": None          # 题干内容
    }

    # ✅ 匹配主 + 子 + 子子题结构，例如：3 (a)(i) Describe...
    combo = re.match(r"^(\d+)\s+\(([a-z])\)\(?([ivxlcdm]+)?\)?\s*(.+)?", line, re.IGNORECASE)
    if combo:
        result["type"] = "combo"
        result["main"] = combo.group(1)
        result["sub"] = combo.group(2)
        result["subsub"] = combo.group(3)
        result["text"] = combo.group(4) or ""
        return result

    # ✅ 匹配子题 + 子子题结构，无主编号，例如：(a) (i) Describe...
    match_combo = re.match(r"^\(([a-z])\)\s+\(([ivxlcdm]+)\)\s+(.+)", line, re.IGNORECASE)
    if match_combo:
        result["type"] = "combo_sub_only"
        result["sub"] = match_combo.group(1)
        result["subsub"] = match_combo.group(2)
        result["text"] = match_combo.group(3)
        return result

    # ✅ 匹配主问题，如 "1 Describe..."
    if re.match(r"^\d+\s+[^.]+", line):
        result["type"] = "main"
        result["main"] = line.split()[0]
        result["text"] = line[len(result["main"]):].strip()
        return result

    # ✅ 匹配子题结构，例如："(a) Describe..."
    match_sub = re.match(r"^\(([a-z])\)\s*(.+)?", line, re.IGNORECASE)
    if match_sub:
        result["type"] = "sub"
        result["sub"] = match_sub.group(1)
        result["text"] = match_sub.group(2) or ""
        return result

    # ✅ 匹配子子题结构，例如："(ii) Describe..."
    match_subsub = re.match(r"^\(([ivxlcdm]+)\)\s*(.+)?", line, re.IGNORECASE)
    if match_subsub:
        result["type"] = "subsub"
        result["subsub"] = match_subsub.group(1)
        result["text"] = match_subsub.group(2) or ""
        return result

    # ✅ 匹配纯分数行，例如：[3]
    score = re.search(r"\[(\d+)\]", line)
    if score and not line.strip().startswith("("):
        result["type"] = "score"
        result["text"] = line
        return result

    # ✅ 默认归类为普通文本行（追加内容）
    result["type"] = "text"
    result["text"] = line
    return result


# ✅ 模块：提取 PDF 文件中的试题文本内容（支持题号识别与结构分割）
def extract_text_from_pdf(pdf_path: str) -> str:
    import fitz  # PyMuPDF
    doc = fitz.open(pdf_path)
    questions = []
    current_question = []
    in_question = False

    for i, page in enumerate(doc):
        print(f"\n📄 开始处理第 {i+1} 页")

        found_new_question = False
        found_score_only = False
        raw_text = page.get_text("text")
        if not raw_text.strip():
            print(f"⚠️ 第 {i+1} 页提取失败，内容为空")
            continue

        original_lines = raw_text.split("\n")
        seen_score = False

        for idx, line in enumerate(original_lines):
            stripped = line.strip()
            if stripped:
                if re.fullmatch(r"\d{1,3}", stripped):
                    print(f"🧾 移除疑似页码行: '{stripped}'")
                    original_lines.pop(idx)
                break

        cleaned_lines = filter_page_noise(original_lines, debug=True, is_last_page=(i == len(doc) - 1))
        print(f"📄 清洗后行数: {len(cleaned_lines)}")
        if not cleaned_lines:
            continue

        merged_lines = merge_question_number_and_text(cleaned_lines, debug=True)
        print(f"📄 合并后行数: {len(merged_lines)}")

        def start_new_question(line):
            nonlocal found_new_question, current_question, questions, seen_score
            if re.fullmatch(r"\[\d+\]", line.strip()):
                print(f"⚠️ 跳过孤立分数行: {line}")
                return
            if current_question and seen_score:
                end_current_question()
            elif current_question and not seen_score:
                print(f"🔄 当前题未结束，继续追加行: {line}")
                current_question.append(line)
                return
            current_question = [line]
            seen_score = False
            found_new_question = True
            print(f"🆕 开始新题块: {line}")

        def end_current_question():
            nonlocal current_question, questions, seen_score
            if not seen_score:
                print(f"⚠️ 当前题未出现分数标识，不结束: {' | '.join(current_question)}")
                return
            if len(current_question) == 1 and re.fullmatch(r"[-_=~•·.\\s\\[\\]0-9]+", current_question[0]):
                print("⚠️ 跳过伪题目：仅包含装饰线 + 分数")
                current_question = []
                return
            marks_match = re.search(r"\[(\d+)\]", " ".join(current_question))
            marks_text = f" [分数: {marks_match.group(1)}]" if marks_match else ""
            print(f"🏁 题目结束: {' | '.join(current_question)}{marks_text}")
            questions.append(" ".join(current_question))
            current_question = []
            seen_score = False

        for line in merged_lines:
            line = line.strip()
            if re.search(r"\[\d+\]", line):
                seen_score = True

            structure = parse_line_structure(line)
            print(f"🔍 检测结构类型: {structure['type']} 内容: {line}")
            print(f"🔍 分析结构: {structure}")

            if structure["type"] == "combo":
                if current_question:
                    print(f"⚠️ combo 遇到主+子组合题，强制结束上一题（即使没有分数）")
                    seen_score = True
                    end_current_question()

                # 主问题
                start_new_question(structure["main"])
                # 👉 主题号后立即结束，防止下一句被追加进去
                seen_score = True
                end_current_question()
                
                # 子题+题干
                start_new_question(f"({structure['sub']}) {structure['text']}")
                
                in_question = True
                seen_score = False  # 等待后续出现分数标识
                            
                
            elif structure["type"] == "combo_sub_only":
                if current_question:
                    print(f"⚠️ combo_sub_only 遇到子题组合，强制结束上一题（即使没有分数）")
                    seen_score = True
                    end_current_question()

                start_new_question(f"({structure['sub']})")
                seen_score = True
                end_current_question()
                start_new_question(f"({structure['subsub']}) {structure['text']}")
                in_question = True

            elif structure["type"] == "main":
                start_new_question(f"{structure['main']} {structure['text']}")
                in_question = True

            elif structure["type"] == "sub":
               # ✅ 如果当前题目未结束，但遇到新子题，应该结束上一个
                if current_question:
                    print(f"⚠️ 遇到子题 ({structure['sub']})，强制结束上一题（即使没有分数）")
                    seen_score = True
                    end_current_question()

                start_new_question(f"({structure['sub']}) {structure['text']}")
                in_question = True

            elif structure["type"] == "subsub":
                seen_score = True
                end_current_question()
                start_new_question(f"({structure['subsub']}) {structure['text']}")
                in_question = True

            elif structure["type"] == "score":
                found_score_only = True
                if in_question:
                    current_question.append(line)
                else:
                    print(f"⚠️ 忽略未挂载的分数行: {line}")

            else:
                if in_question:
                    print(f"➕ 追加内容: {line}")
                    current_question.append(line)

        if current_question and seen_score:
            end_current_question()
        elif current_question and not seen_score:
            print("⚠️ 未结束的题目，但未发现分数标识")

    print("\n🧪 [DEBUG] extract_text_from_pdf() 最终返回内容如下：")
    for idx, q in enumerate(questions, 1):
        print(f"{idx:02d}: {q}")

    return "\n".join(questions)


def parse_questions(text):
    lines = text.split("\n")
    questions = []
    current_q = None
    current_sub = None
    current_subsub = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # 情况 0: 主问题 + 子问题在一行，如 "3 (a) Describe..."
        match_main_combo = re.match(r"^(\d+)\s+\(([a-hj-z])\)\s+(.*)", line)
        if match_main_combo:
            if current_q:
                questions.append(current_q)
            current_q = {
                "number": int(match_main_combo.group(1)),
                "text": "",  # 主问题无独立题干
                "sub_questions": []
            }
            print(f"🔹 主问题: {match_main_combo.group(1)}")

            current_sub = {
                "letter": match_main_combo.group(2),
                "text": match_main_combo.group(3).strip(),
                "sub_parts": []
            }
            current_q["sub_questions"].append(current_sub)
            print(f"  🔸 子问题: ({match_main_combo.group(2)}) {current_sub['text']}")
            current_subsub = None
            continue

        # 主问题：以数字开头，后面必须有正文（排除分数线）
        if re.match(r"^\d+\s+[^.]+", line):
            if current_q:
                questions.append(current_q)
            current_q = {"number": int(line.split()[0]), "text": line, "sub_questions": []}
            print(f"🔹 主问题: {line}")
            current_sub = None
            current_subsub = None
            continue

       # 情况 1: 同行出现子问题 + 子子问题，如 "(a) (i) Tick one box..."
        match_combo = re.match(r"^(\([a-hj-z]\))\s+(\([ivxlcdm]+\))\s+(.*)", line, re.IGNORECASE)
        if match_combo:
            if current_q is None:
                print(f"⚠️ 跳过子问题（未发现主问题）: {line}")
                continue

            current_sub = {
                "letter": match_combo.group(1)[1],  # 去掉括号
                "text": "",  # 子问题本身无题干
                "sub_parts": []
            }
            current_q["sub_questions"].append(current_sub)
            print(f"  🔸 子问题: {match_combo.group(1)}")

            # ✅ 子子问题 text 包含编号，避免后续编号丢失
            current_subsub = {
                "roman": match_combo.group(2)[1:-1],  # 提取去括号的罗马数字
                "text": f"{match_combo.group(2)} {match_combo.group(3).strip()}"
            }
            current_sub["sub_parts"].append(current_subsub)
            print(f"    🔹 子子问题: {current_subsub['text']}")
            continue

        # 情况 2: 仅子问题 (a)~(z)，排除 (i)
        if re.match(r"^\([a-hj-z]\)", line):
            if current_q is None:
                print(f"⚠️ 跳过子问题（未发现主问题）: {line}")
                continue
            current_sub = {
                "letter": re.findall(r"\(([a-z])\)", line)[0],
                "text": line,
                "sub_parts": []
            }
            current_q["sub_questions"].append(current_sub)
            print(f"  🔸 子问题: {line}")
            current_subsub = None
            continue

     
        # 情况 3: 子子问题 (i)、(ii)、...（必须在子问题下）
        if re.match(r"^\([ivxlcdm]+\)", line, re.IGNORECASE):
            if current_sub is None:
                print(f"⚠️ 跳过子子问题（未发现子问题）: {line}")
                continue
            current_subsub = {
                "roman": re.findall(r"\(([ivxlcdm]+)\)", line, re.IGNORECASE)[0],
                "text": line
            }
            current_sub["sub_parts"].append(current_subsub)
            print(f"    🔹 子子问题: {line}")
            continue

     
        # 补充内容
        if current_subsub:
            current_subsub["text"] += " " + line
        elif current_sub:
            current_sub["text"] += " " + line
        elif current_q:
            current_q["text"] += " " + line

    if current_q:
        questions.append(current_q)

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
        #print(f"存入数据库: 题号={q_number}, 内容={q_text[:100]}..., 分数={marks}")
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
    print("\n🧪 [DEBUG] extract_text_from_pdf() 最终返回的文本：\n")
    print(full_text)

    # ✅ 保存为 output.txt
    with open("output.txt", "w", encoding="utf-8") as f:
        f.write(full_text)
    print("📄 已保存到 output.txt")
    #questions = parse_questions(full_text, debug=False)
    
    #print(f"✅ 发现 {len(questions)} 道题目")

    #exam_id = insert_exam(year, paper_type)
    #insert_questions(questions, exam_id)

    #print("🎉 所有题目已成功写入数据库！")
