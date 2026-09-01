import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Server,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FolderTree,
  Terminal,
  ShieldAlert,
} from 'lucide-react';

interface HealthData {
  status: string;
  environment: string;
  uptime: number;
  timestamp: string;
  database: {
    isConnected: boolean;
    state: string;
  };
}

interface HealthResponse {
  success: boolean;
  data: HealthData;
}

export const HomePage: React.FC = () => {
  const {
    data: healthResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<HealthResponse>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await api.get<HealthResponse>('/health');
      return response.data;
    },
    refetchInterval: 15000,
  });

  const health = healthResponse?.data;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950 p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
            <Layers className="w-3.5 h-3.5" />
            <span>ARCHITECTURE & FOUNDATION: MODULE 01</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            E-Commerce Modular Monolith
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Production-grade full-stack foundation built with a unified Express backend, centralized MongoDB persistence, and React + Vite frontend. No microservices or distributed complexity.
          </p>
        </div>
      </div>

      {/* Backend & Database Health Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Backend Status */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Backend Service</span>
              <h3 className="text-lg font-semibold text-white">Express API Core</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Status</span>
              {isLoading ? (
                <span className="text-slate-500 font-mono text-xs">Checking...</span>
              ) : isError ? (
                <span className="inline-flex items-center gap-1 text-rose-400 font-medium text-xs">
                  <AlertCircle className="w-3.5 h-3.5" /> Offline
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {health?.status.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Environment</span>
              <span className="font-mono text-xs text-slate-300">
                {health?.environment || 'development'}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Uptime</span>
              <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {health?.uptime !== undefined ? `${health.uptime}s` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Database Layer</span>
              <h3 className="text-lg font-semibold text-white">MongoDB / Mongoose</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Connection</span>
              {isLoading ? (
                <span className="text-slate-500 font-mono text-xs">Checking...</span>
              ) : health?.database?.isConnected ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> CONNECTED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-xs">
                  <AlertCircle className="w-3.5 h-3.5" /> DISCONNECTED
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">State</span>
              <span className="font-mono text-xs text-slate-300">
                {health?.database?.state || 'unknown'}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Last Synced</span>
              <span className="font-mono text-xs text-slate-400">
                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* API Verification Probe */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Health Probe</span>
              <h3 className="text-lg font-semibold text-white">GET /api/v1/health</h3>
            </div>
            <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
            <div className="text-xs font-mono text-slate-400 truncate">
              Target: <span className="text-slate-300">/api/v1/health</span>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isFetching ? 'Probing...' : 'Re-verify Backend Health'}
            </button>
            {isError && (
              <p className="text-xs text-rose-400">
                {error instanceof Error ? error.message : 'Failed to connect to backend'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Architectural Rules Banner */}
      <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-indigo-900/40 border border-indigo-700/50 text-indigo-400 shrink-0">
            <FolderTree className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-indigo-200">
              Modular Monolith Guiding Principles
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Business areas are encapsulated inside isolated directories under <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300">server/src/modules/</code>. All domain communications execute through in-process TypeScript service calls. No microservices, service meshes, or remote message queues are utilized.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5 text-xs text-slate-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Single Deployable App</span>
              </div>
              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5 text-xs text-slate-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unified Database</span>
              </div>
              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5 text-xs text-slate-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Encapsulated Modules</span>
              </div>
              <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5 text-xs text-slate-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero Microservices</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
