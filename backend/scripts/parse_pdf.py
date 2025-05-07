import fitz  # PyMuPDF
import re
from typing import List, Dict,Tuple, Any
import mysql.connector
import os
import json
import pdfplumber
from pathlib import Path
import sys
import difflib

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
def merge_question_number_and_text(lines: List[str], debug: bool = False) -> List[str]:
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
    增强：支持主问题含“numbers/values/table/data”关键词时，后续纯数字行自动并入主问题。
    """

    merged_lines = []
    idx = 0
    in_number_collect_mode = False
    number_keywords = ["numbers", "values", "table", "data"]
    while idx < len(lines):
        current = lines[idx].strip()

        if debug:
            print(f"🔎 行[{idx}]: '{current}', in_number_collect_mode={in_number_collect_mode}")

        # number collect mode: 若处于数字收集模式且当前行是纯数字，则追加到上一主问题
        if in_number_collect_mode and re.fullmatch(r"\d+", current):
            if debug:
                print(f"➕ 附加数字行到主问题: {current} (in_number_collect_mode)")
            merged_lines[-1] += f" {current}"
            idx += 1
            continue

        # 检查是否需要退出数字收集模式: 仅检测新题号模式
        if in_number_collect_mode:
            # 仅当出现明确的新题号模式时退出数字收集模式
            if re.match(r"^(\([a-z]\)|\([ivxlcdm]+\)|\d+[\s.])", current, re.IGNORECASE):
                in_number_collect_mode = False
                if debug:
                    print(f"⛔️ 检测到新题号模式，退出数字收集模式: '{current}'")
                # 不 return/continue，继续处理本行

        # 检查主问题+关键词，决定是否进入数字收集模式
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
                # 检查合并后的主问题文本是否包含关键词，决定是否进入数字收集模式
                q_text = next_line
                if any(kw in q_text.lower() for kw in number_keywords):
                    in_number_collect_mode = True
                    if debug:
                        print(f"🔍 主问题含关键词，进入数字收集模式: {merged}")
                else:
                    in_number_collect_mode = False
                idx += 2
                continue
            # 如果下一行不是题干，但主问题后面有关键词，也考虑进入数字收集模式
            # 例如: 3 Trudi would like to sort an array of numbers into order.
            # 这里主问题和题干在同一行，不会走此分支

        # 标准主问题格式：如 "3 Trudi would like to sort an array of numbers into order."
        m_main = re.match(r"^(\d+)\s+(.+)", current)
        if m_main:
            q_text = m_main.group(2)
            merged_lines.append(current)
            if any(kw in q_text.lower() for kw in number_keywords):
                in_number_collect_mode = True
                if debug:
                    print(f"🔍 主问题含关键词，进入数字收集模式: {current}")
            else:
                in_number_collect_mode = False
            idx += 1
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
        "text": None,          # 题干内容
        "score": None       # 题目分数
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
        result["score"] = int(score.group(1))  # ✅ 保存分数为整数
        return result

    # ✅ 默认归类为普通文本行（追加内容）
    result["type"] = "text"
    result["text"] = line
    return result



# ✅ 模块：提取 PDF 文件中的试题文本内容（支持题号识别与结构分割）
def extract_text_from_pdf(pdf_path: str, debug=False) -> str:
    import fitz  # PyMuPDF
    import pdfplumber
    doc = fitz.open(pdf_path)
    questions = [] # 存储提取的题目文本
    current_question = [] # 当前题目文本
    in_question = False # 是否在题目文本中

    # --- 新增：提取所有表格数字项 ---
    def extract_tables_as_flat_text(pdf) -> set[str]:
        import re
        table_text_items = set()
        for page in pdf.pages:
            try:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if row:
                            for cell in row:
                                text = str(cell).strip()
                                if text and re.fullmatch(r"\d+", text):
                                    table_text_items.add(text)
            except:
                continue
        return table_text_items

    # 用 pdfplumber 打开 PDF，提取表格内纯数字项
    with pdfplumber.open(pdf_path) as pdf_plumber_obj:
        table_numbers = extract_tables_as_flat_text(pdf_plumber_obj)
    if debug:
        print(f"🟦 表格内纯数字项: {table_numbers}")

    for i, page in enumerate(doc):# 遍历每一页
        if debug:
            print(f"\n📄 开始处理第 {i+1} 页")

        found_new_question = False
        found_score_only = False
        raw_text = page.get_text("text")
        if not raw_text.strip():
            if debug:
                print(f"⚠️ 第 {i+1} 页提取失败，内容为空")
            continue

        original_lines = raw_text.split("\n")
        seen_score = False

        for idx, line in enumerate(original_lines):
            stripped = line.strip()
            if stripped:
                if re.fullmatch(r"\d{1,3}", stripped):
                    if debug:
                        print(f"🧾 移除疑似页码行: '{stripped}'")
                    original_lines.pop(idx)
                break

        cleaned_lines = filter_page_noise(original_lines, debug=True, is_last_page=(i == len(doc) - 1))
        # === 提前数字收集逻辑 ===
        def apply_number_inclusive_mode(lines: list[str], table_numbers: set[str], debug=False) -> tuple[list[str], set[str]]:
            import re
            updated_lines = []
            collected_number_lines = set()
            number_keywords = ["numbers", "values", "table", "data"]
            idx = 0
            while idx < len(lines):
                line = lines[idx]
                if re.match(r"^\d+\s", line):  # 主问题格式
                    q_text = line.split(maxsplit=1)[1] if ' ' in line else ''
                    updated_lines.append(line)
                    idx += 1
                    # 检查是否包含关键词
                    if any(kw in q_text.lower() for kw in number_keywords):
                        while idx < len(lines) and re.fullmatch(r"\d+", lines[idx]) and lines[idx] not in table_numbers:
                            if debug:
                                print(f"➕ 提前附加纯数字行: {lines[idx]}")
                            updated_lines[-1] += f" {lines[idx]}"
                            collected_number_lines.add(lines[idx])
                            idx += 1
                        else:
                            if debug and idx < len(lines):
                                print(f"⛔️ 停止数字追加，当前行: {lines[idx]}")
                else:
                    updated_lines.append(line)
                    idx += 1
            return updated_lines, collected_number_lines

        # NOTE: 此处移除 apply_number_inclusive_mode 对 cleaned_lines 的调用，推迟到 merge 后

        # 新增：打印第 5~7 页清理后内容
        if 4 <= i <= 6:
            print(f"\n🧹 第 {i+1} 页清理后内容：")
            if not cleaned_lines:
                print("⚠️ 此页清理后为空")
            for line in cleaned_lines:
                print(f"  {line}")
        if debug:    
            print(f"📄 清洗后行数: {len(cleaned_lines)}")
        if not cleaned_lines:
            continue

        merged_lines = merge_question_number_and_text(cleaned_lines, debug=True)

        # 应用数字追加逻辑（现在在合并后调用）
        merged_lines, collected_number_lines = apply_number_inclusive_mode(merged_lines, table_numbers, debug=True)

        # --- 新增：过滤表格中的纯数字行和提前追加到主问题中的数字行 ---
        filtered_lines = [line for line in merged_lines if line.strip() not in table_numbers and line.strip() not in collected_number_lines]

        def start_new_question(line):
            nonlocal found_new_question, current_question, questions, seen_score
            if re.fullmatch(r"\[\d+\]", line.strip()):
                if debug:
                    print(f"⚠️ 跳过孤立分数行: {line}")
                return
            if current_question and seen_score:
                end_current_question()
            elif current_question and not seen_score:
                if debug:
                    print(f"🔄 当前题未结束，继续追加行: {line}")
                current_question.append(line)
                return
            current_question = [line]
            seen_score = False
            found_new_question = True
            if debug:
                print(f"🆕 开始新题块: {line}")

        def end_current_question():
            nonlocal current_question, questions, seen_score
            if not seen_score:
                if debug:
                    print(f"⚠️ 当前题未出现分数标识，不结束: {' | '.join(current_question)}")
                return
            if len(current_question) == 1 and re.fullmatch(r"[-_=~•·.\\s\\[\\]0-9]+", current_question[0]):
                if debug:
                    print("⚠️ 跳过伪题目：仅包含装饰线 + 分数")
                current_question = []
                return
            marks_match = re.search(r"\[(\d+)\]", " ".join(current_question))
            marks_text = f" [分数: {marks_match.group(1)}]" if marks_match else ""
            if debug:
                print(f"🏁 题目结束: {' | '.join(current_question)}{marks_text}")
            questions.append(" ".join(current_question))
            current_question = []
            seen_score = False

        # --- 下方所有处理都使用 filtered_lines 替代 merged_lines ---
        for line in filtered_lines:
            line = line.strip()
            if re.search(r"\[\d+\]", line):
                seen_score = True

            structure = parse_line_structure(line)
            if debug:
                print(f"🔍 检测结构类型: {structure['type']} 内容: {line}")
                print(f"🔍 分析结构: {structure}")
            if structure.get("score") is not None:
                if debug:
                    print(f"🔍 题目分数: {structure['score']}")
            
            

            if structure["type"] == "combo":
                if current_question:
                    if debug:
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
                    if debug:
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
                    if debug:
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
                    if debug:
                        print(f"⚠️ 忽略未挂载的分数行: {line}")

            else:
                if in_question:
                    if debug:
                        print(f"➕ 追加内容: {line}")
                    current_question.append(line)

        if current_question and seen_score:
            end_current_question()
        elif current_question and not seen_score:
            if debug:
                print("⚠️ 未结束的题目，但未发现分数标识")

    if debug:
        print("\n🧪 [DEBUG] extract_text_from_pdf() 最终返回内容如下：")
    #for idx, q in enumerate(questions, 1):
        #print(f"{idx:02d}: {q}")

    return "\n".join(questions), collected_number_lines

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
                subsub_marks = extract_marks(subsub.get("raw", subsub["text"]))
                print(f"🟢 subsub_marks: {subsub_marks}")
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
def parse_questions(text: str, table_numbers: set[str] = set(), debug=False) -> List[Dict[str, Any]]:
    lines = text.strip().split("\n")
    questions = []
    current_q, current_sub, current_subsub = None, None, None
    last_q_number = None  # ✅ 新增：追踪上一个题号，防止重复
    seen_sub_letters = set()  # ✅ 当前题内子题去重
    # --- number_inclusive_mode additions ---
    number_inclusive_mode = False
    number_keywords = ["numbers", "values", "table"]

    # 用于数字收集模式的缓冲区
    number_buffer = []
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # 跳过表格中的纯数字行
        if re.fullmatch(r"\d{1,2}", line):
            if line in table_numbers:
                if debug:
                    print(f"⛔️ 忽略表格中纯数字 '{line}'")
                continue

        # 主+子组合，如 "3 (a) Describe..."
        m_combo = re.match(r"^(\d+)\s+\(([a-z])\)\s+(.*)", line)
        if m_combo:
            number_inclusive_mode = False  # 自动终止数字收集模式
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
            if debug:
                print(f"🟢 识别主问题（组合）: {q_number}")
            continue

        # ✅ 标准主问题，如 "3 Describe..."
        if re.match(r"^\d+\s+", line):
            number_inclusive_mode = False  # 自动终止数字收集模式
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
            # Enable number_inclusive_mode if keywords are found in main question text
            if any(kw in q_text.lower() for kw in number_keywords):
                number_inclusive_mode = True
                if debug:
                    print(f"🔍 进入数字收集模式: 主问题 {q_number} 包含关键词")
                # 初始化缓冲区
                number_buffer = []
            seen_sub_letters = set()
            current_sub, current_subsub = None, None
            if debug:
                print(f"🟢 识别主问题（标准）: {q_number}")
            continue

        # ✅ 主问题变种：如 "3* Some long question"
        m_main_star = re.match(r"^(\d+)\*\s+(.*)", line)
        if m_main_star:
            number_inclusive_mode = False  # 自动终止数字收集模式
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
            # Enable number_inclusive_mode if keywords are found in main question text
            if any(kw in q_text.lower() for kw in number_keywords):
                number_inclusive_mode = True
                if debug:
                    print(f"🔍 进入数字收集模式: 主问题 {q_number} 包含关键词")
                # 初始化缓冲区
                number_buffer = []
            seen_sub_letters = set()
            current_sub, current_subsub = None, None
            if debug:
                print(f"🟢 识别主问题（星号）: {q_number}")
            continue

        # ✅ 单独编号行（如 "3"）表示新主问题（下一行是题干或子题）
        if re.fullmatch(r"\d{1,2}", line):
            number_inclusive_mode = False  # 自动终止数字收集模式
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
            if debug:
                print(f"🟢 识别主问题（单独编号行）: {q_number}")
            continue

        # 子+子子结构，如 "(a) (i) text"
        m_combo_sub = re.match(r"^\(([a-z])\)\s+\(([ivxlcdm]+)\)\s+(.*)", line, re.IGNORECASE)
        if m_combo_sub and current_q:
            number_inclusive_mode = False  # 自动终止数字收集模式
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
            number_inclusive_mode = False  # 自动终止数字收集模式
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
                number_inclusive_mode = False  # 自动终止数字收集模式
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
                        "raw": line,  # ✅ 保存原始行（含分数）
                    }
                    current_sub["subsub_questions"].append(current_subsub)
                continue

        # 数字追加模式：识别纯数字行
        if number_inclusive_mode:
            if debug:
                print(f"🔍 当前处于数字收集模式: {line}")
            if re.fullmatch(r"\d+", line):
                if current_q:
                    if debug:
                        print(f"➕ 附加数字行到主问题: {line}")
                    current_q["text"] += f" {line}"
                continue
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


def infer_year_and_paper_type_from_path(pdf_path: str):
    import re
    import pdfplumber

    with pdfplumber.open(pdf_path) as pdf:
        lines = pdf.pages[0].extract_text(x_tolerance=1).splitlines()

    year_match = re.search(r"20\d{2}", " ".join(lines))
    year = int(year_match.group()) if year_match else 2023

    paper_type = next((line.strip() for line in lines if re.match(r"H\d{3}/\d{2}", line)), "Unknown Paper Type")

    return year, paper_type

def extract_code_blocks_from_pdf(pdf) -> List[str]:
    numbered_line_pattern = re.compile(r"^\s*\d{2}\s")
    start_keywords = ("function", "procedure")

    lines = []
    for page in pdf.pages:
        text = page.extract_text(x_tolerance=1)
        if text:
            lines.extend(text.split("\n"))

    extracted_blocks = []

    # Extract numbered code blocks
    collecting = False
    buffer = []
    for line in lines:
        if numbered_line_pattern.match(line):
            if not collecting:
                collecting = True
                buffer = [line]
            else:
                buffer.append(line)
        else:
            if collecting:
                if len(buffer) > 1:
                    extracted_blocks.append('\n'.join(buffer).strip())
                collecting = False
                buffer = []

    # Extract function/procedure pseudocode blocks with 'endfunction'
    collecting = False
    buffer = []
    for line in lines:
        if not collecting and any(line.strip().lower().startswith(k) for k in start_keywords):
            collecting = True
            buffer = [line]
            continue

        if collecting:
            buffer.append(line)
            if "endfunction" in line.strip().lower():
                extracted_blocks.append('\n'.join(buffer).strip())
                collecting = False
                buffer = []

    return extracted_blocks


def normalize_plain(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", "", text)
    return text.strip()


def iterate_all_questions(data):
    for q in data:
        yield q
        for sub in q.get("sub_questions", []):
            yield sub
            for subsub in sub.get("subsub_questions", []):
                yield subsub


def match_code_blocks_to_questions(structured: List[dict], code_blocks: List[str]) -> List[dict]:
    normalized_blocks = [(block, normalize_plain(block)) for block in code_blocks]

    for q in iterate_all_questions(structured):
        q_text = q["text"]
        q_text_normalized = normalize_plain(q_text)
        for original_block, normalized_block in normalized_blocks:
            if normalized_block in q_text_normalized:
                flat_block = " ".join(original_block.splitlines()).strip()
                if flat_block in q_text:
                    q["text"] = q_text.replace(flat_block, "").strip()
                q["question_type"] = "code_block"
                q["extensions"]["code_block"] = [original_block]
                break

    return structured

def generate_question_bank_sql(structured: List[Dict[str, Any]],cursor) -> str:
    bank_sqls = []
    exam_sqls = []
    code_sqls = []

    bank_id_counter = 1
    exam_id_counter = 1
    code_id_counter = 1

    question_bank_map = {}  # (level, parent_id, text) -> id

    cursor.execute("SELECT MAX(id) FROM question_bank")
    max_id_result = cursor.fetchone()
    bank_id_counter = (max_id_result[0] or 0) + 1

    def escape(text):
        return text.replace("'", "''") if text else ""

    def insert_question(level: str, parent_id: int | None, text: str, qtype: str, marks: int | None, exam_id: int) -> int:
        nonlocal bank_id_counter
        key = (level, parent_id or 0, text.strip())
        # ✅ 内存缓存：避免同一轮重复插入
        if key in question_bank_map:
            return question_bank_map[key]

        # 恢复查询已存在题目的逻辑
        cursor.execute("""
            SELECT qb.id FROM question_bank qb
            JOIN exam_questions eq ON eq.question_bank_id = qb.id
            WHERE qb.level = %s AND qb.text = %s
              AND (qb.parent_id = %s OR (qb.parent_id IS NULL AND %s IS NULL))
              AND eq.exam_id = %s
            LIMIT 1
        """, (level, text, parent_id, parent_id, exam_id))
        result = cursor.fetchone()

        if result:
            qid = result[0]  # ✅ 复用已存在的 ID
        else:
            qid = bank_id_counter
            bank_id_counter += 1
            question_bank_map[key] = qid  # 缓存键值

            bank_sqls.append(
                f"INSERT INTO question_bank (id, level, parent_id, text, question_type, marks) VALUES "
                f"({qid}, '{level}', {parent_id if parent_id is not None else 'NULL'}, "
                f"'{escape(text)}', '{qtype}', {marks if marks is not None else 'NULL'});"
            )
        return qid
    def link_question_to_exam(exam_id: int, bank_id: int, sort_order: int):
        exam_sqls.append(
            f"INSERT IGNORE INTO exam_questions (exam_id, question_bank_id, sort_order) VALUES ({exam_id}, {bank_id}, {sort_order});"
        )

    def insert_codeblock(bank_id: int, code_lines: List[str]):
        nonlocal code_id_counter
        code = escape('\n'.join(code_lines))
        code_sqls.append(
            f"INSERT INTO question_codeblock (question_bank_id, code) VALUES ({bank_id}, '{code}');"
        )
        code_id_counter += 1

    for q in structured:
        sort_counter = 1
        # ✅ 忽略“伪主问题”：题干为空且无子题
        if not q['text'].strip() and not q.get('sub_questions'):
            continue

        q_id = insert_question('question', None, q['text'], q['question_type'], q.get('marks'), q['exam_id'])
        link_question_to_exam(q['exam_id'], q_id, sort_counter)
        sort_counter += 1
        if q['extensions'].get('code_block'):
            insert_codeblock(q_id, q['extensions']['code_block'])

        for sq in q.get('sub_questions', []):
            sq_id = insert_question('sub_question', q_id, sq['text'], sq['question_type'], sq.get('marks'), q['exam_id'])
            link_question_to_exam(q['exam_id'], sq_id, sort_counter)
            sort_counter += 1
            if sq['extensions'].get('code_block'):
                insert_codeblock(sq_id, sq['extensions']['code_block'])

            for ssq in sq.get('subsub_questions', []):
                ssq_id = insert_question('subsub_question', sq_id, ssq['text'], ssq['question_type'], ssq.get('marks'), q['exam_id'])
                link_question_to_exam(q['exam_id'], ssq_id, sort_counter)
                sort_counter += 1
                if ssq['extensions'].get('code_block'):
                    insert_codeblock(ssq_id, ssq['extensions']['code_block'])

    return '\n'.join(bank_sqls + exam_sqls + code_sqls)

def load_exam_text_from_mysql(exam_id: int, cursor) -> list[str]:
    cursor.execute(f"""
        SELECT
            eq.sort_order,
            qb.id,
            qb.level,
            qb.parent_id,
            qb.text,
            qb.question_type,
            qb.marks,
            COALESCE(qc.code, '')
        FROM exam_questions eq
        JOIN question_bank qb ON eq.question_bank_id = qb.id
        LEFT JOIN question_codeblock qc ON qb.id = qc.question_bank_id
        WHERE eq.exam_id = {exam_id}
        ORDER BY eq.sort_order
    """)
    rows = cursor.fetchall()

    questions = {}
    for row in rows:
        sort_order, qid, level, parent_id, text, qtype, marks, code = row
        questions[qid] = {
            "id": qid,
            "level": level,
            "parent_id": parent_id,
            "text": text,
            "question_type": qtype,
            "marks": marks,
            "code": code.strip(),
            "children": [],
            "sort_order": sort_order
        }

    for q in questions.values():
        pid = q["parent_id"]
        if pid in questions:
            questions[pid]["children"].append(q)

    top_questions = [q for q in questions.values() if q["level"] == "question"]
    top_questions.sort(key=lambda x: x["sort_order"])

    def format_question(q, prefix=""):
        lines = []
        mark_str = f" ({q['marks']} marks)" if q["marks"] else ""
        lines.append(f"{prefix}{q['text']}{mark_str}".strip())

        if q["code"]:
            lines.append("```")
            lines.append(q["code"])
            lines.append("```")

        child_prefixes = {
            "sub_question": ["(a)", "(b)", "(c)", "(d)", "(e)", "(f)"],
            "subsub_question": ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)"]
        }
        if q["children"]:
            for i, child in enumerate(q["children"]):
                if child["level"] == "sub_question":
                    sub_prefix = child_prefixes["sub_question"][i]
                    lines += format_question(child, prefix=f"{sub_prefix} ")
                elif child["level"] == "subsub_question":
                    sub_prefix = child_prefixes["subsub_question"][i]
                    lines += format_question(child, prefix=f"{prefix}{sub_prefix} ")

        return lines

    paper_lines = []
    for idx, q in enumerate(top_questions):
        number = f"{idx+1}."
        paper_lines += format_question(q, prefix=number + " ")

    return paper_lines


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python parse_pdf.py <pdf_path>[output_dir]")
        sys.exit(1)

    # 1. 加载 PDF 文件(python3 parse_pdf.py ../uploads/062023/704147-question-paper-computer-principles.pdf)
    pdf_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) >= 3 else "."
    print(f"❌❌❌❌ output_dir: {pdf_path}")
    if not os.path.exists(pdf_path):
        print(f"❌ 文件不存在: {pdf_path}")
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)
    print("🧪 Python 接收参数 output_dir:", output_dir)

    #用pdfplumber 加载 PDF 文件
    with pdfplumber.open(pdf_path) as pdf:
        code_blocks = extract_code_blocks_from_pdf(pdf)

    # 2. 结构化解析题目
    year, paper_type = infer_year_and_paper_type_from_path(pdf_path)
    full_text, collected_number_lines = extract_text_from_pdf(pdf_path, debug=True)

    with open(os.path.join(output_dir, "output.txt"), "w", encoding="utf-8") as f:
        f.write(full_text)
    print("📄 已保存到 output.txt")

    # 获取表格内纯数字项
    with pdfplumber.open(pdf_path) as pdf_plumber_obj:
        def extract_tables_as_flat_text(pdf) -> set[str]:
            import re
            table_text_items = set()
            for page in pdf.pages:
                try:
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if row:
                                for cell in row:
                                    text = str(cell).strip()
                                    if text and re.fullmatch(r"\d+", text):
                                        table_text_items.add(text)
                except:
                    continue
            return table_text_items
        table_numbers = extract_tables_as_flat_text(pdf_plumber_obj)

    parsed = parse_questions(full_text, table_numbers, debug=True)

    # ===== 新增：将 collected_number_lines 按主问题编号分组并插入主问题 =====
    # 1. 先构建 number_lines_map: { "3": ["89", "25", ...], ... }
    import re
    number_lines_map = {}
    for line in collected_number_lines:
        # 在 full_text 中找出 line 所在的主问题编号
        # 假设主问题格式为 "3 ..."，line 紧跟其后
        # 可用正则查找主问题编号
        # 遍历 full_text 的每一行，找到包含 line 的主问题编号
        # 这里采用简单策略：只要某主问题题干包含 line，就归属该编号
        matches = list(re.finditer(r"^(\d+)\s", full_text, re.MULTILINE))
        for idx, m in enumerate(matches):
            q_number = m.group(1)
            start = m.end()
            end = matches[idx+1].start() if idx+1 < len(matches) else len(full_text)
            q_text = full_text[start:end]
            if re.search(rf"\b{re.escape(line)}\b", q_text):
                number_lines_map.setdefault(q_number, []).append(line)
                break

    # 2. 把 number_lines_map 的内容插入对应主问题
    for q in parsed:
        num_str = str(q["number"])
        if num_str in number_lines_map:
            # 避免重复插入
            for n in number_lines_map[num_str]:
                if n not in q["text"]:
                    q["text"] += " " + n

    structured = convert_to_structured_json(parsed, insert_exam(year, paper_type))

    save_json(structured, os.path.join(output_dir, "output.json"))
    print("🎉 所有题目已结构化保存到 output.json",flush=True)

    # 3. 匹配代码块进题库结构
    structured = match_code_blocks_to_questions(structured, code_blocks)

    # 4. 保存结果（可选）
    with open(os.path.join(output_dir, "structured_with_code_blocks.json"), "w", encoding="utf-8") as f:
        json.dump(structured, f, indent=2, ensure_ascii=False)
    print("✅ 输出目录:", output_dir)


    # 5. 生成 SQL 语句
    sql = generate_question_bank_sql(structured, cursor)

    # 保存 SQL 文件，便于调试
    sql_file_path = os.path.join(output_dir, "generated_question_bank.sql")
    with open(sql_file_path, "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"📝 所有 SQL 语句已保存到 {sql_file_path}")
    sys.stdout.flush()

    error_stmts = []
    total_stmts = 0
    for stmt in sql.split(';'):
        stmt = stmt.strip()
        if not stmt:
            continue
        total_stmts += 1
        try:
            cursor.execute(stmt)
        except mysql.connector.Error as e:
            error_stmts.append((stmt, str(e)))

    db.commit()

    success_count = total_stmts - len(error_stmts)
    print(f"📊 SQL 执行统计：共 {total_stmts} 条，成功 {success_count} 条，失败 {len(error_stmts)} 条")

    if error_stmts:
        print(f"\n❌ 有 {len(error_stmts)} 条 SQL 执行失败：")
        for i, (bad_stmt, err_msg) in enumerate(error_stmts, 1):
            print(f"  {i:02d}. 错误: {err_msg}")
            print(f"      SQL: {bad_stmt}")
    else:
        print("🎉 所有 SQL 执行成功")



    # 6. 从数据库加载试卷文本
    paper_lines = load_exam_text_from_mysql(18, cursor)
    print('\n'.join(paper_lines))


