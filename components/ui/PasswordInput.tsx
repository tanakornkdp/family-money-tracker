"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input from "./Input";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  showLabel: string;
  hideLabel: string;
}

export default function PasswordInput({ label, showLabel, hideLabel, id, disabled, ...props }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} id={inputId} label={label} disabled={disabled} type={visible ? "text" : "password"}
        className="min-h-12 w-full pr-12 text-base" />
      <button type="button" disabled={disabled} onClick={() => setVisible(value => !value)}
        aria-label={visible ? hideLabel : showLabel} aria-pressed={visible} aria-controls={inputId}
        className="absolute bottom-0 right-0 flex h-12 w-12 items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100">
        {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </div>
  );
}
