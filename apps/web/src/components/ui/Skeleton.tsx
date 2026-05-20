interface SkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
  rounded?: string;
}

function SkeletonLine({ height = 'h-4', rounded = 'rounded', className = '' }: Omit<SkeletonProps, 'lines'>) {
  return (
    <div
      className={`animate-pulse bg-neutral-200 ${height} ${rounded} ${className}`}
    />
  );
}

export function Skeleton({ className = '', lines, height = 'h-4', rounded = 'rounded' }: SkeletonProps) {
  if (lines) {
    return (
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine
            key={i}
            height={height}
            rounded={rounded}
            className={i === lines - 1 ? 'w-3/4' : className || 'w-full'}
          />
        ))}
      </div>
    );
  }

  return <SkeletonLine height={height} rounded={rounded} className={className} />;
}
