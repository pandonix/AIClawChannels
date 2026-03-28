import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "../../lib/cn";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ className, content }: MarkdownRendererProps) {
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} rel="noreferrer" target="_blank" />,
          code: ({ className, children, ...props }) => {
            const text = String(children).replace(/\n$/, "");
            const isInline = !className;

            if (isInline) {
              return (
                <code className="markdown-inline-code" {...props}>
                  {text}
                </code>
              );
            }

            return (
              <code className={className} {...props}>
                {text}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
