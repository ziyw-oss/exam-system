// File: src/lib/utils.ts
export function formatToMarkdown(raw: string): string {
    return raw
      .replace(/•/g, "-")
      .replace(/\n/g, "\n")
      .replace(/\n(?=[^\n])/g, "\n\n");
  }