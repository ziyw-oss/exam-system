import fitz  # PyMuPDF
import re
from typing import List, Dict, Any
import mysql.connector
import os
import json

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

def extract_marks(text: str) -> int | None:
    match = re.search(r"\[(\d+)\]", text)
    return int(match.group(1)) if match else None

def extract_code_block(text: str) -> list[str]:
    lines = text.strip().split("\n")
    return [
        line for line in lines
        if re.match(r"^\d{2}\s", line) or
           re.search(r"\b(procedure|endprocedure|if|then|next|input|print|for|while|endif)\b", line, re.IGNORECASE)
    ]

def convert_to_structured_json(parsed_questions: list, exam_id: int) -> list[dict]:
    def empty_extensions(text: str):
        return {
            "code_block": extract_code_block(text),
            "table_data": {},
            "trace_steps": [],
            "diagram_ref": "",
            "options": [],
            "structure_type": ""
        }

    structured = []
    for q in parsed_questions:
        
        main_marks = extract_marks(q["text"])
        main_code = extract_code_block(q["text"])
        print(f"📌 Q{q['number']} main → marks: {main_marks} | code_block: {len(main_code)} lines")
        
        question = {
            "exam_id": exam_id,
            "number": q["number"],
            "text": q["text"],
            "question_type": "short_answer",
            "marks": extract_marks(q["text"]),
            "keypoints": [],
            "extensions": empty_extensions(q["text"]),
            "sub_questions": []
        }
        for sub in q.get("sub_questions", []):
            
            sub_marks = extract_marks(sub["text"])
            sub_code = extract_code_block(sub["text"])
            print(f"  └─ sub ({sub['letter']}) → marks: {sub_marks} | code_block: {len(sub_code)} lines")
            sub_q = {
                "letter": sub["letter"],
                "text": sub["text"],
                "question_type": "short_answer",
                "marks": extract_marks(sub["text"]),
                "keypoints": [],
                "extensions": empty_extensions(sub["text"]),
                "subsub_questions": []
            }
            for subsub in sub.get("subsub_questions", []):
                subsub_marks = extract_marks(subsub["text"])
                subsub_code = extract_code_block(subsub["text"])
                print(f"      └─ subsub ({subsub['roman']}) → marks: {subsub_marks} | code_block: {len(subsub_code)} lines")

                subsub_q = {
                    "roman": subsub["roman"],
                    "text": subsub["text"],
                    "question_type": "short_answer",
                    "marks": extract_marks(subsub.get("raw", subsub["text"])),
                    "keypoints": [],
                    "extensions": empty_extensions(subsub["text"])
                }
                sub_q["subsub_questions"].append(subsub_q)
            question["sub_questions"].append(sub_q)
        structured.append(question)
    return structured

