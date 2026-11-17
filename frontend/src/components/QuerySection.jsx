import React, { useState } from 'react';
import { Search, Sparkles, Code2, Play, Terminal, HelpCircle, ArrowRight } from 'lucide-react';

export default function QuerySection({
  question,
  setQuestion,
  mode,
  setMode,
  onSubmit,
  loading,
  suggestedQuestions,
  currentDataset
}) {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (question.trim() && !loading) {
      onSubmit(question);
    }
  };

  const handleChipClick = (q) => {
    setQuestion(q);
    onSubmit(q);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#D2E3FC] p-4 sm:p-5 shadow-xs transition-all">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        
        {/* Top Control Bar: Mode Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 text-[#5F6368] font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>Ask anything in natural language:</span>
          </div>

          <div className="flex items-center bg-[#F8FAFD] border border-[#E2E8F0] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('auto')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                mode === 'auto'
                  ? 'bg-white text-[#1A73E8] shadow-2xs'
                  : 'text-[#5F6368] hover:text-[#1E293B]'
              }`}
            >
              Auto Detect
            </button>
            <button
              type="button"
              onClick={() => setMode('sql')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                mode === 'sql'
                  ? 'bg-[#1A73E8] text-white shadow-2xs'
                  : 'text-[#5F6368] hover:text-[#1E293B]'
              }`}
            >
              SQL (DuckDB)
            </button>
            <button
              type="button"
              onClick={() => setMode('pandas')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                mode === 'pandas'
                  ? 'bg-[#1A73E8] text-white shadow-2xs'
                  : 'text-[#5F6368] hover:text-[#1E293B]'
              }`}
            >
              Pandas Code
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div
          className={`flex items-center border rounded-xl px-3.5 py-2.5 transition-all bg-white shadow-2xs ${
            isFocused
              ? 'border-[#1A73E8] ring-2 ring-[#1A73E8]/15 shadow-sm'
              : 'border-[#CBD5E1] hover:border-[#8AB4F8]'
          }`}
        >
          <Search className="w-5 h-5 text-[#1A73E8] shrink-0 mr-2.5" />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              currentDataset
                ? `e.g. "What is the total revenue by ${currentDataset.columns[1]?.name || 'category'}?" or "Top 5 records by spend"`
                : "Ask a question about the active dataset..."
            }
            className="w-full text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-hidden bg-transparent"
            disabled={loading}
          />
          
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className={`ml-2 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
              loading || !question.trim()
                ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-xs shadow-[#1A73E8]/30 active:scale-98'
            }`}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Query</span>
              </>
            )}
          </button>
        </div>

        {/* Suggested Starter Chips */}
        {suggestedQuestions && suggestedQuestions.length > 0 && (
          <div className="pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-[#5F6368] mb-1.5">
              <Sparkles className="w-3 h-3 text-[#1A73E8]" />
              <span>Suggested questions for this dataset:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(q)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg text-xs bg-[#F8FAFD] hover:bg-[#E8F0FE] text-[#1E293B] hover:text-[#1A73E8] border border-[#E2E8F0] hover:border-[#D2E3FC] transition-colors cursor-pointer text-left flex items-center gap-1.5 group"
                >
                  <span className="truncate max-w-[280px] sm:max-w-[400px]">{q}</span>
                  <ArrowRight className="w-3 h-3 text-[#1A73E8] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

      </form>
    </div>
  );
}
