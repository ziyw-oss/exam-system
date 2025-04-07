import os
import sys
import json
import pdfplumber
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
    in_appendix = False

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            lines = page.extract_text().split("\n") if page.extract_text() else []
            lines = clean_lines(lines)

            # 判断是否包含附录关键词，且该页无任何题号，则退出
            has_question = any(question_pattern.match(line) for line in lines)
            has_appendix = any(any(kw in line.lower() for kw in APPENDIX_KEYWORDS) for line in lines)
            if not has_question and has_appendix:
                print(f"⛔️ 第 {page_num+1} 页疑似附录内容，终止收集")
                break

            for line in lines:
                if in_appendix:
                    continue
                lowered = line.lower()
                if line.lower().startswith("exemplar"):
                    continue
                match = question_pattern.match(line)
                if match:
                    if current_key and buffer:
                        output[current_key] = " ".join(buffer).strip()
                        buffer = []
                    raw_key = match.group(1)
                    normalized = re.sub(r"\s+", "", raw_key)
                    normalized = normalized.replace(")(", ") (")
                    current_key = normalized
                elif current_key:
                    buffer.append(line)

        if current_key and buffer:
            output[current_key] = " ".join(buffer).strip()

    return output

def save_json(data: dict, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python parse_report.py <pdf_path> <output_dir>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    output_path = os.path.join(output_dir, "report.json")

    if not os.path.exists(pdf_path):
        print(f"❌ 文件不存在: {pdf_path}")
        sys.exit(1)

    print("📄 正在提取 Examiner Report:", pdf_path)
    structured = extract_examiner_report(pdf_path)
    save_json(structured, output_path)
    print("✅ Examiner report 结构化已保存:", output_path)