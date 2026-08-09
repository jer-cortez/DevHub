export default function RepoSparkline({ data }: { data: number[] }) {
  if (data.length < 2 || data.every((v) => v === 0)) {
    return <div className="w-20 h-6 shrink-0" />;
  }

  const width = 80;
  const height = 24;
  const max = Math.max(...data);
  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (value / max) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 text-emerald-500 dark:text-emerald-400"
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
