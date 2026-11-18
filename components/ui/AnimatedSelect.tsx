"use client";
import { useId, useRef, useState, type SelectHTMLAttributes } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useFieldPopover } from "./useFieldPopover";

export default function AnimatedSelect({ children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const native = useRef<HTMLSelectElement>(null);
  const [selected, setSelected] = useState(String(props.value ?? props.defaultValue ?? ""));
  const [options, setOptions] = useState<{ value: string; label: string; disabled: boolean }[]>([]);
  const [caption, setCaption] = useState("");
  const { anchor, panel, open, close, toggle } = useFieldPopover();
  const id = useId();
  return <span className="relative block min-w-0">
    <select {...props} id={undefined} ref={native} className="sr-only" tabIndex={-1} aria-hidden="true" onInvalid={() => anchor.current?.focus()} onChange={event => { setSelected(event.target.value); setCaption(event.target.selectedOptions[0]?.text ?? ""); props.onChange?.(event); }}>{children}</select>
    <button type="button" id={props.id} ref={anchor} disabled={props.disabled} aria-label={props["aria-label"]} aria-labelledby={props["aria-labelledby"]} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      className={(className ?? "field-control") + " flex w-full min-w-0 items-center justify-between gap-2 text-left disabled:opacity-50"}
      onClick={() => { const select = native.current; if (!select) return; setOptions(Array.from(select.options).map(option => ({ value: option.value, label: option.text, disabled: option.disabled || (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled) }))); setSelected(select.value); setCaption(select.selectedOptions[0]?.text ?? ""); toggle(); }}>
      <span className="min-w-0 flex-1 truncate"><SelectCaption value={props.value ?? selected} fallback={caption}>{children}</SelectCaption></span>
      <ChevronDown size={18} aria-hidden="true" className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div ref={panel} popover="manual" id={id} role="listbox" className="field-popover" onKeyDown={event => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')); const i = items.indexOf(document.activeElement as HTMLButtonElement);
      items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (i + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length]?.focus();
    }}>{options.map(option => <button type="button" role="option" key={option.value} aria-selected={option.value === String(props.value ?? selected)} disabled={option.disabled} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-mobile-surface-muted focus-visible:outline-2 focus-visible:outline-primary-600 aria-selected:bg-mobile-surface-muted disabled:opacity-40" onClick={() => { if (native.current) { native.current.value = option.value; native.current.dispatchEvent(new Event("change", { bubbles: true })); } close(); }}><span className="min-w-0 flex-1 break-words">{option.label}</span>{option.value === String(props.value ?? selected) && <Check size={16} className="shrink-0 text-primary-600" />}</button>)}</div>}
  </span>;
}

import { Children, isValidElement, type ReactNode } from "react";
function SelectCaption({ children, value, fallback }: { children: ReactNode; value: unknown; fallback: string }) {
  const choices: { value: unknown; label: ReactNode }[] = [];
  const visit = (nodes: ReactNode) => Children.forEach(nodes, child => {
    if (!isValidElement<{ value?: unknown; children?: ReactNode }>(child)) return;
    if (child.type === "option") choices.push({ value: child.props.value, label: child.props.children });
    else if (child.props.children) visit(child.props.children);
  });
  visit(children);
  return <>{choices.find(option => String(option.value) === String(value))?.label ?? (fallback || choices[0]?.label)}</>;
}
