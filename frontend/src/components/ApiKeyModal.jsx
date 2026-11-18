import React, { useState } from 'react';
import { X, Key, Sparkles, Check, ShieldAlert, Cpu, Zap, Code2, HardDrive, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ApiKeyModal({
  isOpen,
  onClose,
  apiKeyConfig,
  onSaveConfig
}) {
  const [provider, setProvider] = useState(() => {
    if (apiKeyConfig.provider === 'openai' || apiKeyConfig.provider === 'qwen') return 'groq';
    return apiKeyConfig.provider || 'gemini';
  });
  
  const [apiKey, setApiKey] = useState(apiKeyConfig.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(apiKeyConfig.baseUrl || 'http://localhost:11434/v1');
  const [modelName, setModelName] = useState(() => {
    if (apiKeyConfig.modelName === 'gpt-4o-mini' || apiKeyConfig.modelName === 'llama-3.3-70b-versatile') {
      return 'openai/gpt-oss-120b';
    }
    if (apiKeyConfig.modelName === 'gemini-2.5-flash') {
      return 'gemini-3.8-flash';
    }
    return apiKeyConfig.modelName || 'gemini-3.8-flash';
  });

  // Local Ollama test status
  const [testingOllama, setTestingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState(null);

  if (!isOpen) return null;

  const getDefaultModel = (prov) => {
    if (prov === 'gemini') return 'gemini-3.8-flash';
    if (prov === 'groq') return 'openai/gpt-oss-120b';
    if (prov === 'local_ollama') return 'text2insight-qwen';
    return 'gemini-3.8-flash';
  };

  const handleSelectProvider = (prov) => {
    setProvider(prov);
    setModelName(getDefaultModel(prov));
    setOllamaStatus(null);
  };

  const handleApiKeyChange = (val) => {
    setApiKey(val);
  };

  const handleTestOllamaConnection = async () => {
    setTestingOllama(true);
    setOllamaStatus(null);
    try {
      const res = await fetch(`/api/llm/local-status?base_url=${encodeURIComponent(baseUrl)}`);
      const data = await res.json();
      setOllamaStatus(data);
    } catch (err) {
      setOllamaStatus({
        online: false,
        message: `Failed to test connection: ${err.message}`,
        models: []
      });
    } finally {
      setTestingOllama(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const isLocal = provider === 'local_ollama';
    const hasKeyOrLocal = isLocal || !!apiKey.trim();
    
    onSaveConfig({
      provider: hasKeyOrLocal ? provider : 'smart-local',
      apiKey: isLocal ? '' : apiKey.trim(),
      baseUrl: baseUrl.trim() || 'http://localhost:11434/v1',
      modelName: modelName.trim() || getDefaultModel(provider, apiKey),
      hasKey: hasKeyOrLocal
    });
    onClose();
  };

  const handleResetToBuiltin = () => {
    setApiKey('');
    onSaveConfig({
      provider: 'smart-local',
      apiKey: '',
      baseUrl: 'http://localhost:11434/v1',
      modelName: '',
      hasKey: false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D47A1]/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D2E3FC] max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFD] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1E293B]">LLM Engine Settings</h2>
              <p className="text-[11px] text-[#5F6368]">Configure Cloud (Gemini, Groq) or Offline Local Qwen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5F6368] hover:text-[#1E293B] hover:bg-[#E8F0FE] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Smart Local Banner */}
          <div className="p-3 bg-[#E8F0FE]/70 border border-[#D2E3FC] rounded-xl flex items-start gap-2.5">
            <Cpu className="w-4 h-4 text-[#1A73E8] shrink-0 mt-0.5" />
            <div className="text-xs text-[#1E293B]">
              <span className="font-semibold text-[#1A73E8]">Built-in Smart Engine:</span>
              <p className="text-[#5F6368] mt-0.5 leading-relaxed text-[11px]">
                If no external or local provider is enabled, Text2Insight uses its safe, built-in semantic NLP rule engine with zero API key or server requirements.
              </p>
            </div>
          </div>

          {/* Provider Selection (3 Cards) */}
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">Select LLM Provider</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              
              {/* Card 1: Gemini */}
              <button
                type="button"
                onClick={() => handleSelectProvider('gemini')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  provider === 'gemini'
                    ? 'border-[#1A73E8] bg-[#E8F0FE] ring-1 ring-[#1A73E8]'
                    : 'border-[#CBD5E1] hover:border-[#1A73E8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E293B]">Gemini</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#1A73E8]" />
                </div>
                <span className="text-[10px] text-[#5F6368] mt-1 truncate">3.8 Flash</span>
              </button>

              {/* Card 2: Groq */}
              <button
                type="button"
                onClick={() => handleSelectProvider('groq')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  provider === 'groq'
                    ? 'border-[#1A73E8] bg-[#E8F0FE] ring-1 ring-[#1A73E8]'
                    : 'border-[#CBD5E1] hover:border-[#1A73E8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E293B]">Groq LPU</span>
                  <Zap className="w-3.5 h-3.5 text-[#1A73E8]" />
                </div>
                <span className="text-[10px] text-[#5F6368] mt-1 truncate">gpt-oss-120b</span>
              </button>

              {/* Card 3: Local Qwen (Ollama) */}
              <button
                type="button"
                onClick={() => handleSelectProvider('local_ollama')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  provider === 'local_ollama'
                    ? 'border-[#1A73E8] bg-[#E8F0FE] ring-1 ring-[#1A73E8]'
                    : 'border-[#CBD5E1] hover:border-[#1A73E8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E293B]">Local Qwen</span>
                  <HardDrive className="w-3.5 h-3.5 text-[#1A73E8]" />
                </div>
                <span className="text-[10px] text-[#5F6368] mt-1 truncate font-medium text-[#1A73E8]">Ollama / QLoRA</span>
              </button>

            </div>
          </div>

          {/* Configuration Inputs based on Provider */}
          {provider === 'local_ollama' ? (
            /* LOCAL QWEN (OLLAMA) CONFIGURATION */
            <div className="space-y-3.5 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#D2E3FC]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1A73E8] flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" />
                  Local Ollama Offline Mode (No API key required)
                </span>
                <button
                  type="button"
                  onClick={handleTestOllamaConnection}
                  disabled={testingOllama}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-[#CBD5E1] hover:border-[#1A73E8] text-[#1A73E8] rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${testingOllama ? 'animate-spin' : ''}`} />
                  <span>{testingOllama ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>

              {/* Connection Status Notice */}
              {ollamaStatus && (
                <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  ollamaStatus.online ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-800'
                }`}>
                  {ollamaStatus.online ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">{ollamaStatus.message}</p>
                    {ollamaStatus.models && ollamaStatus.models.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <span className="text-[10px] text-emerald-700">Installed models:</span>
                        {ollamaStatus.models.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModelName(m)}
                            className="text-[10px] bg-white border border-emerald-300 text-emerald-900 px-1.5 py-0.5 rounded cursor-pointer hover:bg-emerald-100"
                            title="Click to use this model"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Base URL */}
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Ollama Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs font-mono focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                  placeholder="http://localhost:11434/v1"
                />
              </div>

              {/* Model Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Local Model Name</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs font-mono focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                  placeholder="text2insight-qwen"
                />
                
                {/* Quick-select options */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-[#5F6368]">Quick Select:</span>
                  <button
                    type="button"
                    onClick={() => setModelName('text2insight-qwen')}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      modelName === 'text2insight-qwen'
                        ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                        : 'bg-white border-[#CBD5E1] text-[#1E293B] hover:border-[#1A73E8]'
                    }`}
                  >
                    text2insight-qwen (QLoRA)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModelName('qwen2.5-coder:7b')}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      modelName === 'qwen2.5-coder:7b'
                        ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                        : 'bg-white border-[#CBD5E1] text-[#1E293B] hover:border-[#1A73E8]'
                    }`}
                  >
                    qwen2.5-coder:7b (Base)
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* CLOUD PROVIDERS CONFIGURATION */
            <div className="space-y-3.5">
              
              {/* API Key Input */}
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                  {provider === 'gemini' ? 'Google Gemini API Key' : 'Groq API Key'}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs font-mono focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                  placeholder={provider === 'gemini' ? 'AIzaSy...' : 'gsk_...'}
                />
              </div>

              {/* Model Name Input & Options */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#1E293B]">Model Name</label>
                  {provider === 'groq' && (
                    <span className="text-[10px] text-[#5F6368]">Endpoint: https://api.groq.com/openai/v1</span>
                  )}
                </div>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs font-mono focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                  placeholder={getDefaultModel(provider)}
                />

                {/* Quick Model Options */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-[#5F6368]">Options:</span>
                  
                  {provider === 'gemini' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setModelName('gemini-3.8-flash')}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          modelName === 'gemini-3.8-flash'
                            ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                            : 'bg-white border-[#CBD5E1] text-[#1E293B] hover:border-[#1A73E8]'
                        }`}
                      >
                        gemini-3.8-flash (Default)
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelName('gemini-3.5-flash-lite')}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          modelName === 'gemini-3.5-flash-lite'
                            ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                            : 'bg-white border-[#CBD5E1] text-[#1E293B] hover:border-[#1A73E8]'
                        }`}
                      >
                        gemini-3.5-flash-lite
                      </button>
                    </>
                  )}

                  {provider === 'groq' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setModelName('openai/gpt-oss-120b')}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          modelName === 'openai/gpt-oss-120b'
                            ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                            : 'bg-white border-[#CBD5E1] text-[#1E293B] hover:border-[#1A73E8]'
                        }`}
                      >
                        openai/gpt-oss-120b (Default)
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelName('qwen/qwen3.8-27b')}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          modelName === 'qwen/qwen3.8-27b'
                            ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                            : 'bg-white border-[#CBD5E1] text-[#1E293B] hover:border-[#1A73E8]'
                        }`}
                      >
                        qwen/qwen3.8-27b
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelName('openai/gpt-oss-20b')}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          modelName === 'openai/gpt-oss-20b'
                            ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                            : 'bg-white border-[#CBD5E1] text-[#1E293B] hover:border-[#1A73E8]'
                        }`}
                      >
                        openai/gpt-oss-20b
                      </button>
                    </>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={handleResetToBuiltin}
              className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
            >
              Reset to Built-in Engine
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 border border-[#CBD5E1] text-[#5F6368] text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
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
