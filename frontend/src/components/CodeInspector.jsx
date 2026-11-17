import React, { useState } from 'react';
import { Code2, ShieldCheck, Copy, Check, Play, Edit3, Terminal, AlertTriangle } from 'lucide-react';

export default function CodeInspector({
  code,
  codeType,
  reasoning,
  safety,
  executionTimeMs,
  onRunCustomCode,
  loading
}) {
  const [activeTab, setActiveTab] = useState('code'); // 'code' | 'safety'
  const [isEditing, setIsEditing] = useState(false);
  const [editableCode, setEditableCode] = useState(code || '');
  const [copied, setCopied] = useState(false);

  // Sync code when it changes externally
  React.useEffect(() => {
    setEditableCode(code || '');
    setIsEditing(false);
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCustom = () => {
    if (onRunCustomCode && editableCode.trim()) {
      onRunCustomCode(editableCode, codeType);
    }
  };

  if (!code) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#D2E3FC] shadow-xs overflow-hidden transition-all">
      
      {/* Header bar */}
      <div className="px-5 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFD]">
        
        {/* Left Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'bg-[#1A73E8] text-white'
                : 'text-[#5F6368] hover:text-[#1E293B] bg-white border border-[#E2E8F0]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Generated {codeType?.toUpperCase()}</span>
          </button>

          <button
            onClick={() => setActiveTab('safety')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'safety'
                ? 'bg-[#1A73E8] text-white'
                : 'text-[#5F6368] hover:text-[#1E293B] bg-white border border-[#E2E8F0]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sandbox Verification</span>
            {safety?.passed && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            )}
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'code' && (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  isEditing
                    ? 'bg-[#E8F0FE] text-[#1A73E8] border-[#D2E3FC]'
                    : 'bg-white text-[#5F6368] border-[#CBD5E1] hover:text-[#1E293B]'
                }`}
                title="Edit and re-run query"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Editing' : 'Edit'}</span>
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-[#CBD5E1] hover:border-[#1A73E8] hover:text-[#1A73E8] text-[#5F6368] transition-colors cursor-pointer"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </>
          )}

          {executionTimeMs !== undefined && (
            <span className="text-[11px] font-mono text-[#5F6368] bg-white border border-[#E2E8F0] px-2 py-1 rounded-md">
              {executionTimeMs} ms
            </span>
          )}
        </div>
      </div>

      {/* Reasoning Banner */}
      {reasoning && activeTab === 'code' && (
        <div className="px-5 py-2.5 bg-[#E8F0FE]/50 border-b border-[#D2E3FC]/60 text-xs text-[#1E293B] flex items-start gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#1A73E8] shrink-0 mt-0.5" />
          <p><span className="font-semibold text-[#1A73E8]">Execution Plan:</span> {reasoning}</p>
        </div>
      )}

      {/* TAB 1: CODE EDITOR */}
      {activeTab === 'code' && (
        <div className="p-4 bg-[#0F172A] text-slate-100 font-mono text-xs">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editableCode}
                onChange={(e) => setEditableCode(e.target.value)}
                rows={Math.max(5, editableCode.split('\n').length + 1)}
                className="w-full bg-[#1E293B] text-emerald-300 p-3 rounded-lg border border-slate-700 focus:outline-hidden focus:border-[#1A73E8] font-mono text-xs leading-relaxed"
                spellCheck={false}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditableCode(code || '');
                    setIsEditing(false);
                  }}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans cursor-pointer"
                >
                  Reset
                </button>
                <button
                  onClick={handleRunCustom}
                  disabled={loading}
                  className="px-4 py-1 rounded bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold font-sans flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{loading ? 'Executing...' : 'Run Custom Code'}</span>
                </button>
              </div>
            </div>
          ) : (
            <pre className="overflow-x-auto p-1 leading-relaxed text-blue-200">
              <code>{editableCode}</code>
            </pre>
          )}
        </div>
      )}

      {/* TAB 2: SAFETY AUDIT */}
      {activeTab === 'safety' && (
        <div className="p-5 space-y-4 text-xs">
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Safe Sandbox Validation: Passed</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">{safety?.message}</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[#1E293B] mb-2 uppercase tracking-wider text-[10px] text-[#5F6368]">
              Active Enforcement Rules
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(safety?.rules_applied || [
                'Strict Read-Only Query Enforcement (SELECT / WITH only)',
                'DDL / DML Blocklist (DROP, ALTER, DELETE, etc.)',
                'AST-Checked Python Namespace without os, sys, or subprocess',
                'Zero file system or network socket I/O permissions',
                '5000ms query timeout thread watchdog'
              ]).map((rule, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#F8FAFD] border border-[#E2E8F0] flex items-center gap-2 text-[#334155]"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1A73E8]"></div>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
