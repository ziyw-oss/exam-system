
import fitz
import pandas as pd
import re
from pdf2image import convert_from_path
import pytesseract

def extract_metrobank_transactions(pdf_path):
    images = convert_from_path(pdf_path)
    lines = []
    for image in images[2:]:
        text = pytesseract.image_to_string(image)
        lines.extend(text.splitlines())
    lines = [line.strip() for line in lines if line.strip()]

    date_pattern = re.compile(r'^\d{2} [A-Z]{3} 2023')
    amount_pattern = re.compile(r'[£]?[\d,]+\.\d{2}')
    parsed_rows = []

    i = 0
    while i < len(lines):
        line = lines[i]
        if any(k in line.lower() for k in ["closing balance", "total", "net interest"]):
            i += 1
            continue

        if "balance brought forward" in line.lower():
            matches = amount_pattern.findall(line)
            balance = max([float(m.replace("£", "").replace(",", "")) for m in matches]) if matches else ""
            parsed_rows.append({
                "Date": "",
                "Transaction": "Balance brought forward",
                "Money out (£)": "",
                "Money in (£)": "",
                "Balance (£)": f"{balance:.2f}" if balance else ""
            })
            i += 1
            continue

        if date_pattern.match(line):
            date = date_pattern.match(line).group()
            rest = line[len(date):].strip()

            desc_lines = [rest]
            j = i + 1
            desc_line_limit = 2
            suspicious_keywords = ["statement number", "account number", "sort code", "date transaction money", "bank"]

            while (
                j < len(lines) and 
                not date_pattern.match(lines[j]) and 
                "balance brought forward" not in lines[j].lower() and
                desc_line_limit > 0
            ):
                if any(kw in lines[j].lower() for kw in suspicious_keywords):
                    break
                desc_lines.append(lines[j])
                desc_line_limit -= 1
                j += 1

            full_line = " ".join(desc_lines)
            amounts = amount_pattern.findall(full_line)
            amounts = [a.replace("£", "").replace(",", "") for a in amounts]
            numeric_amounts = [float(a) for a in amounts if a.replace('.', '', 1).isdigit()]

            money_out = money_in = balance = ""
            if len(numeric_amounts) == 2:
                max_val = max(numeric_amounts)
                min_val = min(numeric_amounts)
                balance = f"{max_val:.2f}"
                money_out = f"{min_val:.2f}"
            elif len(numeric_amounts) == 1:
                balance = f"{numeric_amounts[0]:.2f}"
            elif len(numeric_amounts) >= 3:
                sorted_vals = sorted(numeric_amounts)
                balance = f"{sorted_vals[-1]:.2f}"
                money_out = f"{sorted_vals[-2]:.2f}"

            if money_out:
                money_in = ""

            desc_clean = amount_pattern.sub("", full_line).strip()
            desc_clean = re.sub(r"closing balance.*", "", desc_clean, flags=re.IGNORECASE).strip()
            desc_clean = " ".join(desc_clean.split()[:10])  # Limit to 10 words

            parsed_rows.append({
                "Date": date,
                "Transaction": desc_clean,
                "Money out (£)": money_out,
                "Money in (£)": money_in,
                "Balance (£)": balance
            })
            i = j
        else:
            i += 1

    return pd.DataFrame(parsed_rows)

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python extract_metro.py path/to/statement.pdf")
        sys.exit(1)

    pdf_file = sys.argv[1]
    df = extract_metrobank_transactions(pdf_file)
    output_csv = pdf_file.replace(".pdf", "_cleaned10words.csv")
    df.to_csv(output_csv, index=False)
    print(f"✅ Extracted and saved to: {output_csv}")
