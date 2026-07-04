"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";
import Portal from "./Portal";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm px-4 transition-all duration-300">
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />
        
        <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-800 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  );
}
