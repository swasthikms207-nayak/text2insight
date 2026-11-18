import React from 'react';
import { Sparkles, TrendingUp, Lightbulb, CheckCircle2 } from 'lucide-react';

export default function InsightCard({ insight, executionTimeMs }) {
  if (!insight) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#D2E3FC] p-5 shadow-xs transition-all relative overflow-hidden">
      {/* Decorative top blue line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1A73E8] via-[#4285F4] to-[#8AB4F8]"></div>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A73E8]">
                Executive Analytical Insight
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#1E293B]">
                {insight.headline || 'Key Takeaways & Summary'}
              </h3>
            </div>
          </div>

          {executionTimeMs !== undefined && (
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#F8FAFD] border border-[#E2E8F0] text-[#5F6368]">
              ⚡ {executionTimeMs} ms
            </span>
          )}
        </div>

        {/* Summary text */}
        <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
          {insight.summary}
        </p>

        {/* Key Metrics Cards */}
        {insight.key_metrics && insight.key_metrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {insight.key_metrics.map((metric, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#F8FAFD] border border-[#D2E3FC]/60 flex flex-col justify-between"
              >
                <span className="text-[10px] font-semibold text-[#5F6368] uppercase tracking-wider">
                  {metric.label}
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-base sm:text-lg font-bold text-[#1A73E8]">
                    {metric.value}
                  </span>
                  {metric.badge && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#E8F0FE] text-[#1A73E8]">
                      {metric.badge}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Takeaways bullet points */}
        {insight.takeaways && insight.takeaways.length > 0 && (
          <div className="pt-2 border-t border-[#E2E8F0]/70">
            <div className="space-y-1.5">
              {insight.takeaways.map((takeaway, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-[#334155]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1A73E8] shrink-0 mt-0.5" />
                  <span>{takeaway}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
