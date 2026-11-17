import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DatasetModal from './components/DatasetModal';
import ApiKeyModal from './components/ApiKeyModal';
import QuerySection from './components/QuerySection';
import InsightCard from './components/InsightCard';
import ChartView from './components/ChartView';
import DataTable from './components/DataTable';
import CodeInspector from './components/CodeInspector';
import {
  Sparkles, Database, AlertCircle, History, RotateCcw,
  BarChart3, Table as TableIcon, Code2, ShieldAlert
} from 'lucide-react';

export default function App() {
  // Application State
  const [currentDataset, setCurrentDataset] = useState(null);
  const [sampleDatasets, setSampleDatasets] = useState([]);
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState('auto'); // 'auto', 'sql', 'pandas'
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [history, setHistory] = useState([]);

  // Modals
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // API Key & Provider Settings
  const [apiKeyConfig, setApiKeyConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('queryblue_llm_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // Ignore
    }
    return {
      provider: 'smart-local',
      apiKey: '',
      modelName: 'gemini-2.5-flash',
      hasKey: false
    };
  });

  // Save LLM Config
  const handleSaveKeyConfig = (newConfig) => {
    setApiKeyConfig(newConfig);
    try {
      localStorage.setItem('queryblue_llm_config', JSON.stringify(newConfig));
    } catch (e) {
      // Ignore
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch samples list
      const samplesRes = await fetch('/api/datasets/samples');
      if (samplesRes.ok) {
        const samplesData = await samplesRes.json();
        setSampleDatasets(samplesData);
      }

      // Fetch active dataset
      const curRes = await fetch('/api/datasets/current');
      if (curRes.ok) {
        const curData = await curRes.json();
        setCurrentDataset(curData);

        // Run default query to showcase table, chart & insight immediately
        const defaultQ = "Show churn rate and customer count by subscription plan";
        setQuestion(defaultQ);
        executeNaturalQuery(defaultQ, curData.id, 'auto', apiKeyConfig);
      }
    } catch (err) {
      console.error('Failed to load initial dataset:', err);
    }
  };

  // Execute Natural Language Query
  const executeNaturalQuery = async (
    qText,
    datasetId = currentDataset?.id,
    targetMode = mode,
    llmConfig = apiKeyConfig
  ) => {
    if (!datasetId || !qText.trim()) return;

    setLoading(true);
    setQueryError(null);

    try {
      const payload = {
        dataset_id: datasetId,
        question: qText.trim(),
        mode: targetMode,
        provider: llmConfig.hasKey ? llmConfig.provider : 'smart-local',
        api_key: llmConfig.apiKey || null,
        model_name: llmConfig.modelName || null
      };

      const res = await fetch('/api/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Execution failed on server.');
      }

      if (!data.success) {
        setQueryError(data.error || data.safety?.message || 'Query execution failed.');
        setQueryResult(data);
      } else {
        setQueryResult(data);
        // Add to history if unique
        setHistory((prev) => {
          const filtered = prev.filter((h) => h.question !== qText);
          return [{ question: qText, timestamp: new Date().toLocaleTimeString(), codeType: data.code_type }, ...filtered].slice(0, 8);
        });
      }
    } catch (err) {
      setQueryError(err.message || 'An unexpected error occurred while processing your query.');
    } finally {
      setLoading(false);
    }
  };

  // Run Custom Code
  const handleRunCustomCode = async (codeText, codeType) => {
    if (!currentDataset) return;
    setLoading(true);
    setQueryError(null);

    try {
      const payload = {
        dataset_id: currentDataset.id,
        code: codeText,
        code_type: codeType,
        original_question: question
      };

      const res = await fetch('/api/query/run-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to execute custom code');

      if (!data.success) {
        setQueryError(data.error || 'Custom code execution failed.');
      }
      setQueryResult(data);
    } catch (err) {
      setQueryError(err.message || 'Custom code error');
    } finally {
      setLoading(false);
    }
  };

  // Select Sample Dataset
  const handleSelectSample = async (sampleId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/datasets/load-sample/${sampleId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      setCurrentDataset(data.dataset);
      setIsDatasetModalOpen(false);

      // Find suggested question for this sample
      const sampleMeta = sampleDatasets.find((s) => s.id === sampleId);
      const nextQ = sampleMeta?.suggested_questions?.[0] || 'Provide a summary of this dataset';
      setQuestion(nextQ);
      executeNaturalQuery(nextQ, sampleId, mode, apiKeyConfig);
    } catch (err) {
      setQueryError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Upload File
  const handleUploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/datasets/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to upload file');

    setCurrentDataset(data.dataset);
    const firstCol = data.dataset.columns?.[0]?.name || 'category';
    const initQ = `Summarize and show the top 10 rows by ${firstCol}`;
    setQuestion(initQ);
    executeNaturalQuery(initQ, data.dataset.id, mode, apiKeyConfig);
  };

  // Connect PostgreSQL
  const handleConnectPostgres = async (pgConfig) => {
    const res = await fetch('/api/datasets/connect-postgres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pgConfig)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Connection failed');

    setCurrentDataset(data.dataset);
    const initQ = `SELECT * FROM ${data.selected_table} LIMIT 20`;
    setQuestion(initQ);
    executeNaturalQuery(initQ, data.dataset.id, 'sql', apiKeyConfig);
  };

  // Find suggested questions for active dataset
  const activeSuggested = sampleDatasets.find((s) => s.id === currentDataset?.id)?.suggested_questions;

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex flex-col text-[#1E293B]">
      
      {/* Top Navbar */}
      <Navbar
        currentDataset={currentDataset}
        onOpenDatasetModal={() => setIsDatasetModalOpen(true)}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        apiKeyConfig={apiKeyConfig}
        loading={loading}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Natural Language Prompt & Input Section */}
        <QuerySection
          question={question}
          setQuestion={setQuestion}
          mode={mode}
          setMode={setMode}
          onSubmit={(q) => executeNaturalQuery(q)}
          loading={loading}
          suggestedQuestions={activeSuggested}
          currentDataset={currentDataset}
        />

        {/* Error Banner */}
        {queryError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-3 shadow-2xs">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Query / Sandbox Notice</p>
              <p>{queryError}</p>
            </div>
          </div>
        )}

        {/* Results Area */}
        {queryResult && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* 1. SHORT INSIGHT CARD */}
            {queryResult.insight && (
              <InsightCard
                insight={queryResult.insight}
                executionTimeMs={queryResult.execution_time_ms}
              />
            )}

            {/* 2. CHART VISUALIZATION */}
            {queryResult.chart && queryResult.chart.data?.length > 0 && (
              <ChartView chartSpec={queryResult.chart} />
            )}

            {/* 3. INTERACTIVE DATA TABLE */}
            {queryResult.columns && queryResult.columns.length > 0 && (
              <DataTable
                columns={queryResult.columns}
                rows={queryResult.rows}
                totalRows={queryResult.total_rows}
              />
            )}

            {/* 4. CODE INSPECTOR & SANDBOX AUDIT */}
            {queryResult.code && (
              <CodeInspector
                code={queryResult.code}
                codeType={queryResult.code_type}
                reasoning={queryResult.reasoning}
                safety={queryResult.safety}
                executionTimeMs={queryResult.execution_time_ms}
                onRunCustomCode={handleRunCustomCode}
                loading={loading}
              />
            )}

          </div>
        )}

        {/* Query History Chips */}
        {history.length > 1 && (
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center gap-2 overflow-x-auto text-xs text-[#5F6368]">
            <History className="w-3.5 h-3.5 text-[#1A73E8] shrink-0" />
            <span className="font-semibold text-[#1E293B] shrink-0">Recent queries:</span>
            <div className="flex gap-2">
              {history.slice(1, 5).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuestion(item.question);
                    executeNaturalQuery(item.question);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#1A73E8] hover:text-[#1A73E8] transition-colors truncate max-w-[200px] cursor-pointer"
                  title={item.question}
                >
                  {item.question}
                </button>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Dataset Selector / Upload / Postgres Modal */}
      <DatasetModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
        sampleDatasets={sampleDatasets}
        currentDataset={currentDataset}
        onSelectSample={handleSelectSample}
        onUploadFile={handleUploadFile}
        onConnectPostgres={handleConnectPostgres}
      />

      {/* LLM / API Key Configuration Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        apiKeyConfig={apiKeyConfig}
        onSaveConfig={handleSaveKeyConfig}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E2E8F0] py-4 bg-white text-center text-xs text-[#5F6368]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1A73E8]">QueryBlue</span>
            <span>• Monochromatic Blue Analytics Engine (#1A73E8)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>FastAPI + DuckDB + Pandas Sandbox</span>
            <span>React + Recharts Frontend</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
