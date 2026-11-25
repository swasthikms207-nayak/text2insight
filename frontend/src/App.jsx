import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DatasetModal from './components/DatasetModal';
import ApiKeyModal from './components/ApiKeyModal';
import QuerySection from './components/QuerySection';
import InsightCard from './components/InsightCard';
import ChartView from './components/ChartView';
import DataTable from './components/DataTable';
import CodeInspector from './components/CodeInspector';
import ImportSwitchPage from './components/ImportSwitchPage';
import {
  Sparkles, Database, AlertCircle, History, RotateCcw,
  BarChart3, Table as TableIcon, Code2, ShieldAlert,
  ArrowLeft, Upload
} from 'lucide-react';

export default function App() {
  // Navigation View: 'import' (1st page) or 'workspace' (analytics dashboard)
  const [activeView, setActiveView] = useState('import');

  // Application State
  const [currentDataset, setCurrentDataset] = useState(null);
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
      const saved = localStorage.getItem('text2insight_llm_config') || localStorage.getItem('queryblue_llm_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.provider === 'smart-local' || parsed.provider === 'qwen') {
          parsed.provider = 'groq';
        }
        parsed.hasKey = true;
        return parsed;
      }
    } catch (e) {
      // Ignore
    }
    return {
      provider: 'groq',
      apiKey: '',
      baseUrl: 'http://localhost:11434/v1',
      modelName: 'openai/gpt-oss-120b',
      hasKey: true
    };
  });

  // Save LLM Config
  const handleSaveKeyConfig = (newConfig) => {
    setApiKeyConfig(newConfig);
    try {
      localStorage.setItem('text2insight_llm_config', JSON.stringify(newConfig));
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
      // Check current active dataset if one exists in backend
      const curRes = await fetch('/api/datasets/current');
      if (curRes.ok) {
        const curData = await curRes.json();
        if (curData && curData.id) {
          setCurrentDataset(curData);
        } else {
          setCurrentDataset(null);
        }
      }
    } catch (err) {
      console.error('Failed to load initial dataset metadata:', err);
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
        provider: llmConfig.provider || 'groq',
        api_key: llmConfig.apiKey || null,
        model_name: llmConfig.modelName || null,
        base_url: llmConfig.baseUrl || null
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

  // Upload File (Transitions to workspace with empty insights until user asks)
  const handleUploadFile = async (file) => {
    setLoading(true);
    setQueryError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/datasets/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to upload file');

      setCurrentDataset(data.dataset);
      setIsDatasetModalOpen(false);
      setQueryResult(null);
      setQuestion('');
      setActiveView('workspace');
    } catch (err) {
      setQueryError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Connect PostgreSQL (Transitions to workspace with empty insights until user asks)
  const handleConnectPostgres = async (pgConfig) => {
    setLoading(true);
    setQueryError(null);
    try {
      const res = await fetch('/api/datasets/connect-postgres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pgConfig)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Connection failed');

      setCurrentDataset(data.dataset);
      setIsDatasetModalOpen(false);
      setQueryResult(null);
      setQuestion('');
      setActiveView('workspace');
    } catch (err) {
      setQueryError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Continue to workspace with current dataset
  const handleContinueToWorkspace = () => {
    if (!currentDataset) return;
    setActiveView('workspace');
  };

  // Generate dynamic suggested questions based on uploaded dataset columns
  const activeSuggested = currentDataset?.columns && currentDataset.columns.length > 0
    ? [
        `Summarize the dataset and count total records`,
        currentDataset.columns[1] ? `Top 10 records by ${currentDataset.columns[1].name}` : `Show top 10 rows`,
        currentDataset.columns[0] ? `Group by ${currentDataset.columns[0].name} and summarize` : `Compare key metrics`
      ]
    : undefined;

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex flex-col text-[#1E293B]">
      
      {/* Top Navbar */}
      <Navbar
        currentDataset={currentDataset}
        activeView={activeView}
        onOpenImport={() => setActiveView('import')}
        onOpenWorkspace={() => setActiveView('workspace')}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        apiKeyConfig={apiKeyConfig}
        loading={loading}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* 1ST PAGE: IMPORT / SWITCH DATASET VIEW */}
        {activeView === 'import' ? (
          <ImportSwitchPage
            currentDataset={currentDataset}
            onUploadFile={handleUploadFile}
            onConnectPostgres={handleConnectPostgres}
            onContinueToWorkspace={handleContinueToWorkspace}
            loading={loading}
          />
        ) : (
          /* "THE REST": NATURAL LANGUAGE ANALYTICS WORKSPACE */
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Contextual Active Dataset Bar with Back/Switch Link */}
            {currentDataset && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-[#D2E3FC] shadow-2xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveView('import')}
                    className="p-1.5 px-2.5 rounded-lg border border-[#D2E3FC] bg-[#F8FAFD] hover:bg-[#E8F0FE] text-[#1A73E8] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    title="Return to Import / Switch page"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Import / Switch</span>
                  </button>

                  <div className="h-4 w-px bg-[#E2E8F0] hidden sm:block"></div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#5F6368]">Active:</span>
                    <span className="text-xs font-bold text-[#1E293B]">{currentDataset.name}</span>
                    <span className="text-[10px] font-semibold uppercase bg-[#E8F0FE] text-[#1A73E8] px-2 py-0.5 rounded-md">
                      {currentDataset.source_type}
                    </span>
                    <span className="text-xs text-[#5F6368] hidden md:inline">
                      • {currentDataset.row_count} rows • {currentDataset.columns?.length || currentDataset.column_count} cols
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveView('import')}
                    className="text-xs font-medium text-[#1A73E8] hover:text-[#1557B0] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload or switch dataset</span>
                  </button>
                </div>
              </div>
            )}

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

            {/* Empty Insights Placeholder - Kept empty until user asks */}
            {!queryResult && !loading && (
              <div className="p-10 sm:p-14 text-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] mx-auto flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#1E293B]">Insights Ready</h3>
                  <p className="text-xs text-[#5F6368] max-w-md mx-auto">
                    Type a question above or click one of the suggested prompts to generate executive insights, interactive charts, and data tables.
                  </p>
                </div>
              </div>
            )}

            {/* Results Area */}
            {queryResult && (
              <div className="space-y-6">
                
                {/* 1. SHORT INSIGHT CARD */}
                {queryResult.insight && (
                  <InsightCard
                    insight={queryResult.insight}
                    executionTimeMs={queryResult.execution_time_ms}
                  />
                )}

                {/* 2. INTERACTIVE DATA TABLE (DATASET QUERY RESULTS) */}
                {queryResult.columns && queryResult.columns.length > 0 && (
                  <DataTable
                    columns={queryResult.columns}
                    rows={queryResult.rows}
                    totalRows={queryResult.total_rows}
                  />
                )}

                {/* 3. CHART VISUALIZATION */}
                {queryResult.chart && queryResult.chart.data?.length > 0 && (
                  <ChartView chartSpec={queryResult.chart} />
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

          </div>
        )}

      </main>

      {/* Dataset Modal (for quick modal access if triggered) */}
      <DatasetModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
        currentDataset={currentDataset}
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
            <span className="font-semibold text-[#1A73E8]">Text2Insight</span>
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
