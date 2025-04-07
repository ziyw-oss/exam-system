import os
import re
import sys
import json
import pdfplumber
from typing import List, Dict

def normalize_key(key: str) -> str:
    return key.replace(" ", "").lower()


def robust_extract_table_from_pdf(pdf_path: str) -> List[Dict[str, str]]:
    results = []
    col_map = None
    last_main, last_sub, last_subsub = None, None, None
    last_row = None

    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages):
            print(f"\n📄 正在处理第 {page_number + 1} 页")
            tables = page.extract_tables()
            print(f"  ➕ 检测到表格数量: {len(tables)}")
            for table_index, table in enumerate(tables):
                print(f"    ─ 表格 {table_index + 1}, 行数: {len(table)}")
                if not table:
                    print("    ⚠️ 表格为空，跳过")
                    continue

                if not col_map:
                    headers = [cell.lower().strip() if cell else "" for cell in table[0]]
                    print(f"    🧭 表头: {headers}")
                    if "question" in headers and "mark" in headers:
                        col_map = {
                            "main": headers.index("question"),
                            "sub": headers.index("sub") if "sub" in headers else headers.index("answer/indicative content") - 2,
                            "subsub": headers.index("subsub") if "subsub" in headers else headers.index("answer/indicative content") - 1,
                            "answer": headers.index("answer/indicative content") if "answer/indicative content" in headers else -1,
                            "mark": headers.index("mark"),
                            "guidance": headers.index("guidance") if "guidance" in headers else -1
                        }
                        print(f"    ✅ 列映射: {col_map}")
                        data_rows = table[1:]  # remove header row
                    else:
                        print("    ❌ 表头中缺失必要字段，跳过该表格")
                        continue
                else:
                    data_rows = table  # reuse col_map for subsequent tables

                for row_index, row in enumerate(data_rows):
                    print(f"      ─ 行 {row_index + 1}: {row}")
                    if not row or len(row) <= max(col_map.values()):
                        print("        ⚠️ 行无效或缺失列，跳过")
                        continue

                    answer = row[col_map["answer"]].strip() if col_map["answer"] != -1 and row[col_map["answer"]] else ""
                    mark = row[col_map["mark"]].strip() if row[col_map["mark"]] else ""
                    guidance = row[col_map["guidance"]].strip() if col_map["guidance"] != -1 and row[col_map["guidance"]] else ""

                    if not any([answer, mark, guidance]):
                        print("        ⚠️ 无内容（答案、分数、指导均为空），跳过")
                        continue

                    main = row[col_map["main"]].strip() if row[col_map["main"]] else None
                    sub = row[col_map["sub"]].strip() if col_map["sub"] >= 0 and row[col_map["sub"]] else None
                    subsub = row[col_map["subsub"]].strip() if col_map["subsub"] >= 0 and row[col_map["subsub"]] else None

                    if main and main != last_main:
                        last_sub = None
                        last_subsub = None

                    if sub and sub.isdigit():
                        print(f"        ⚠️ 子题 '{sub}' 为数字，跳过")
                        continue

                    if main:
                        last_main = main
                    else:
                        main = last_main

                    if sub:
                        last_sub = sub
                    else:
                        sub = last_sub

                    if subsub:
                        last_subsub = subsub
                    else:
                        subsub = last_subsub

                    parts = [main] if main else []
                    if sub:
                        parts.append(f"({sub})")
                    if subsub:
                        parts.append(f"({subsub})")
                    qid = " ".join(parts)

                    if not any([main, sub, subsub]) and last_row:
                        print("        ➕ 追加内容至上一题")
                        last_row["answer"] += "\n" + answer if answer else ""
                        last_row["guidance"] += "\n" + guidance if guidance else ""
                        continue

                    current = {
                        "question_id": qid,
                        "main": main,
                        "sub": sub,
                        "subsub": subsub,
                        "answer": answer,
                        "mark": mark,
                        "guidance": guidance
                    }
                    print(f"        ✅ 解析成功: {qid}")
                    results.append(current)
                    last_row = current

    # 合并相同 question_id 的内容
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

    all_qids = set(merged.keys())
    final_results = []
    for q in merged.values():
        if q["subsub"]:
            base_prefix = f"{q['main']} ({q['sub']})"
            siblings = [qid for qid in all_qids if qid.startswith(base_prefix)]
            if len(siblings) <= 1:
                print(f"⚠️ 子子题 {q['question_id']} 无兄弟题，降级为 {base_prefix}")
                q["question_id"] = base_prefix
                q["subsub"] = None
        final_results.append(q)

    return final_results


def save_json(data: Dict, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python parse_markscheme.py <pdf_path> <output_dir>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    if not os.path.exists(pdf_path):
        print(f"❌ PDF 不存在: {pdf_path}")
        sys.exit(1)

    print("📄 正在提取完整评分表格:", pdf_path)

    structured_table = robust_extract_table_from_pdf(pdf_path)
    save_json({"markscheme": structured_table}, os.path.join(output_dir, "markscheme.json"))

    print("✅ 评分标准已生成 markscheme.json")