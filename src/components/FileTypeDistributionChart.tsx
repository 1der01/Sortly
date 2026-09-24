import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import { FileItem } from '../types';
import { determineCategory, CATEGORIES } from '../data/categoriesData';
import { formatBytes } from '../utils/fileHelpers';

interface FileTypeDistributionChartProps {
  files: FileItem[];
  onSelectCategory?: (category: string) => void;
}

type GroupByMode = 'category' | 'extension';
type MetricMode = 'count' | 'size';

interface ChartDataItem {
  name: string;
  count: number;
  bytes: number;
  formattedSize: string;
  percentage: number;
  color: string;
  category: string;
  extensions?: string[];
  icon?: string;
}

function parseSizeToBytes(sizeStr?: string): number {
  if (!sizeStr) return 0;
  const cleaned = sizeStr.trim();
  const match = cleaned.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  if (isNaN(val)) return 0;
  const unit = (match[2] || 'B').toUpperCase();
  const mult: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };
  return val * (mult[unit] || 1);
}

const CATEGORY_COLORS: Record<string, string> = {
  Documents: '#2563eb',
  Images: '#7c3aed',
  Videos: '#e11d48',
  Audio: '#d97706',
  Archives: '#059669',
  Code: '#0891b2',
  Folders: '#ea580c',
  Others: '#4b5563',
};

