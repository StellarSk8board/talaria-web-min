/**
 * Tiny markdown renderer — bold, italic, code, links, line breaks.
 *
 * v1 deliberately does NOT use a real markdown library. The Talaria web
 * client only needs to render simple inline formatting in agent messages
 * (code, emphasis, links) and the dependency cost of marked/markdown-it
 * isn't worth it. If we later need tables, headings, or images, swap in
 * a real lib and call it from `renderInline`.
 */
import { type ReactNode } from "react";

export function renderInline(text: string): ReactNode[] {
  // Split on the same set of inline patterns: `code`, **bold**, *italic*,
  // [text](url). Order matters: code first (so ** inside code isn't bolded).
  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < text.length) {
    // Inline code: `...`
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i) {
        parts.push(<code key={key++}>{text.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }
    // Bold: **...**
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end > i + 2) {
        parts.push(<strong key={key++}>{renderInline(text.slice(i + 2, end))}</strong>);
        i = end + 2;
        continue;
      }
    }
    // Italic: *...*
    if (text[i] === "*") {
      const end = text.indexOf("*", i + 1);
      if (end > i) {
        parts.push(<em key={key++}>{renderInline(text.slice(i + 1, end))}</em>);
        i = end + 1;
        continue;
      }
    }
    // Link: [text](url)
    if (text[i] === "[" && text[i + 1] !== undefined) {
      const labelEnd = text.indexOf("]", i + 1);
      if (labelEnd > i && text[labelEnd + 1] === "(") {
        const urlEnd = text.indexOf(")", labelEnd + 2);
        if (urlEnd > labelEnd) {
          const label = text.slice(i + 1, labelEnd);
          const url = text.slice(labelEnd + 2, urlEnd);
          parts.push(
            <a key={key++} href={url} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          );
          i = urlEnd + 1;
          continue;
        }
      }
    }
    // Plain run: collect until next special char.
    let j = i + 1;
    while (j < text.length && !["`", "*", "["].includes(text[j])) j++;
    parts.push(text.slice(i, j));
    i = j;
  }

  return parts;
}
