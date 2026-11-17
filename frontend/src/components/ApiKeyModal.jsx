import React, { useState } from 'react';
import { X, Key, Sparkles, Check, ShieldAlert, Cpu } from 'lucide-react';

export default function ApiKeyModal({
  isOpen,
  onClose,
  apiKeyConfig,
  onSaveConfig
}) {
  const [provider, setProvider] = useState(apiKeyConfig.provider || 'gemini');
  const [apiKey, setApiKey] = useState(apiKeyConfig.apiKey || '');
  const [modelName, setModelName] = useState(apiKeyConfig.modelName || 'gemini-2.5-flash');

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveConfig({
      provider: apiKey.trim() ? provider : 'smart-local',
      apiKey: apiKey.trim(),
      modelName: modelName.trim(),
      hasKey: !!apiKey.trim()
    });
    onClose();
  };

  const handleClear = () => {
    setApiKey('');
    onSaveConfig({
      provider: 'smart-local',
      apiKey: '',
      modelName: '',
      hasKey: false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D47A1]/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D2E3FC] max-w-md w-full overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFD]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1E293B]">LLM Engine Settings</h2>
              <p className="text-[11px] text-[#5F6368]">Configure Gemini or OpenAI code generation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5F6368] hover:text-[#1E293B] hover:bg-[#E8F0FE] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          {/* Smart Local Banner */}
          <div className="p-3 bg-[#E8F0FE]/70 border border-[#D2E3FC] rounded-xl flex items-start gap-2.5">
            <Cpu className="w-4 h-4 text-[#1A73E8] shrink-0 mt-0.5" />
            <div className="text-xs text-[#1E293B]">
              <span className="font-semibold text-[#1A73E8]">Built-in Smart Engine:</span>
              <p className="text-[#5F6368] mt-0.5 leading-relaxed">
                If no API key is entered, QueryBlue automatically uses its built-in analytical NLP translator. Add an API key below to unlock advanced multi-step reasoning.
              </p>
            </div>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">Select LLM Provider</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setProvider('gemini');
                  setModelName('gemini-2.5-flash');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  provider === 'gemini'
                    ? 'border-[#1A73E8] bg-[#E8F0FE] ring-1 ring-[#1A73E8]'
                    : 'border-[#CBD5E1] hover:border-[#1A73E8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E293B]">Google Gemini</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#1A73E8]" />
                </div>
                <span className="text-[10px] text-[#5F6368] mt-1">Gemini 2.5 Flash</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider('openai');
                  setModelName('gpt-4o-mini');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  provider === 'openai'
                    ? 'border-[#1A73E8] bg-[#E8F0FE] ring-1 ring-[#1A73E8]'
                    : 'border-[#CBD5E1] hover:border-[#1A73E8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E293B]">OpenAI</span>
                  <Key className="w-3.5 h-3.5 text-[#1A73E8]" />
                </div>
                <span className="text-[10px] text-[#5F6368] mt-1">GPT-4o-mini</span>
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              {provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs font-mono focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
              placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'}
            />
            <p className="text-[10px] text-[#5F6368] mt-1">
              Stored only in your local browser session. Never sent anywhere except direct API calls.
            </p>
          </div>

          {/* Model Name Input */}
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">Model Name</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs font-mono focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
              placeholder={provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
            >
              Reset to Local
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 border border-[#CBD5E1] text-[#5F6368] text-xs font-semibold rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
