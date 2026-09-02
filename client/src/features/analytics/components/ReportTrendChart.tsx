import React, { useState } from 'react';
import { SalesTrendPoint } from '../types/analytics.types';

interface ReportTrendChartProps {
  title?: string;
  data: SalesTrendPoint[];
  metric?: 'revenue' | 'orders' | 'items';
}

export const ReportTrendChart: React.FC<ReportTrendChartProps> = ({
  title = 'Performance Trend',
  data,
  metric: initialMetric = 'revenue',
}) => {
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'orders' | 'items'>(initialMetric);
  const [hoveredPoint, setHoveredPoint] = useState<{ point: SalesTrendPoint; x: number; y: number } | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-sm">
        No timeseries trend data available for the selected period.
      </div>
    );
  }

  const getValue = (p: SalesTrendPoint) => {
    switch (activeMetric) {
      case 'revenue':
        return p.grossRevenue / 100;
      case 'orders':
        return p.orderCount;
      case 'items':
        return p.itemsSold;
    }
  };

  const getFormat = (val: number) => {
    if (activeMetric === 'revenue') return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return val.toLocaleString();
  };

  const values = data.map(getValue);
  const maxValue = Math.max(...values, 10);
  const chartHeight = 220;
  const chartWidth = 800;
  const paddingX = 40;
  const paddingY = 30;

  const widthPerPoint = (chartWidth - paddingX * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = paddingX + i * widthPerPoint;
    const y = chartHeight - paddingY - (getValue(d) / maxValue) * (chartHeight - paddingY * 2);
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Timeseries data breakdown across selected timeline
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMetric('revenue')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeMetric === 'revenue'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Gross Revenue
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('orders')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeMetric === 'orders'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Orders
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('items')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeMetric === 'items'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Items Sold
          </button>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-56 min-w-[500px] overflow-visible"
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {getFormat(maxValue * ratio)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#trendGradient)" />

          {/* Line Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#818cf8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots */}
          {points.map((p, idx) => (
            <g
              key={idx}
              onMouseEnter={() => setHoveredPoint({ point: p.data, x: p.x, y: p.y })}
              onMouseLeave={() => setHoveredPoint(null)}
              className="cursor-pointer"
            >
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#4f46e5"
                stroke="#c7d2fe"
                strokeWidth="2"
                className="transition-transform hover:scale-150"
              />
              {/* Bottom Label (skip sparse) */}
              {(points.length <= 15 || idx % Math.ceil(points.length / 10) === 0) && (
                <text
                  x={p.x}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                >
                  {p.data.period}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute bg-slate-950 border border-slate-700 text-white rounded-xl p-3 shadow-2xl text-xs z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
            style={{ left: `${(hoveredPoint.x / chartWidth) * 100}%`, top: `${(hoveredPoint.y / chartHeight) * 100}%` }}
          >
            <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1.5">
              {hoveredPoint.point.period}
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Gross Revenue:</span>
                <span className="text-indigo-300 font-bold">${(hoveredPoint.point.grossRevenue / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Net Revenue:</span>
                <span className="text-emerald-400 font-bold">${(hoveredPoint.point.netRevenue / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Orders:</span>
                <span className="text-slate-200">{hoveredPoint.point.orderCount}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Items Sold:</span>
                <span className="text-slate-200">{hoveredPoint.point.itemsSold}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