const EXTENSION_PALETTE = [
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#e11d48',
  '#0891b2',
  '#6366f1',
  '#0d9488',
  '#f97316',
  '#ec4899',
  '#84cc16',
  '#64748b',
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  metric: MetricMode;
  totalFiles: number;
  onSelectCategory?: (category: string) => void;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  metric,
  totalFiles,
  onSelectCategory,
}) => {
  if (!active || !payload || !payload.length) return null;
  const data: ChartDataItem | undefined = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      className="recharts-custom-tooltip"
      style={{
        background: 'var(--surface-container-highest)',
        color: 'var(--on-surface)',
        border: `2px solid ${data.color || 'var(--outline-variant)'}`,
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.28)',
        fontSize: '12px',
        minWidth: '200px',
        maxWidth: '280px',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {/* Category Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '8px',
          borderBottom: '1px solid var(--outline-variant)',
          paddingBottom: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: data.color,
              boxShadow: `0 0 8px ${data.color}80`,
              display: 'inline-block',
            }}
          />
          <strong style={{ fontSize: '13px', color: 'var(--on-surface)' }}>{data.name}</strong>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '10px',
            background: `${data.color}25`,
            color: data.color,
            border: `1px solid ${data.color}50`,
          }}
        >
          {data.percentage.toFixed(1)}%
        </span>
      </div>

      {/* Exact Count - Highlighted */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '4px 0',
        }}
      >
        <span style={{ color: 'var(--on-surface-variant)', fontSize: '12px' }}>Exact File Count:</span>
        <span
          style={{
            fontWeight: 700,
            fontSize: '13px',
            color: 'var(--on-surface)',
            fontFamily: 'monospace',
          }}
        >
          {data.count} {data.count === 1 ? 'file' : 'files'}
        </span>
      </div>

      {/* Percentage Share with visual progress bar */}
      <div style={{ margin: '6px 0 4px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            marginBottom: '3px',
          }}
        >
          <span style={{ color: 'var(--on-surface-variant)' }}>Share of Directory:</span>
          <span style={{ fontWeight: 700, color: data.color }}>
            {data.percentage.toFixed(1)}% ({data.count} of {totalFiles})
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            background: 'var(--surface-container-low)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, data.percentage))}%`,
              height: '100%',
              backgroundColor: data.color,
              borderRadius: '2px',
            }}
          />
        </div>
      </div>

      {/* Total Storage Size */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '5px 0',
        }}
      >
        <span style={{ color: 'var(--on-surface-variant)', fontSize: '12px' }}>Total Storage:</span>
        <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--on-surface)' }}>
          {data.formattedSize}
        </span>
      </div>

      {/* Included File Extensions */}
      {data.extensions && data.extensions.length > 0 && (
        <div
          style={{
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid var(--outline-variant)',
            fontSize: '11px',
          }}
        >
          <div style={{ color: 'var(--on-surface-variant)', marginBottom: '3px' }}>Extensions:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {data.extensions.slice(0, 6).map((ext) => (
              <span
                key={ext}
                style={{
                  background: 'var(--surface-container-low)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  color: 'var(--on-surface)',
                  border: '1px solid var(--outline-variant)',
                }}
              >
                .{ext}
              </span>
            ))}
            {data.extensions.length > 6 && (
              <span style={{ color: 'var(--on-surface-variant)', fontSize: '10px', alignSelf: 'center' }}>
                +{data.extensions.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {onSelectCategory && (
        <div
          style={{
            marginTop: '8px',
            paddingTop: '4px',
            fontSize: '10px',
            color: 'var(--on-surface-variant)',
            fontStyle: 'italic',
            textAlign: 'center',
            opacity: 0.8,
          }}
        >
          Click bar to filter list
        </div>
      )}
    </div>
  );
};

export const FileTypeDistributionChart: React.FC<FileTypeDistributionChartProps> = ({
  files,
  onSelectCategory,
}) => {
  const [groupBy, setGroupBy] = useState<GroupByMode>('category');
  const [metric, setMetric] = useState<MetricMode>('count');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Process data for the chart
  const { chartData, totalBytes, totalFiles, topCategory, topExtension } = useMemo(() => {
    const nonFolderFiles = files.filter((f) => !f.isFolder);
    const countTotal = nonFolderFiles.length;

    let bytesSum = 0;
    const fileBytesMap = new Map<string, number>();

    nonFolderFiles.forEach((f) => {
      const b = f.realFile?.size ?? parseSizeToBytes(f.size);
      bytesSum += b;
      fileBytesMap.set(f.id, b);
    });

    if (groupBy === 'category') {
      const catMap = new Map<string, { count: number; bytes: number; extensions: Set<string> }>();

      // Initialize all recognized categories
      CATEGORIES.forEach((cat) => {
        catMap.set(cat.name, { count: 0, bytes: 0, extensions: new Set() });
      });

      nonFolderFiles.forEach((f) => {
        const cat = f.category || determineCategory(f.name);
        const b = fileBytesMap.get(f.id) || 0;
        const entry = catMap.get(cat) || { count: 0, bytes: 0, extensions: new Set() };
        entry.count += 1;
        entry.bytes += b;
        if (f.extension) {
          entry.extensions.add(f.extension.toLowerCase().replace('.', ''));
        }
        catMap.set(cat, entry);
      });

      const list: ChartDataItem[] = [];
      let maxCount = -1;
      let topCat = 'None';

      catMap.forEach((val, key) => {
        if (val.count > 0) {
          if (val.count > maxCount) {
            maxCount = val.count;
            topCat = key;
          }
          list.push({
            name: key,
            count: val.count,
            bytes: val.bytes,
            formattedSize: formatBytes(val.bytes),
            percentage: countTotal > 0 ? (val.count / countTotal) * 100 : 0,
            color: CATEGORY_COLORS[key] || '#64748b',
            category: key,
            extensions: Array.from(val.extensions),
          });
        }
      });

      // Sort by chosen metric descending
      list.sort((a, b) => (metric === 'count' ? b.count - a.count : b.bytes - a.bytes));

      return {
        chartData: list,
        totalBytes: bytesSum,
        totalFiles: countTotal,
        topCategory: topCat,
        topExtension: '',
      };
    } else {
      // Group by file extension
      const extMap = new Map<string, { count: number; bytes: number; category: string }>();

      nonFolderFiles.forEach((f) => {
        const rawExt = f.extension
          ? f.extension.toLowerCase().replace('.', '')
          : f.name.includes('.')
          ? f.name.split('.').pop()?.toLowerCase() || 'unknown'
          : 'no-ext';
        const displayExt = `.${rawExt}`;
        const b = fileBytesMap.get(f.id) || 0;
        const cat = f.category || determineCategory(f.name);

        const current = extMap.get(displayExt) || { count: 0, bytes: 0, category: cat };
        current.count += 1;
        current.bytes += b;
        extMap.set(displayExt, current);
      });

      const list: ChartDataItem[] = [];
      let maxCount = -1;
      let topExt = 'None';
      let idx = 0;

      extMap.forEach((val, key) => {
        if (val.count > maxCount) {
          maxCount = val.count;
          topExt = key;
        }
        list.push({
          name: key,
          count: val.count,
          bytes: val.bytes,
          formattedSize: formatBytes(val.bytes),
          percentage: countTotal > 0 ? (val.count / countTotal) * 100 : 0,
          color: CATEGORY_COLORS[val.category] || EXTENSION_PALETTE[idx % EXTENSION_PALETTE.length],
          category: val.category,
        });
        idx++;
      });

      // Sort descending
      list.sort((a, b) => (metric === 'count' ? b.count - a.count : b.bytes - a.bytes));

      // Limit to top 10 extensions to keep chart clean if there are many types
      const topItems = list.slice(0, 10);

      return {
        chartData: topItems,
        totalBytes: bytesSum,
        totalFiles: countTotal,
        topCategory: '',
        topExtension: topExt,
      };
    }
  }, [files, groupBy, metric]);

  const yAxisTickFormatter = (value: number) => {
    if (metric === 'count') {
      return `${value}`;
    }
    return formatBytes(value, 0);
  };

  return (
    <section className="md3-card" id="dashboard-file-distribution-card" style={{ marginTop: 'var(--s3)' }}>
      {/* Header and Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: 'var(--s2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '20px' }}>
            bar_chart
          </span>
          <h3 className="card-title" style={{ margin: 0, fontSize: '15px' }}>
            File type distribution
          </h3>
          {totalFiles > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '100px',
                background: 'var(--surface-container-high)',
                color: 'var(--on-surface-variant)',
                fontFamily: 'monospace',
              }}
            >
              {totalFiles} {totalFiles === 1 ? 'file' : 'files'} • {formatBytes(totalBytes)}
            </span>
          )}
        </div>

        {/* View Switches */}
        {totalFiles > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Group By Segment */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                borderRadius: '8px',
                padding: '2px',
              }}
              role="radiogroup"
              aria-label="Group by"
            >
              <button
                id="chart-group-by-category-btn"
                type="button"
                className="btn-text"
                style={{
                  height: '24px',
                  padding: '0 8px',
                  fontSize: '11px',
                  fontWeight: groupBy === 'category' ? 600 : 400,
                  borderRadius: '6px',
                  background: groupBy === 'category' ? 'var(--surface-container-highest)' : 'transparent',
                  color: groupBy === 'category' ? 'var(--primary)' : 'var(--on-surface-variant)',
                }}
                onClick={() => setGroupBy('category')}
              >
                Categories
              </button>
              <button
                id="chart-group-by-extension-btn"
                type="button"
                className="btn-text"
                style={{
                  height: '24px',
                  padding: '0 8px',
                  fontSize: '11px',
                  fontWeight: groupBy === 'extension' ? 600 : 400,
                  borderRadius: '6px',
                  background: groupBy === 'extension' ? 'var(--surface-container-highest)' : 'transparent',
                  color: groupBy === 'extension' ? 'var(--primary)' : 'var(--on-surface-variant)',
                }}
                onClick={() => setGroupBy('extension')}
              >
                Extensions
              </button>
            </div>

            {/* Metric Segment */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                borderRadius: '8px',
                padding: '2px',
              }}
              role="radiogroup"
              aria-label="Metric"
            >
              <button
                id="chart-metric-count-btn"
                type="button"
                className="btn-text"
                style={{
                  height: '24px',
                  padding: '0 8px',
                  fontSize: '11px',
                  fontWeight: metric === 'count' ? 600 : 400,
                  borderRadius: '6px',
                  background: metric === 'count' ? 'var(--surface-container-highest)' : 'transparent',
                  color: metric === 'count' ? 'var(--primary)' : 'var(--on-surface-variant)',
                }}
                onClick={() => setMetric('count')}
              >
                Count
              </button>
              <button
                id="chart-metric-size-btn"
                type="button"
                className="btn-text"
                style={{
                  height: '24px',
                  padding: '0 8px',
                  fontSize: '11px',
                  fontWeight: metric === 'size' ? 600 : 400,
                  borderRadius: '6px',
                  background: metric === 'size' ? 'var(--surface-container-highest)' : 'transparent',
                  color: metric === 'size' ? 'var(--primary)' : 'var(--on-surface-variant)',
                }}
                onClick={() => setMetric('size')}
              >
                Storage
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chart Canvas or Empty State */}
      {totalFiles === 0 ? (
        <div
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: 'var(--on-surface-variant)',
            background: 'var(--surface-container-low)',
            borderRadius: '12px',
            border: '1px dashed var(--outline-variant)',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '32px', opacity: 0.6 }}>
            insert_chart
          </span>
          <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '6px' }}>
            No file data to visualize
          </div>
          <p style={{ fontSize: '12px', margin: '4px 0 0', opacity: 0.8 }}>
            Add files or select a folder to see file type and extension distribution.
          </p>
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
          No printable file distribution available for current filter.
        </div>
      ) : (
        <>
          {/* Recharts BarChart container */}
          <div
            id="file-distribution-chart-wrapper"
            style={{
              width: '100%',
              minHeight: '220px',
              height: '230px',
              marginTop: '4px',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 12, left: -16, bottom: 20 }}
                onMouseMove={(state: any) => {
                  if (state && typeof state.activeTooltipIndex === 'number') {
                    setHoveredIndex(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--outline-variant)"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--outline-variant)', opacity: 0.6 }}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 11 }}
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 10 }}
                  tickFormatter={yAxisTickFormatter}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{
                    fill: 'var(--surface-container-highest)',
                    opacity: 0.35,
                    rx: 6,
                    ry: 6,
                  }}
                  content={(props: any) => (
                    <CustomTooltip
                      {...props}
                      metric={metric}
                      totalFiles={totalFiles}
                      onSelectCategory={onSelectCategory}
                    />
                  )}
                  isAnimationActive={false}
                  wrapperStyle={{ outline: 'none', zIndex: 1000, pointerEvents: 'none' }}
                />
                <Bar
                  dataKey={metric === 'count' ? 'count' : 'bytes'}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={48}
                  animationDuration={300}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {chartData.map((entry, index) => {
                    const isHovered = hoveredIndex === index;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        fillOpacity={hoveredIndex === null || isHovered ? 1 : 0.45}
                        stroke={isHovered ? 'var(--on-surface)' : 'transparent'}
                        strokeWidth={isHovered ? 2 : 0}
                        style={{
                          cursor: onSelectCategory ? 'pointer' : 'default',
                          transition: 'fill-opacity 0.15s ease, stroke 0.15s ease',
                        }}
                        onClick={() => onSelectCategory && onSelectCategory(entry.category)}
                        onMouseEnter={() => setHoveredIndex(index)}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Legend / Breakdown Chips with synchronized hover */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid var(--outline-variant)',
            }}
          >
            {chartData.map((item, index) => {
              const isHovered = hoveredIndex === index;
              return (
                <button
                  key={item.name}
                  type="button"
                  className="btn-text"
                  style={{
                    height: '24px',
                    padding: '0 8px',
                    fontSize: '11px',
                    borderRadius: '12px',
                    background: isHovered
                      ? 'var(--surface-container-highest)'
                      : 'var(--surface-container-low)',
                    border: `1px solid ${isHovered ? item.color : 'var(--outline-variant)'}`,
                    boxShadow: isHovered ? `0 0 6px ${item.color}50` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: onSelectCategory ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => onSelectCategory && onSelectCategory(item.category)}
                  title={
                    onSelectCategory
                      ? `Filter by ${item.name} (${item.count} files, ${item.percentage.toFixed(1)}%)`
                      : `${item.name}: ${item.count} files (${item.percentage.toFixed(1)}%)`
                  }
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 500, color: 'var(--on-surface)' }}>{item.name}</span>
                  <span style={{ color: 'var(--on-surface-variant)', fontSize: '10px' }}>
                    {item.count} ({item.percentage.toFixed(0)}%)
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Insights Footer with live hover inspector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--on-surface-variant)',
              marginTop: '6px',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <div>
              {hoveredIndex !== null && chartData[hoveredIndex] ? (
                <span style={{ color: 'var(--on-surface)' }}>
                  Hovering:{' '}
                  <strong style={{ color: chartData[hoveredIndex].color }}>
                    {chartData[hoveredIndex].name}
                  </strong>{' '}
                  — <strong>{chartData[hoveredIndex].count}</strong>{' '}
                  {chartData[hoveredIndex].count === 1 ? 'file' : 'files'} (
                  <strong>{chartData[hoveredIndex].percentage.toFixed(1)}%</strong> of directory) •{' '}
                  {chartData[hoveredIndex].formattedSize}
                </span>
              ) : groupBy === 'category' && topCategory ? (
                <span>
                  Primary category: <strong>{topCategory}</strong>
                </span>
              ) : groupBy === 'extension' && topExtension ? (
                <span>
                  Most common extension: <strong>{topExtension}</strong>
                </span>
              ) : null}
            </div>
            <div>
              Total: <strong>{totalFiles} items</strong> ({formatBytes(totalBytes)})
            </div>
          </div>
        </>
      )}
    </section>
  );
};
