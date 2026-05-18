// src/components/dashboard/ChartCard.tsx
import React from 'react';
import { motion } from 'framer-motion';

export interface ChartData {
  x: string[];
  y: number[];
  y2?: number[]; // Optionnel : pour une deuxième courbe/série (ex: Sales vs Revenue)
  z: { slug: 'line' | 'bar'; title: string };
}

interface ChartCardProps {
  data: ChartData;
  subtitle?: string;
  extraInfo?: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ data, subtitle, extraInfo }) => {
  const { x, y, y2, z } = data;
  const maxVal = Math.max(...y, ...(y2 || []), 100);
  const padding = 40;
  const width = 500;
  const height = 200;

  // Génération des coordonnées pour le mode "line"
  const generatePoints = (values: number[]) => {
    return values.map((val, i) => {
      const rx = padding + (i / (values.length - 1)) * (width - padding * 2);
      const ry = height - padding - (val / maxVal) * (height - padding * 2);
      return { x: rx, y: ry };
    });
  };

  const points1 = generatePoints(y);
  const points2 = y2 ? generatePoints(y2) : [];

  const createPath = (pts: { x: number; y: number }[]) =>
    pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

  const createClosedPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return `${createPath(pts)} L ${pts[pts.length - 1].x} ${height - padding} L ${pts[0].x} ${height - padding} Z`;
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex-1 min-w-[320px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{z.title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <select className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer">
          <option>Weekly</option>
          <option>Monthly</option>
        </select>
      </div>

      <div className="relative w-full overflow-hidden h-[220px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
            </linearGradient>
            <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0"/>
            </linearGradient>
          </defs>

          {/* Lignes de guide d'arrière-plan */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1={padding}
              y1={padding + ratio * (height - padding * 2)}
              x2={width - padding}
              y2={padding + ratio * (height - padding * 2)}
              stroke="#f1f5f9"
              strokeDasharray="4 4"
            />
          ))}

          {/* Rendu graphique LINÉAIRE */}
          {z.slug === 'line' && (
            <>
              {/* Surface 1 */}
              <motion.path
                d={createClosedPath(points1)}
                fill="url(#grad1)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
              {/* Ligne 1 */}
              <motion.path
                d={createPath(points1)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
              {/* Ligne et Surface 2 optionnelle */}
              {y2 && (
                <>
                  <motion.path d={createClosedPath(points2)} fill="url(#grad2)" opacity={0.7} />
                  <motion.path
                    d={createPath(points2)}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </>
              )}
            </>
          )}

          {/* Rendu graphique EN BARRES */}
          {z.slug === 'bar' &&
            points1.map((pt, i) => {
              const barWidth = y2 ? 10 : 16;
              const barHeight = height - padding - pt.y;
              return (
                <g key={i}>
                  <motion.rect
                    x={pt.x - barWidth / 2}
                    y={pt.y}
                    width={barWidth}
                    height={barHeight}
                    fill="#3b82f6"
                    rx={4}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    className="origin-bottom"
                    transition={{ delay: i * 0.03 }}
                  />
                  {y2 && points2[i] && (
                    <motion.rect
                      x={pt.x + barWidth / 2 + 2}
                      y={points2[i].y}
                      width={barWidth}
                      height={height - padding - points2[i].y}
                      fill="#06b6d4"
                      rx={4}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      className="origin-bottom"
                      transition={{ delay: i * 0.03 + 0.1 }}
                    />
                  )}
                </g>
              );
            })}

          {/* Axe X text */}
          {x.map((label, i) => {
            const labelX = padding + (i / (x.length - 1)) * (width - padding * 2);
            return (
              <text
                key={i}
                x={labelX}
                y={height - 12}
                textAnchor="middle"
                className="text-[10px] fill-slate-400 font-medium"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
      {extraInfo && <div className="mt-4 pt-4 border-t border-slate-50">{extraInfo}</div>}
    </div>
  );
};