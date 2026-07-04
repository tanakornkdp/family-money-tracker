import { HTMLAttributes } from "react";
import clsx from "clsx";

export default function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6",
        className
      )}
      {...props}
    />
  );
}