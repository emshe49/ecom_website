import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { auditApi } from '../api/audit.api';
import { AuditLogDetail, AuditVerificationResult } from '../types/audit.types';
import { AuditEventBadge } from '../components/AuditEventBadge';
import { AuditOutcomeBadge } from '../components/AuditOutcomeBadge';
import { AuditActor } from '../components/AuditActor';
import { AuditChangeTable } from '../components/AuditChangeTable';
import { AuditMetadataView } from '../components/AuditMetadataView';

export const AuditLogDetailsPage: React.FC = () => {
  const { auditLogId } = useParams<{ auditLogId: string }>();

  const [record, setRecord] = useState<AuditLogDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [verifying, setVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResult | null>(null);

  const fetchRecord = useCallback(async () => {
    if (!auditLogId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await auditApi.getAuditLogById(auditLogId);
      setRecord(data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load audit record.');
    } finally {
      setLoading(false);
    }
  }, [auditLogId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleVerify = async () => {
    if (!auditLogId) return;
    try {
      setVerifying(true);
      const res = await auditApi.verifyAuditLog(auditLogId);
      setVerificationResult(res);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Verification check failed.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="inline-flex items-center gap-2">
          <svg className="animate-spin w-5 h-5 text-indigo-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading audit log details...</span>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Link to="/admin/audit" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
          ← Back to Audit Logs
        </Link>
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
          <h2 className="font-semibold text-lg">Unable to Load Audit Record</h2>
          <p className="text-sm mt-1">{error || 'Record not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/audit"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Audit Trail</span>
        </Link>

        <span className="text-xs font-mono text-slate-500">ID: {record.id}</span>
      </div>

      {/* Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <AuditEventBadge category={record.category} eventType={record.eventType} />
              <span className="text-xs text-slate-400 font-mono">[{record.action}]</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {record.eventType}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <AuditOutcomeBadge outcome={record.outcome} failureCode={record.failureCode} />
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              {new Date(record.createdAt).toUTCString()}
            </span>
          </div>
        </div>

        {/* Primary Meta Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Actor Box */}
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Actor Identity
            </span>
            <AuditActor
              actorType={record.actorType}
              displayName={record.actorDisplayName}
              roleSnapshot={record.actorRoleSnapshot}
            />
            {record.actorUserId && (
              <div className="text-[10px] font-mono text-slate-500 truncate">
                User ID: {record.actorUserId}
              </div>
            )}
          </div>

          {/* Target Box */}
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Target Resource
            </span>
            <div className="space-y-1">
              <div className="font-medium text-slate-200 truncate">
                {record.targetDisplay || 'None / Not Applicable'}
              </div>
              {record.targetType && (
                <div className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {record.targetType}
                </div>
              )}
              {record.targetId && (
                <div className="text-[10px] font-mono text-slate-500 truncate">
                  Target ID: {record.targetId}
                </div>
              )}
            </div>
          </div>

          {/* Network & HTTP Context */}
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Request & Network
            </span>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-500">Method & Route:</span>
              <span className="font-mono text-[11px]">
                {record.httpMethod || '—'} {record.route || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-500">IP Address:</span>
              <span className="font-mono text-[11px]">{record.ipAddress || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-500">Request ID:</span>
              <span className="font-mono text-[10px] text-indigo-400 truncate max-w-[120px]" title={record.requestId || ''}>
                {record.requestId || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* User Agent */}
        {record.userAgent && (
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-2">
            <span className="text-slate-500 font-semibold shrink-0">User Agent:</span>
            <span className="font-mono truncate">{record.userAgent}</span>
          </div>
        )}
      </div>

      {/* Cryptographic Hash Chain Integrity Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Cryptographic Hash Chain Integrity</h2>
              <p className="text-[11px] text-slate-400">
                SHA-256 canonical digest linked to previous audit entry.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shadow-sm"
          >
            {verifying ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Verifying Hash...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Verify Integrity</span>
              </>
            )}
          </button>
        </div>

        {/* Verification Alert Banner */}
        {verificationResult && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              verificationResult.verified
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <span className="font-bold">
              {verificationResult.verified ? '✓ Verification Succeeded:' : '⚠ Verification Failed:'}
            </span>
            <span>
              {verificationResult.verified
                ? 'Record SHA-256 digest is cryptographically intact and unmodified.'
                : 'Hash mismatch detected! Record data or hash chain has been altered.'}
            </span>
          </div>
        )}

        {/* Hash Details */}
        <div className="space-y-2 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Record SHA-256 Hash</span>
            <span className="text-indigo-300 break-all">{record.recordHash}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Previous Record Hash</span>
            <span className="text-slate-400 break-all">{record.previousHash}</span>
          </div>
        </div>
      </div>

      {/* State Changes Diff Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
        <div className="border-b border-slate-800/80 pb-2.5">
          <h2 className="text-sm font-bold text-white tracking-tight">State Mutation Diff</h2>
          <p className="text-[11px] text-slate-400">
            Comparative state before and after action execution.
          </p>
        </div>
        <AuditChangeTable
          before={record.before}
          after={record.after}
          changedFields={record.changedFields}
        />
      </div>

      {/* Metadata & Diagnostics Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
        <div className="border-b border-slate-800/80 pb-2.5">
          <h2 className="text-sm font-bold text-white tracking-tight">Metadata & Diagnostics</h2>
          <p className="text-[11px] text-slate-400">
            Sanitized operational metadata recorded with this event.
          </p>
        </div>
        <AuditMetadataView metadata={record.metadata} />
      </div>
    </div>
  );
};
