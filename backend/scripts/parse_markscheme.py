import os
import re
import sys
import json
import pdfplumber
from typing import List, Dict, Tuple, Optional

# ✅ 判断子题是否为 (a)、(b)
def is_sub_alpha(value: str) -> bool:
    return re.fullmatch(r"\(?[a-zA-Z]\)?", value.strip()) is not None

# ✅ 判断子子题是否为 (i)、(ii)
def is_subsub_roman(value: str) -> bool:
    return re.fullmatch(r"\(?[ivxlcdmIVXLCDM]+\)?", value.strip()) is not None

# ✅ 提取分数
def extract_numeric_mark(mark: str) -> int:
    if not mark:
        return 0
    # 优先提取括号中的数字
    paren_numbers = re.findall(r"\((\d+)\)", mark)
    if paren_numbers:
        return sum(int(n) for n in paren_numbers)
    # 否则尝试提取裸数字
    numbers = re.findall(r"\b\d+\b", mark)
    return sum(int(n) for n in numbers) if numbers else 0

# ✅ 嵌套表格转纯文本，用于插入答案内容中
def table_to_plaintext(table: List[List[str]]) -> str:
    lines = []
    for row in table:
        clean_row = [cell.strip().replace("\n", " ") if cell else "" for cell in row]
        lines.append("\t".join(clean_row))
    return "\n".join(lines)

# ✅ 表格定位：判断嵌套表格位于哪个主表格单元格中
def find_nested_table_position(cells, nested_bbox) -> Optional[Tuple[int, int]]:
    x0_n, y0_n, x1_n, y1_n = nested_bbox
    for cell in cells:
        if len(cell) < 6:
            continue
        x0_c, y0_c, x1_c, y1_c = cell[:4]
        row_idx, col_idx = cell[4], cell[5]
        if (x0_c <= x0_n <= x1_c and x0_c <= x1_n <= x1_c and
            y0_c <= y1_n <= y1_c and y0_c <= y0_n <= y1_c):
            return row_idx, col_idx
    return None

# ✅ 新增模块：多表格页处理嵌套表格，追加内容至所属题目
def handle_multi_table_page(page, extra_tables, results, row_to_qid_map):
    print("🧩 正在处理多表格页面")

    # ✅ 获取主评分表格的 cell 坐标
    main_cells = page.find_tables()[0].cells

    for extra_table in extra_tables:
        table_data = extra_table.extract()

        # ✅ 跳过空表或列数过少（非评分结构）
        if not table_data or len(table_data[0]) < 4:
            print("⚠️ 嵌套表格列数过少，跳过")
            continue
        # ✅ 新增：防止误识别内容表格作为评分嵌套
        if all(
            row and all((cell or "").strip() not in {"1", "2", "3", "a", "b", "c", "i", "ii"} for cell in row[:3])
            for row in table_data[:2]
        ):
            print("⚠️ 嵌套表格没有评分字段特征，疑似答题展示内容，跳过")
            continue

        bbox = extra_table.bbox
        pos = find_nested_table_position(main_cells, bbox)
        if pos:
            row_idx, _ = pos
            target_qid = row_to_qid_map.get(row_idx)

            if target_qid:
                for r in results:
                    if r["question_id"] == target_qid:
                        print(f"📎 表格嵌套在题号 {target_qid} 中，追加到答案")
                        r["answer"] += "\n" + table_to_plaintext(table_data)

# ✅ 主评分表格处理逻辑，统一函数可用于单页/多页情况

