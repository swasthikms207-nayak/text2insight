import React from 'react';
import { Database, Upload, Key, Sparkles, ShieldCheck, ChevronDown, RefreshCw, FileSpreadsheet } from 'lucide-react';

export default function Navbar({
  currentDataset,
  onOpenDatasetModal,
  onOpenKeyModal,
  apiKeyConfig,
  loading
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1A73E8] to-[#4285F4] flex items-center justify-center shadow-sm shadow-[#1A73E8]/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-[#1A73E8] tracking-tight">QueryBlue</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#1A73E8] tracking-wider border border-[#D2E3FC]">
                  AI Analyst
                </span>
              </div>
              <p className="text-xs text-[#5F6368] hidden sm:block">Natural Language Data Intelligence & Sandbox</p>
            </div>
          </div>

          {/* Active Dataset Picker / Pill */}
          <div className="flex items-center space-x-3">
            {currentDataset ? (
              <button
                onClick={onOpenDatasetModal}
                className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-lg border border-[#D2E3FC] bg-[#F8FAFD] hover:bg-[#E8F0FE] text-[#1E293B] transition-colors group cursor-pointer"
                title="Click to view schema or switch dataset"
              >
                <div className="w-2 h-2 rounded-full bg-[#1A73E8] animate-pulse"></div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-[#1A73E8] flex items-center gap-1.5">
                    <span className="truncate max-w-[180px] sm:max-w-[260px]">{currentDataset.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#1A73E8] group-hover:translate-y-0.5 transition-transform" />
                  </div>
                  <div className="text-[10px] text-[#5F6368]">
                    {currentDataset.row_count} rows • {currentDataset.column_count} cols • {currentDataset.source_type.toUpperCase()}
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenDatasetModal}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#E8F0FE] text-[#1A73E8] font-medium text-xs hover:bg-[#D2E3FC] transition-colors"
              >
                <Database className="w-4 h-4" />
                <span>Select Dataset</span>
              </button>
            )}

            {/* Switch / Upload Quick Button */}
            <button
              onClick={onOpenDatasetModal}
              className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:border-[#1A73E8] hover:text-[#1A73E8] text-xs font-medium text-[#1E293B] transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import / Switch</span>
            </button>

            {/* API Key / Provider Button */}
            <button
              onClick={onOpenKeyModal}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                apiKeyConfig.hasKey
                  ? 'bg-[#E8F0FE] border-[#D2E3FC] text-[#1A73E8]'
                  : 'bg-white border-[#E2E8F0] text-[#5F6368] hover:border-[#1A73E8] hover:text-[#1A73E8]'
              }`}
              title="Configure Gemini or OpenAI API Key"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {apiKeyConfig.provider === 'gemini' ? 'Gemini 2.5' : (apiKeyConfig.provider === 'openai' ? 'OpenAI' : 'Local NLP')}
              </span>
              {apiKeyConfig.hasKey && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              )}
            </button>

            {/* Safety status pill */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#F8FAFD] border border-[#E2E8F0] text-[11px] text-[#5F6368]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1A73E8]" />
              <span className="font-medium text-[#1E293B]">Read-Only Sandbox</span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
