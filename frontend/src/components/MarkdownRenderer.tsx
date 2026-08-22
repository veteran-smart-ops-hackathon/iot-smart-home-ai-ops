import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(index);
    setTimeout(() => {
      setCopiedCodeIndex(null);
    }, 2000);
  };

  let codeBlockCounter = 0;

  return (
    <div className={`markdown-content space-y-2 text-xs leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-stone-900 dark:text-white mt-3 mb-1.5 pb-1 border-b border-stone-200 dark:border-stone-800">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-2.5 mb-1 text-purple-700 dark:text-purple-300">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 mt-2 mb-1">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-200 mt-1.5 mb-0.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-stone-800 dark:text-stone-200 my-1 leading-relaxed">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-stone-900 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-stone-700 dark:text-stone-300">
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-4 space-y-1 my-1.5 text-stone-800 dark:text-stone-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-4 space-y-1 my-1.5 text-stone-800 dark:text-stone-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-0.5 leading-relaxed">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-purple-500/80 bg-purple-50/50 dark:bg-purple-950/20 pl-3 py-1.5 my-2 rounded-r italic text-stone-700 dark:text-stone-300">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2.5 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm">
              <table className="w-full text-left border-collapse text-[11px] font-mono">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-stone-100 dark:bg-stone-800/90 text-stone-900 dark:text-white border-b border-stone-200 dark:border-stone-700">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-stone-200/60 dark:divide-stone-800/60">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="p-2 font-bold text-stone-700 dark:text-stone-300">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="p-2 text-stone-800 dark:text-stone-200">
              {children}
            </td>
          ),
          hr: () => (
            <hr className="border-stone-200 dark:border-stone-800 my-2.5" />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:text-purple-700 dark:hover:text-purple-300"
            >
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className && typeof children === 'string' && !children.includes('\n');
            const codeString = String(children).replace(/\n$/, '');

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 text-purple-700 dark:text-purple-300 font-mono text-[11px] border border-stone-300/60 dark:border-stone-700/60"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const currentIdx = codeBlockCounter++;
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'code';
            const isCopied = copiedCodeIndex === currentIdx;

            return (
              <div className="my-2.5 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-900 text-stone-100 font-mono text-[11px] shadow-sm">
                <div className="flex items-center justify-between px-3 py-1 bg-stone-950/80 border-b border-stone-800 text-[10px] text-stone-400">
                  <span className="uppercase tracking-wider font-semibold text-purple-400">
                    {language}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(codeString, currentIdx)}
                    className="flex items-center space-x-1 hover:text-white transition-colors px-1.5 py-0.5 rounded bg-stone-800/80 hover:bg-stone-800"
                    title="Sao chép mã"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 overflow-x-auto">
                  <pre className="m-0 leading-relaxed font-mono">
                    <code>{codeString}</code>
                  </pre>
                </div>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
