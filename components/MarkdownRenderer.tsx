'use client';
import { useEffect, useRef } from 'react';
import katex from 'katex';

interface Props {
  content: string;
  className?: string;
}

// Minimal markdown + KaTeX renderer (no heavy external deps needed)
function processMarkdown(text: string): string {
  // Escape HTML
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = text.split('\n');
  const out: string[] = [];
  let inCode = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${escape(codeBuffer.join('\n'))}</code></pre>`);
        codeBuffer = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeBuffer.push(line); continue; }

    if (line.startsWith('### ')) {
      out.push(`<h3>${escape(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      out.push(`<h2>${escape(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      out.push(`<h2>${escape(line.slice(2))}</h2>`);
    } else if (line.startsWith('> ')) {
      out.push(`<blockquote>${escape(line.slice(2))}</blockquote>`);
    } else if (/^[-*] /.test(line)) {
      out.push(`<ul><li>${escape(line.slice(2))}</li></ul>`);
    } else if (/^\d+\. /.test(line)) {
      out.push(`<ol><li>${escape(line.replace(/^\d+\. /, ''))}</li></ol>`);
    } else if (line.trim() === '') {
      out.push('<br/>');
    } else {
      // Inline formatting
      let l = escape(line);
      l = l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      l = l.replace(/\*(.+?)\*/g, '<em>$1</em>');
      l = l.replace(/`(.+?)`/g, '<code>$1</code>');
      l = l.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline text-blue-600 dark:text-blue-400">$1</a>');
      out.push(`<p>${l}</p>`);
    }
  }

  return out.join('');
}

export default function MarkdownRenderer({ content, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Split by display math first, then inline math
    const parts = content.split(/((?:\$\$[\s\S]*?\$\$|\$[^$\n]+\$))/g);
    let html = '';
    for (const part of parts) {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const latex = part.slice(2, -2);
        try {
          html += katex.renderToString(latex, { displayMode: true, throwOnError: false });
        } catch {
          html += `<code>${latex}</code>`;
        }
      } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const latex = part.slice(1, -1);
        try {
          html += katex.renderToString(latex, { displayMode: false, throwOnError: false });
        } catch {
          html += `<code>${latex}</code>`;
        }
      } else {
        html += processMarkdown(part);
      }
    }
    ref.current.innerHTML = html;
  }, [content]);

  return <div ref={ref} className={`prose-thesis text-sm ${className}`} />;
}
