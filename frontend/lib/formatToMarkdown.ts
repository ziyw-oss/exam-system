// File: src/lib/utils.ts
export function formatToMarkdown(raw: string): string {
    return raw
      .replace(/↵/g, "\n")// 把 ↵ 替换成换行符 \n
      .replace(/•\s*… /g, "")// 去掉 "• …"
      .replace(/• …/g, "")// 去掉 "• …"  
      .replace(/…/g, " ")// 去掉 "…"  
      .replace(/• /g, "-")//•将替换为-
      
      

          
      //.replace(/\n(?=[^\n])/g, "\n\n");
  }