
import os
import re
import pandas as pd
from pdf2image import convert_from_path
import pytesseract

date_pattern = re.compile(r'^\d{2} [A-Z]{3} 20\d{2}')
amount_pattern = re.compile(r'[£]?[\d,]+\.\d{2}')
suspicious_keywords = ["statement number", "account number", "sort code", "date transaction money", "bank"]

def process_pdf(pdf_path):
    lines = []
    images = convert_from_path(pdf_path)
    for image in images[2:]:
        text = pytesseract.image_to_string(image)
        lines.extend(text.splitlines())
    lines = [line.strip() for line in lines if line.strip()]

    result_rows = []
    i = 0
    while i < len(lines):
        line = lines[i]

        if any(k in line.lower() for k in ["closing balance", "total", "net interest"]):
            i += 1
            continue

        if "balance brought forward" in line.lower():
            matches = amount_pattern.findall(line)
            balance = max([float(m.replace("£", "").replace(",", "")) for m in matches]) if matches else ""
            result_rows.append({
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
            numeric_amounts_unique = list(dict.fromkeys(numeric_amounts))

            money_out = money_in = balance = ""

            if len(numeric_amounts_unique) >= 2:
                transaction_amount = numeric_amounts_unique[-2]
                balance_val = numeric_amounts_unique[-1]
                balance = f"{balance_val:.2f}"

                if "inward" in full_line.lower():
                    money_in = f"{transaction_amount:.2f}"
                else:
                    money_out = f"{transaction_amount:.2f}"
            elif len(numeric_amounts_unique) == 1:
                balance = f"{numeric_amounts_unique[0]:.2f}"

            desc_clean = amount_pattern.sub("", full_line).strip()
            desc_clean = re.sub(r"closing balance.*", "", desc_clean, flags=re.IGNORECASE).strip()
            desc_clean = " ".join(desc_clean.split()[:10])

            result_rows.append({
                "Date": date,
                "Transaction": desc_clean,
                "Money out (£)": money_out,
                "Money in (£)": money_in,
                "Balance (£)": balance
            })
            i = j
        else:
            i += 1

    return pd.DataFrame(result_rows)

if __name__ == "__main__":
    import sys
    input_folder = sys.argv[1]
    output_folder = sys.argv[2]

    os.makedirs(output_folder, exist_ok=True)

    for file in os.listdir(input_folder):
        if file.lower().endswith(".pdf"):
            input_path = os.path.join(input_folder, file)
            print(f"Processing: {input_path}")
            df = process_pdf(input_path)
            output_csv = os.path.join(output_folder, file.replace(".pdf", ".csv"))
            df.to_csv(output_csv, index=False)
            print(f"Saved to: {output_csv}")
