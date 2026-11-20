export default function ChartSkeleton({ height }: { height: number }) {
  return <div aria-hidden="true" className="rounded-xl bg-slate-100 dark:bg-slate-800" style={{ height }} />;
}
