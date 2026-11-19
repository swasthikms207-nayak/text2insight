import React, { useState } from 'react';
import {
  Upload, Database, Server, Check, ArrowRight, Table,
  FileSpreadsheet, AlertCircle, Sparkles, ShieldCheck
} from 'lucide-react';

export default function ImportSwitchPage({
  currentDataset,
  onUploadFile,
  onConnectPostgres,
  onContinueToWorkspace,
  loading
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'postgres' | 'schema'
  const [dragActive, setDragActive] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // PostgreSQL form state
  const [pgConfig, setPgConfig] = useState({
    host: 'localhost',
    port: 5432,
    database: 'analytics_db',
    username: 'postgres',
    password: '',
    table_name: ''
  });
  const [pgLoading, setPgLoading] = useState(false);
  const [pgError, setPgError] = useState('');

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadLoading(true);
    setUploadError('');
    try {
      await onUploadFile(file);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload file');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePgSubmit = async (e) => {
    e.preventDefault();
    setPgLoading(true);
    setPgError('');
    try {
      await onConnectPostgres(pgConfig);
    } catch (err) {
      setPgError(err.message || 'PostgreSQL connection failed');
    } finally {
      setPgLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E293B] tracking-tight">
          Import Your Dataset
        </h1>
        <p className="text-sm sm:text-base text-[#5F6368] max-w-2xl mx-auto">
          Upload a CSV, Excel, or JSON file, or connect to your PostgreSQL database. Once uploaded, you can ask natural language questions to generate instant tables, charts, and executive insights.
        </p>
      </div>

      {/* Active Dataset Banner (if one is loaded) */}
      {currentDataset && (
        <div className="p-4 bg-white rounded-2xl border border-[#D2E3FC] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#5F6368]">Currently Active Dataset:</span>
                <span className="text-xs font-bold text-[#1E293B] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                  {currentDataset.name}
                </span>
                <span className="text-[10px] uppercase font-bold text-[#1A73E8] bg-[#E8F0FE] px-2 py-0.5 rounded-full">
                  {currentDataset.source_type}
                </span>
              </div>
              <p className="text-xs text-[#5F6368] mt-0.5">
                {currentDataset.row_count} rows • {currentDataset.columns?.length || currentDataset.column_count} columns available for query execution
              </p>
            </div>
          </div>

          <button
            onClick={onContinueToWorkspace}
            className="w-full sm:w-auto px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue to Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Import Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFD] px-4 sm:px-6 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-[#1A73E8] text-[#1A73E8] bg-white rounded-t-lg'
                : 'border-transparent text-[#5F6368] hover:text-[#1E293B]'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload CSV / Excel / JSON
          </button>

          <button
            onClick={() => setActiveTab('postgres')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'postgres'
                ? 'border-[#1A73E8] text-[#1A73E8] bg-white rounded-t-lg'
                : 'border-transparent text-[#5F6368] hover:text-[#1E293B]'
            }`}
          >
            <Server className="w-4 h-4" />
            PostgreSQL Connection
          </button>

          {currentDataset && (
            <button
              onClick={() => setActiveTab('schema')}
              className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'schema'
                  ? 'border-[#1A73E8] text-[#1A73E8] bg-white rounded-t-lg'
                  : 'border-transparent text-[#5F6368] hover:text-[#1E293B]'
              }`}
            >
              <Table className="w-4 h-4" />
              Active Schema Preview
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-6 sm:p-8">

          {/* TAB 1: UPLOAD FILE */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('main-file-input').click()}
                className={`border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center transition-all flex flex-col items-center justify-center gap-4 cursor-pointer ${
                  dragActive
                    ? 'border-[#1A73E8] bg-[#E8F0FE]'
                    : 'border-[#CBD5E1] hover:border-[#1A73E8] hover:bg-[#F8FAFD]'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                
                <div className="space-y-1">
                  <p className="text-base font-bold text-[#1E293B]">
                    Click to browse or drag & drop your data file
                  </p>
                  <p className="text-xs text-[#5F6368]">
                    Supported formats: <span className="font-semibold text-[#1A73E8]">.CSV</span>, <span className="font-semibold text-[#1A73E8]">.XLSX</span>, <span className="font-semibold text-[#1A73E8]">.XLS</span>, or <span className="font-semibold text-[#1A73E8]">.JSON</span> (up to 50MB)
                  </p>
                </div>

                <input
                  id="main-file-input"
                  type="file"
                  accept=".csv, .xlsx, .xls, .json, .jsonl"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  disabled={uploadLoading}
                  className="mt-2 px-5 py-2.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  {uploadLoading ? 'Uploading and parsing schema...' : 'Choose File from Computer'}
                </button>
              </div>

              {uploadError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: POSTGRESQL */}
          {activeTab === 'postgres' && (
            <form onSubmit={handlePgSubmit} className="space-y-5">
              <div className="p-3.5 rounded-xl bg-[#E8F0FE]/60 border border-[#D2E3FC] text-xs text-[#1557B0] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#1A73E8] shrink-0 mt-0.5" />
                <p>
                  Connect directly to a live PostgreSQL database. All natural language queries will be strictly wrapped inside an enforced <span className="font-bold">READ-ONLY transaction</span> with statement timeout limits.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">Host</label>
                  <input
                    type="text"
                    value={pgConfig.host}
                    onChange={(e) => setPgConfig({ ...pgConfig, host: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                    placeholder="localhost or db.example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">Port</label>
                  <input
                    type="number"
                    value={pgConfig.port}
                    onChange={(e) => setPgConfig({ ...pgConfig, port: parseInt(e.target.value) || 5432 })}
                    className="w-full px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                    placeholder="5432"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">Database Name</label>
                  <input
                    type="text"
                    value={pgConfig.database}
                    onChange={(e) => setPgConfig({ ...pgConfig, database: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                    placeholder="analytics_production"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">Username</label>
                  <input
                    type="text"
                    value={pgConfig.username}
                    onChange={(e) => setPgConfig({ ...pgConfig, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                    placeholder="postgres or readonly_user"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">Password</label>
                  <input
                    type="password"
                    value={pgConfig.password}
                    onChange={(e) => setPgConfig({ ...pgConfig, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                    placeholder="••••••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">Specific Table (Optional)</label>
                  <input
                    type="text"
                    value={pgConfig.table_name}
                    onChange={(e) => setPgConfig({ ...pgConfig, table_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                    placeholder="orders, customers, or leave blank to auto-detect"
                  />
                </div>
              </div>

              {pgError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pgError}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={pgLoading}
                  className="px-6 py-2.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Server className="w-4 h-4" />
                  {pgLoading ? 'Testing & Connecting...' : 'Connect to PostgreSQL & Analyze'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SCHEMA PREVIEW */}
          {activeTab === 'schema' && currentDataset && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">{currentDataset.name}</h3>
                  <p className="text-xs text-[#5F6368]">
                    {currentDataset.row_count} total rows • {currentDataset.columns?.length || currentDataset.column_count} columns
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-[#E8F0FE] text-[#1A73E8] font-medium border border-[#D2E3FC]">
                  {currentDataset.source_type?.toUpperCase()}
                </span>
              </div>

              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFD] border-b border-[#E2E8F0] text-[#5F6368]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Column Name</th>
                      <th className="py-2.5 px-3 font-semibold">Inferred Type</th>
                      <th className="py-2.5 px-3 font-semibold">Sample Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {currentDataset.columns?.map((col) => (
                      <tr key={col.name} className="hover:bg-[#F8FAFD]">
                        <td className="py-2 px-3 font-mono font-medium text-[#1A73E8]">{col.name}</td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            col.type === 'INTEGER' || col.type === 'FLOAT'
                              ? 'bg-blue-100 text-blue-800'
                              : col.type === 'DATETIME'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {col.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-gray-500 truncate max-w-[280px]">
                          {col.sample?.join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onContinueToWorkspace}
                  className="px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Go to Query & Charts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
