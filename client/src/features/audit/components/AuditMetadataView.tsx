import React, { useState } from 'react';

interface AuditMetadataViewProps {
  metadata: Record<string, any> | null;
  title?: string;
}

export const AuditMetadataView: React.FC<AuditMetadataViewProps> = ({
  metadata,
  title = 'Metadata & Diagnostics',
}) => {
  const [copied, setCopied] = useState(false);

  if (!metadata || Object.keys(metadata).length === 0) {
    return (
      <div className="p-4 text-xs text-slate-500 italic bg-slate-900/40 rounded-lg border border-slate-800/80">
        No custom metadata or diagnostic payload attached to this event.
      </div>
    );
  }

  const jsonString = JSON.stringify(metadata, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800 text-xs font-semibold text-slate-400">
        <span>{title}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
      <pre className="p-3 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-72 overflow-y-auto">
        {jsonString}
      </pre>
    </div>
  );
};
