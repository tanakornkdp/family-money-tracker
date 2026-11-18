"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export default function Accordion({ title, children, defaultOpen = false, className = "", triggerClassName = "", label }: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  triggerClassName?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return <div className={"slide-accordion " + className} data-open={open}>
    <button type="button" aria-label={label} aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(value => !value)}
      className={"slide-accordion-trigger flex min-h-10 w-full items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-primary-600 " + triggerClassName}>
      <span className="min-w-0 flex-1">{title}</span>
      <ChevronDown size={18} aria-hidden="true" className="slide-accordion-chevron shrink-0 text-mobile-muted" />
    </button>
    <div className="slide-accordion-divider" aria-hidden="true" />
    <div id={id} className="slide-accordion-grid" inert={!open} aria-hidden={!open}>
      <div className="slide-accordion-clip">
        <div className="slide-accordion-content">{children}</div>
      </div>
    </div>
  </div>;
}
