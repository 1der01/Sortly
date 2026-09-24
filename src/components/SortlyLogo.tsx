import React from 'react';

interface SortlyLogoProps {
  className?: string;
  size?: number;
  showTagline?: boolean;
  variant?: 'mark' | 'horizontal' | 'stacked';
}

export const SortlyLogo: React.FC<SortlyLogoProps> = ({
  className = '',
  size = 32,
  showTagline = true,
  variant = 'horizontal',
}) => {
  // A folder combined with a downward sorting arrow
  const icon = (
    <div
      className="relative flex items-center justify-center shrink-0 rounded-xl bg-blue-600 text-white shadow-xs transition-transform group-hover:scale-105"
      style={{ width: size, height: size }}
      aria-label="Sortly Logo"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[58%] h-[58%] text-white"
      >
        {/* Simple clean folder silhouette */}
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.4.6L11.5 7H18.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />
        {/* Sorting arrow entering/sorting inside folder */}
        <path d="M12 10.5v6" strokeWidth="2.2" />
        <path d="m9.75 14.5 2.25 2.25 2.25-2.25" strokeWidth="2.2" />
      </svg>
    </div>
  );

  if (variant === 'mark') {
    return <div className={`inline-flex items-center ${className}`}>{icon}</div>;
  }

  if (variant === 'stacked') {
    return (
      <div className={`inline-flex flex-col items-center text-center gap-2 ${className}`}>
        {icon}
        <div>
          <span className="text-xl font-bold tracking-tight text-slate-900 block font-sans">
            Sortly
          </span>
          {showTagline && (
            <span className="text-xs text-slate-500 font-normal tracking-normal mt-0.5 block">
              Organize your files automatically.
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {icon}
      <div className="flex flex-col select-none">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-900 tracking-tight leading-none font-sans">
            Sortly
          </span>
          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
            Simple • Reliable
          </span>
        </div>
        {showTagline && (
          <span className="text-xs text-slate-500 font-normal tracking-normal mt-1 leading-none">
            Organize your files automatically.
          </span>
        )}
      </div>
    </div>
  );
};
