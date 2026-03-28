import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "../../lib/cn";
import { StreamingCursor } from "./streaming-cursor";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  showCursor?: boolean;
}

export function MarkdownRenderer({ className, content, showCursor }: MarkdownRendererProps) {
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} rel="noreferrer" target="_blank" />,
          p: ({ children, node: _node, ...props }) => (
            <p {...props}>
              {children}
              {showCursor && <StreamingCursor />}
            </p>
          ),
          code: ({ className, children, node, ...props }) => {
            const text = String(children).replace(/\n$/, "");
            const isBlock = Boolean(node?.position && node.position.start.line !== node.position.end.line) || Boolean(className);

            if (!isBlock) {
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
      {showCursor && !content.trim() && <StreamingCursor />}
    </div>
  );
}
