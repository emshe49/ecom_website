import React from 'react';

interface AuditChangeTableProps {
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  changedFields: string[] | null;
}

export const AuditChangeTable: React.FC<AuditChangeTableProps> = ({
  before,
  after,
  changedFields,
}) => {
  if (!before && !after) {
    return (
      <div className="p-4 text-xs text-slate-500 italic bg-slate-900/40 rounded-lg border border-slate-800/80">
        No state changes recorded for this action.
      </div>
    );
  }

  // Aggregate all keys from before and after
  const allKeys = Array.from(
    new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  ).sort();

  const isFieldChanged = (key: string): boolean => {
    if (changedFields && changedFields.includes(key)) return true;
    const bVal = before ? JSON.stringify(before[key]) : undefined;
    const aVal = after ? JSON.stringify(after[key]) : undefined;
    return bVal !== aVal;
  };

  const formatValue = (val: any) => {
    if (val === undefined) return <span className="text-slate-600 italic">None</span>;
    if (val === null) return <span className="text-slate-500 italic">null</span>;
    if (typeof val === 'boolean') {
      return (
        <span className={val ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
          {String(val)}
        </span>
      );
    }
    if (typeof val === 'object') {
      return (
        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all text-slate-300 max-h-32 overflow-y-auto">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return <span className="font-mono text-slate-300 break-all">{String(val)}</span>;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
          <tr>
            <th className="py-2.5 px-3 w-1/4">Field</th>
            <th className="py-2.5 px-3 w-3/8 text-rose-400/90">Previous State (Before)</th>
            <th className="py-2.5 px-3 w-3/8 text-emerald-400/90">New State (After)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {allKeys.map((key) => {
            const changed = isFieldChanged(key);
            const bVal = before ? before[key] : undefined;
            const aVal = after ? after[key] : undefined;

            return (
              <tr
                key={key}
                className={changed ? 'bg-indigo-950/20 hover:bg-indigo-950/30' : 'hover:bg-slate-800/30'}
              >
                <td className="py-2 px-3 font-mono font-medium text-slate-300">
                  <div className="flex items-center gap-1.5">
                    {changed && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" title="Modified field" />
                    )}
                    <span>{key}</span>
                  </div>
                </td>
                <td className="py-2 px-3 bg-rose-950/10 border-r border-slate-800/40">
                  {formatValue(bVal)}
                </td>
                <td className="py-2 px-3 bg-emerald-950/10">
                  {formatValue(aVal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
