import React from 'react';
import { ActorType } from '../types/audit.types';

interface AuditActorProps {
  actorType: ActorType;
  actorUserId?: string | null;
  displayName: string;
  roleSnapshot?: string | null;
}

const ACTOR_BADGE_STYLE: Record<ActorType, { bg: string; text: string }> = {
  SUPER_ADMIN: { bg: 'bg-rose-500/15', text: 'text-rose-400' },
  ADMIN: { bg: 'bg-indigo-500/15', text: 'text-indigo-400' },
  USER: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  SYSTEM: { bg: 'bg-slate-500/15', text: 'text-slate-400' },
  CRON: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  WEBHOOK: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  ANONYMOUS: { bg: 'bg-slate-600/15', text: 'text-slate-500' },
};

export const AuditActor: React.FC<AuditActorProps> = ({
  actorType,
  displayName,
  roleSnapshot,
}) => {
  const badge = ACTOR_BADGE_STYLE[actorType] || ACTOR_BADGE_STYLE.SYSTEM;

  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-300">
        {displayName ? displayName.charAt(0).toUpperCase() : 'S'}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-200 leading-none truncate max-w-[150px]">
          {displayName}
        </span>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`text-[10px] font-semibold px-1 rounded ${badge.bg} ${badge.text}`}>
            {actorType}
          </span>
          {roleSnapshot && (
            <span className="text-[10px] text-slate-400 font-mono">({roleSnapshot})</span>
          )}
        </div>
      </div>
    </div>
  );
};
