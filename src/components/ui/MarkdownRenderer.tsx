import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export default function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
