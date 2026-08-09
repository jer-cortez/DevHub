import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ReadmeMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: (props) => <h1 className="text-xl font-semibold mt-4 mb-2" {...props} />,
        h2: (props) => <h2 className="text-lg font-semibold mt-4 mb-2" {...props} />,
        h3: (props) => <h3 className="text-base font-semibold mt-3 mb-1" {...props} />,
        p: (props) => <p className="mb-3 text-neutral-700 dark:text-neutral-300" {...props} />,
        ul: (props) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
        ol: (props) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
        a: (props) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
        code: (props) => (
          <code className="rounded bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 text-xs" {...props} />
        ),
        pre: (props) => (
          <pre className="rounded bg-neutral-100 dark:bg-neutral-800 p-3 overflow-x-auto mb-3" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