def process_main_table(
    table: List[List[str]],
    results: List[Dict],
    row_to_qid_map: Dict[int, str],
    col_map: Dict[str, int],
    last_context: Optional[Dict] = None
) -> Tuple[Dict, Dict]:
    last_main = last_context.get("main") if last_context else None
    last_sub = last_context.get("sub") if last_context else None
    last_subsub = last_context.get("subsub") if last_context else None
    last_row = last_context.get("row") if last_context else None

    print(f"📊 固定列结构处理评分表格，共 {len(table)} 行")
    print("🔍 表格原始行内容:")
    for i, row in enumerate(table):
        print(f"  行 {i + 1}: {row} (列数: {len(row)})")

    try:
        for row_index, row in enumerate(table):
            print(f"\n🔽 正在处理第 {row_index + 1} 行...")
            FIELD_NAMES = {"question", "answer", "mark", "guidance", "sub", "subsub", "answer/indicative content"}
            normalized_row = [cell.strip().lower() for cell in row if cell]
            is_header_row = all(cell in FIELD_NAMES for cell in normalized_row) and len(normalized_row) >= 3
            if is_header_row:
                print(f"⚠️ 第 {row_index + 1} 行是字段表头，跳过")
                continue

            if not row or len(row) <= col_map["answer"]:
                print("⚠️ 行为空或缺 answer 列，跳过")
                continue

            answer = row[col_map["answer"]].strip() if row[col_map["answer"]] else ""
            mark = row[col_map["mark"]].strip() if col_map["mark"] != -1 and row[col_map["mark"]] else ""
            guidance = row[col_map["guidance"]].strip() if col_map["guidance"] != -1 and row[col_map["guidance"]] else ""

            if not answer:
                print("⚠️ 无答案内容，跳过")
                continue

            raw_main = row[col_map["main"]].strip() if row[col_map["main"]] else ""
            raw_sub = row[col_map["sub"]].strip() if col_map["sub"] >= 0 and row[col_map["sub"]] else ""
            raw_subsub = row[col_map["subsub"]].strip() if col_map["subsub"] >= 0 and row[col_map["subsub"]] else ""

            print(f"🔍 raw_main='{raw_main}', raw_sub='{raw_sub}', raw_subsub='{raw_subsub}'")

            if raw_main and not raw_main.isdigit():
                print(f"⚠️ 非法 main 字段：'{raw_main}'，跳过行")
                continue

            is_append_line = not any([raw_main, raw_sub, raw_subsub])
            if is_append_line and last_row:
                print(f"📎 作为上一行的续行追加到：{last_row['question_id']}")
                last_row["answer"] += "\n" + answer
                last_row["guidance"] += "\n" + guidance
                if mark:
                    last_row["mark"] = extract_numeric_mark(mark)
                continue

            # 字段继承前，先检查是否是新主题，若是则清空子题上下文
            if raw_main and raw_main.isdigit() and raw_main != last_main:
                print(f"🆕 新 main 题号: {raw_main}（旧：{last_main}）")
                last_main = raw_main
                last_sub = None
                last_subsub = None
            
            main = raw_main if raw_main else last_main
            sub = raw_sub if raw_sub and is_sub_alpha(raw_sub) else last_sub
            subsub = raw_subsub if raw_subsub and is_subsub_roman(raw_subsub) else None


            print(f"✅ 字段继承后: main={main}, sub={sub}, subsub={subsub}")

            if sub != last_sub:
                print(f"  ↪️ 新 sub 子题: {sub}")
                last_sub = sub
                last_subsub = None
            if subsub != last_subsub:
                print(f"    ↪️ 新 subsub 子子题: {subsub}")
                last_subsub = subsub

            parts = [main] if main else []
            if sub:
                parts.append(f"({sub.strip('()')})")
            if subsub:
                parts.append(f"({subsub.strip('()')})")
            qid = " ".join(parts)

            current = {
                "question_id": qid,
                "main": main,
                "sub": sub.strip("()") if sub else None,
                "subsub": subsub.strip("()") if subsub else None,
                "answer": answer,
                "mark": extract_numeric_mark(mark),
                "guidance": guidance
            }

            print(f"✅ 提取结果：{qid}, 分数: {current['mark']}")
            results.append(current)
            last_row = current
            row_to_qid_map[row_index] = qid

    except Exception as e:
        print(f"❌ 表格处理失败: {e}")

    return col_map, {
        "main": last_main,
        "sub": last_sub,
        "subsub": last_subsub,
        "row": last_row
    }

