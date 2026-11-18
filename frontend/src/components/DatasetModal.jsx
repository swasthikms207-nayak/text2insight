import React, { useState } from 'react';
import { X, Database, Upload, Server, Table, FileSpreadsheet, AlertCircle } from 'lucide-react';

export default function DatasetModal({
  isOpen,
  onClose,
  currentDataset,
  onUploadFile,
  onConnectPostgres
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

  if (!isOpen) return null;

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadLoading(true);
    setUploadError('');
    try {
      await onUploadFile(file);
      onClose();
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
      onClose();
    } catch (err) {
      setPgError(err.message || 'PostgreSQL connection failed');
    } finally {
      setPgLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D47A1]/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D2E3FC] max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFD]">
          <div>
            <h2 className="text-lg font-bold text-[#1E293B] flex items-center gap-2">
              <Database className="w-5 h-5 text-[#1A73E8]" />
              Dataset Management
            </h2>
            <p className="text-xs text-[#5F6368]">Upload a CSV/Excel file or connect to your PostgreSQL database.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5F6368] hover:text-[#1E293B] hover:bg-[#E8F0FE] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E2E8F0] px-6 bg-white gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'border-[#1A73E8] text-[#1A73E8]'
                : 'border-transparent text-[#5F6368] hover:text-[#1E293B]'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload CSV / Excel
          </button>

          <button
            onClick={() => setActiveTab('postgres')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'postgres'
                ? 'border-[#1A73E8] text-[#1A73E8]'
                : 'border-transparent text-[#5F6368] hover:text-[#1E293B]'
            }`}
          >
            <Server className="w-4 h-4" />
            PostgreSQL Connection
          </button>

          {currentDataset && (
            <button
              onClick={() => setActiveTab('schema')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'schema'
                  ? 'border-[#1A73E8] text-[#1A73E8]'
                  : 'border-transparent text-[#5F6368] hover:text-[#1E293B]'
              }`}
            >
              <Table className="w-4 h-4" />
              Active Schema Preview
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: UPLOAD FILE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                  dragActive
                    ? 'border-[#1A73E8] bg-[#E8F0FE]'
                    : 'border-[#CBD5E1] hover:border-[#1A73E8] hover:bg-[#F8FAFD]'
                }`}
                onClick={() => document.getElementById('modal-dataset-file-input').click()}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1E293B]">
                    Click to browse or drag and drop your data file
                  </p>
                  <p className="text-xs text-[#5F6368] mt-1">
                    Supports <span className="font-medium text-[#1A73E8]">.CSV</span>, <span className="font-medium text-[#1A73E8]">.XLSX</span>, and <span className="font-medium text-[#1A73E8]">.XLS</span> files up to 50MB
                  </p>
                </div>
                <input
                  id="modal-dataset-file-input"
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  disabled={uploadLoading}
                  className="mt-2 px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {uploadLoading ? 'Processing file...' : 'Choose File from Computer'}
                </button>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="p-3.5 bg-[#F8FAFD] rounded-xl border border-[#E2E8F0] text-xs text-[#5F6368] space-y-1">
                <span className="font-semibold text-[#1E293B]">Automatic Ingestion Features:</span>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  <li>Automatic schema and column data type inference (Integer, Float, DateTime, Categorical)</li>
                  <li>In-memory DuckDB table indexing for zero-latency SQL querying</li>
                  <li>Safe isolated execution sandbox with no disk-writing modifications</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: POSTGRESQL */}
          {activeTab === 'postgres' && (
            <form onSubmit={handlePgSubmit} className="space-y-4">
              <p className="text-xs text-[#5F6368]">
                Connect directly to a PostgreSQL database. All natural language queries will execute under a strict <span className="font-semibold text-[#1A73E8]">READ-ONLY transaction</span> with statement timeout limits.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">Host</label>
                  <input
                    type="text"
                    value={pgConfig.host}
                    onChange={(e) => setPgConfig({ ...pgConfig, host: e.target.value })}
                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
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
                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
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
                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
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
                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
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
                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                    placeholder="••••••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">Specific Table (Optional)</label>
                  <input
                    type="text"
                    value={pgConfig.table_name}
                    onChange={(e) => setPgConfig({ ...pgConfig, table_name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs focus:outline-hidden focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                    placeholder="orders, customers, or leave blank to auto-detect"
                  />
                </div>
              </div>

              {pgError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pgError}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={pgLoading}
                  className="px-5 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Server className="w-3.5 h-3.5" />
                  {pgLoading ? 'Testing & Connecting...' : 'Connect to PostgreSQL'}
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
                  <p className="text-xs text-[#5F6368]">{currentDataset.row_count} total rows • {currentDataset.columns?.length || currentDataset.column_count} columns</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-[#E8F0FE] text-[#1A73E8] font-medium border border-[#D2E3FC]">
                  {currentDataset.source_type?.toUpperCase()}
                </span>
              </div>

              {/* Column definitions table */}
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFD] border-b border-[#E2E8F0] text-[#5F6368]">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Column Name</th>
                      <th className="py-2 px-3 font-semibold">Inferred Type</th>
                      <th className="py-2 px-3 font-semibold">Sample Values</th>
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
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFD] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#5F6368] hover:bg-white hover:text-[#1E293B] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
