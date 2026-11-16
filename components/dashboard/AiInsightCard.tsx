"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface AiAnalysis {
  summary: string;
  insights: string[];
  warnings: string[];
  tips: string[];
  score: number;
}

interface KpiData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

export default function AiInsightCard({
  kpis,
  topCategories,
  period,
}: {
  kpis: KpiData;
  topCategories: CategoryData[];
  period: string;
}) {
  const { t } = useLanguage();
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kpis, topCategories, period }),
      });

      if (!res.ok) throw new Error("Failed to analyze");
      const data = await res.json();
      setAnalysis(data);
    } catch {
      setError(t.aiAnalysis.errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor =
    !analysis ? "text-slate-400" :
    analysis.score >= 75 ? "text-emerald-500" :
    analysis.score >= 50 ? "text-amber-500" :
    "text-rose-500";

  const scoreLabel =
    !analysis ? "" :
    analysis.score >= 75 ? t.aiAnalysis.excellentScore :
    analysis.score >= 50 ? t.aiAnalysis.mediumScore :
    t.aiAnalysis.lowScore;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800/80 dark:to-indigo-950/40 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500 text-white rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t.aiAnalysis.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">powered by Gemini</p>
          </div>
        </div>

        {analysis && (
          <div className="text-center">
            <p className={`text-3xl font-black ${scoreColor}`}>{analysis.score}</p>
            <p className={`text-[10px] font-semibold ${scoreColor}`}>{scoreLabel}</p>
          </div>
        )}
      </div>

      {!analysis && !loading && (
        <div className="text-center py-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {t.aiAnalysis.description}
          </p>
          <button
            onClick={handleAnalyze}
            className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 mx-auto"
          >
            <Sparkles className="w-4 h-4" />
            {t.aiAnalysis.analyzeNow}
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.aiAnalysis.analyzing}</p>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="text-sm text-rose-500 mb-3">{error}</p>
          <button onClick={handleAnalyze} className="text-xs text-indigo-500 hover:underline flex items-center gap-1 mx-auto">
            <RefreshCw className="w-3 h-3" /> {t.aiAnalysis.retry}
          </button>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="bg-white/60 dark:bg-slate-900/40 rounded-xl p-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {analysis.summary}
            </p>
          </div>

          {analysis.warnings.length > 0 && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">{t.aiAnalysis.warningTitle}</p>
              </div>
              <ul className="space-y-1">
                {analysis.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-rose-700 dark:text-rose-300">• {w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/60 dark:bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">{t.aiAnalysis.insightTitle}</p>
              </div>
              <ul className="space-y-1.5">
                {analysis.insights.map((insight, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-400">• {insight}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-white/60 dark:bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">{t.aiAnalysis.tipTitle}</p>
              </div>
              <ul className="space-y-1.5">
                {analysis.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-400">• {tip}</li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            className="w-full py-2 text-xs text-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw className="w-3 h-3" /> {t.aiAnalysis.reanalyze}
          </button>
        </div>
      )}
    </div>
  );
}