def looks_like_score_table(table_data: List[List[str]]) -> bool:
    if not table_data or len(table_data[0]) < 6:
        return False

    # ✅ 任意一行第 0 列是数字题号
    has_question_id = any(
        row and len(row) > 0 and isinstance(row[0], str) and row[0].strip().isdigit()
        for row in table_data
    )

    # ✅ 任意一行第 4 列有长答案
    has_valid_answer = any(
        isinstance(row[3], str) and len(row[3].strip()) > 20
        for row in table_data if len(row) > 3
    )

    return has_question_id or has_valid_answer

# ✅ 主入口函数，处理 PDF 所有页
def robust_extract_table_from_pdf(pdf_path: str) -> List[Dict[str, str]]:
    results = []
    fixed_col_map = {
        "main": 0,
        "sub": 1,
        "subsub": 2,
        "answer": 3,
        "mark": 4,
        "guidance": 5
    }
    row_to_qid_map = {}
    last_context = {}

    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages):
            print(f"\n📄 正在处理第 {page_number + 1} 页")
            table_objs = page.find_tables()  # ✅ 使用高级提取，包含坐标 bbox 和 cells
            print(f"  ➕ 检测到表格数量: {len(table_objs)}")

            if not table_objs:
                continue  # 没有表格，跳过

            # ✅ 筛选出可能的主评分表格（至少6列）
            candidate_tables = [
                t for t in table_objs
                if t.extract() and len(t.extract()[0]) == 6 and looks_like_score_table(t.extract())
            ]

            if candidate_tables:
                for idx, main_table_obj in enumerate(candidate_tables):
                    main_table_data = main_table_obj.extract()
                    print(f"📊 固定列结构处理评分表格（第 {idx + 1} 个主表），共 {len(main_table_data)} 行")

                    col_map, last_context = process_main_table(
                        table=main_table_data,
                        results=results,
                        row_to_qid_map=row_to_qid_map,
                        col_map=fixed_col_map,
                        last_context=last_context
                    )

                # 🧩 主评分表格之外的表格作为嵌套内容处理
                processed_set = set(candidate_tables)
                other_tables = [t for t in table_objs if t not in processed_set]
                if other_tables:
                    handle_multi_table_page(page, other_tables, results, row_to_qid_map)

            else:
                print(f"📄 第 {page_number + 1} 页为评分续页，无主评分表")
                handle_multi_table_page(page, table_objs, results, row_to_qid_map)

    # ✅ 合并相同 question_id 的内容（答案/指导累加）
    merged = {}
    for row in results:
        qid = row["question_id"]
        if qid not in merged:
            merged[qid] = row.copy()
        else:
            merged[qid]["answer"] += "\n" + row["answer"]
            merged[qid]["guidance"] += "\n" + row["guidance"]
            if not merged[qid]["mark"] and row["mark"]:
                merged[qid]["mark"] = row["mark"]

    # ✅ 若发现子子题独立无兄弟，自动降级为子题
    final_results = []
    all_qids = set(merged.keys())
    for q in merged.values():
        if q["subsub"]:
            base_prefix = f"{q['main']} ({q['sub']})"
            siblings = [qid for qid in all_qids if qid.startswith(base_prefix)]
            if len(siblings) == 0 :
                print(f"⚠️ 子子题 {q['question_id']} 无兄弟题，降级为 {base_prefix}")
                q["question_id"] = base_prefix
                q["subsub"] = None
        final_results.append(q)

    return final_results

# ✅ 保存为 JSON 文件
def save_json(data: Dict, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# ✅ 命令行入口
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python parse_markscheme.py <pdf_path> <output_dir>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    if not os.path.exists(pdf_path):
        print(f"❌ PDF 不存在: {pdf_path}")
        sys.exit(1)

    print("📄 正在提取评分表格:", pdf_path)
    structured_table = robust_extract_table_from_pdf(pdf_path)
    save_json(structured_table, os.path.join(output_dir, "markscheme.json"))
    print("✅ 评分标准已生成 markscheme.json")