# ✅ 标准结构分析函数（主结构入口）
# - 支持主 + 子 + 子子层级
# - 使用标准字段：sub_questions + subsub_questions
def parse_questions(text: str) -> List[Dict[str, Any]]:
    lines = text.strip().split("\n")
    questions = []
    current_q, current_sub, current_subsub = None, None, None
    last_q_number = None  # ✅ 新增：追踪上一个题号，防止重复
    seen_sub_letters = set()  # ✅ 当前题内子题去重

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # 主+子组合，如 "3 (a) Describe..."
        m_combo = re.match(r"^(\d+)\s+\(([a-z])\)\s+(.*)", line)
        if m_combo:
            q_number = int(m_combo.group(1))
            if current_q and last_q_number != q_number:
                questions.append(current_q)
            last_q_number = q_number
            current_q = {
                "number": q_number,
                "text": "",
                "sub_questions": []
            }
            current_sub = {
                "letter": m_combo.group(2),
                "text": m_combo.group(3),
                "subsub_questions": []
            }
            seen_sub_letters = {current_sub["letter"]}  # ✅ 重置子题集
            current_q["sub_questions"].append(current_sub)
            current_subsub = None
            continue

        # ✅ 标准主问题，如 "3 Describe..."
        if re.match(r"^\d+\s+", line):
            q_number = int(line.split()[0])
            q_text = line[len(str(q_number)):].strip()
            if current_q and last_q_number != q_number:
                questions.append(current_q)
            last_q_number = q_number
            current_q = {
                "number": q_number,
                "text": q_text,
                "sub_questions": []
            }
            seen_sub_letters = set()
            current_sub, current_subsub = None, None
            print(f"🟢 识别主问题（标准）: {q_number}")
            continue

        # ✅ 主问题变种：如 "3* Some long question"
        m_main_star = re.match(r"^(\d+)\*\s+(.*)", line)
        if m_main_star:
            q_number = int(m_main_star.group(1))
            q_text = m_main_star.group(2).strip()
            if current_q and last_q_number != q_number:
                questions.append(current_q)
            last_q_number = q_number
            current_q = {
                "number": q_number,
                "text": q_text,
                "sub_questions": []
            }
            seen_sub_letters = set()
            current_sub, current_subsub = None, None
            print(f"🟢 识别主问题（星号）: {q_number}")
            continue

        # ✅ 单独编号行（如 "3"）表示新主问题（下一行是题干或子题）
        if re.fullmatch(r"\d{1,2}", line):
            q_number = int(line)
            if current_q and last_q_number != q_number:
                questions.append(current_q)
            last_q_number = q_number
            current_q = {
                "number": q_number,
                "text": "",
                "sub_questions": []
            }
            seen_sub_letters = set()
            current_sub, current_subsub = None, None
            continue

        # 子+子子结构，如 "(a) (i) text"
        m_combo_sub = re.match(r"^\(([a-z])\)\s+\(([ivxlcdm]+)\)\s+(.*)", line, re.IGNORECASE)
        if m_combo_sub and current_q:
            letter = m_combo_sub.group(1)
            if letter in seen_sub_letters:
                continue  # ✅ 重复子题跳过
            seen_sub_letters.add(letter)
            current_sub = {
                "letter": letter,
                "text": "",
                "subsub_questions": []
            }
            current_q["sub_questions"].append(current_sub)
            current_subsub = {
                "roman": m_combo_sub.group(2),
                "text": f"({m_combo_sub.group(2)}) {m_combo_sub.group(3)}"
            }
            current_sub["subsub_questions"].append(current_subsub)
            continue

        # 子题结构，例如 "(a) Describe..."
        m_sub = re.match(r"^\(([a-z])\)\s*(.*)", line)
        if m_sub and current_q:
            if m_sub.group(1).lower() == "i":
                pass  # ✅ 忽略 (i)，由子子题逻辑处理
            else:
                letter = m_sub.group(1)
                if letter in seen_sub_letters:
                    continue  # ✅ 重复子题跳过
                seen_sub_letters.add(letter)
                current_sub = {
                    "letter": letter,
                    "text": m_sub.group(2),
                    "subsub_questions": []
                }
                current_q["sub_questions"].append(current_sub)
                current_subsub = None
                continue

        # 子子题（支持多行多个 (i)(ii)...，避免编号/分数混入题干）
        if current_q:
            if not current_sub:
                current_sub = {
                    "letter": "",
                    "text": "",
                    "subsub_questions": []
                }
                current_q["sub_questions"].append(current_sub)

            matches = list(re.finditer(r"\(([ivxlcdm]+)\)\s*", line, re.IGNORECASE))
            if matches:
                for i in range(len(matches)):
                    start = matches[i].end()
                    end = matches[i + 1].start() if i + 1 < len(matches) else len(line)
                    roman = matches[i].group(1)
                    content = line[start:end].strip()
                    content = re.sub(r"\(\s*[ivxlcdm]+\s*\)", "", content)
                    content = re.sub(r"\s*\[\d+\]\s*$", "", content)
                    current_subsub = {
                        "roman": roman,
                        "text": f"({roman}) {content.strip()}",
                        "raw": line[start:end].strip()  # ✅ 加入原始未清洗的行
                    }
                    current_sub["subsub_questions"].append(current_subsub)
                continue

        # 文本追加：多行子子题支持
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

def save_json(data: dict, filename: str):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

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
    
    # ✅ 使用结构化提取并转换为标准 JSON 格式
    parsed = parse_questions(full_text)
    structured = convert_to_structured_json(parsed, insert_exam(year, paper_type))
    
    # ✅ 保存结构化 JSON 输出
    save_json(structured, "output.json")

    # ✅ 调试 parse_questions() 输出结构并写入 parsed_debug.json
    parsed_debug_path = "parsed_debug.json"
    save_json(parsed, parsed_debug_path)
    print(f"🐞 调试结构写入: {parsed_debug_path}")
    print("🎉 所有题目已结构化保存到 output.json")


