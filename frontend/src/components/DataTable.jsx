import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Table as TableIcon, Download, Search,
  ArrowUpDown, ArrowUp, ArrowDown, Columns3, Check, RotateCcw
} from 'lucide-react';

export default function DataTable({ columns = [], rows = [], totalRows = 0 }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Column visibility state (all columns selected by default)
  const allColNames = useMemo(() => columns.map((c) => c.name), [columns]);
  const [visibleColumns, setVisibleColumns] = useState(allColNames);
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sync visible columns when new query columns arrive
  useEffect(() => {
    setVisibleColumns(columns.map((c) => c.name));
  }, [columns]);

  // Close column dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsColumnDropdownOpen(false);
      }
    };
    if (isColumnDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColumnDropdownOpen]);

  // Toggle single column visibility (keep at least 1 column visible)
  const toggleColumn = (colName) => {
    setVisibleColumns((prev) => {
      if (prev.includes(colName)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== colName);
      } else {
        return [...prev, colName];
      }
    });
  };

  // Select all columns
  const selectAllColumns = () => {
    setVisibleColumns(allColNames);
  };

  // Filter columns to display based on active toggle
  const displayedColumns = useMemo(() => {
    return columns.filter((c) => visibleColumns.includes(c.name));
  }, [columns, visibleColumns]);

  // Handle sorting
  const handleSort = (colKey) => {
    let direction = 'asc';
    if (sortConfig.key === colKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: colKey, direction });
  };

  // Filter & sort rows
  const processedRows = useMemo(() => {
    let data = [...rows];

    // Filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      data = data.filter((row) =>
        Object.values(row).some((val) =>
          String(val || '').toLowerCase().includes(lower)
        )
      );
    }

    // Sort
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortConfig.direction === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    return data;
  }, [rows, searchTerm, sortConfig]);

  // Export to CSV (exports currently displayed columns)
  const handleExportCsv = () => {
    if (!rows.length) return;
    const exportCols = displayedColumns.length > 0 ? displayedColumns : columns;
    const header = exportCols.map((c) => `"${c.name}"`).join(',');
    const body = rows
      .map((r) => exportCols.map((c) => `"${r[c.name] ?? ''}"`).join(','))
      .join('\n');
    const csvContent = `${header}\n${body}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `text2insight_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!columns.length) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-[#D2E3FC] shadow-xs overflow-hidden transition-all space-y-0">
      
      {/* Table Toolbar */}
      <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFD]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center">
            <TableIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-bold text-[#1E293B]">Dataset Query Results</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#1A73E8] font-semibold border border-[#D2E3FC]">
            {totalRows} records
          </span>
          <span className="text-[11px] text-[#5F6368] hidden md:inline">
            • {displayedColumns.length} of {columns.length} columns visible
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5F6368] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in table..."
              className="pl-8 pr-3 py-1.5 border border-[#CBD5E1] rounded-lg text-xs focus:outline-hidden focus:border-[#1A73E8] w-36 sm:w-52 bg-white"
            />
          </div>

          {/* Column Toggle Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsColumnDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                isColumnDropdownOpen
                  ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]'
                  : 'bg-white border-[#CBD5E1] hover:border-[#1A73E8] hover:text-[#1A73E8] text-[#1E293B]'
              }`}
              title="Select which columns to view"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Columns</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E8F0FE] text-[#1A73E8] font-bold border border-[#D2E3FC]">
                {displayedColumns.length}/{columns.length}
              </span>
            </button>

            {/* Dropdown Menu */}
            {isColumnDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-[#D2E3FC] shadow-lg z-30 p-2 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between px-2 pt-1 pb-1 border-b border-[#E2E8F0] text-xs">
                  <span className="font-bold text-[#1E293B]">Toggle Columns</span>
                  <button
                    type="button"
                    onClick={selectAllColumns}
                    className="text-[11px] font-semibold text-[#1A73E8] hover:text-[#1557B0] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Show All</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 px-1">
                  {columns.map((col) => {
                    const isVisible = visibleColumns.includes(col.name);
                    return (
                      <div
                        key={col.name}
                        onClick={() => toggleColumn(col.name)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                          isVisible
                            ? 'bg-[#F8FAFD] text-[#1E293B] hover:bg-[#E8F0FE]/70'
                            : 'text-[#94A3B8] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${
                              isVisible
                                ? 'bg-[#1A73E8] border-[#1A73E8] text-white'
                                : 'border-[#CBD5E1] bg-white'
                            }`}
                          >
                            {isVisible && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate font-medium">{col.name}</span>
                        </div>
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded-sm bg-[#E2E8F0] text-[#64748B] font-mono shrink-0">
                          {col.type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] hover:border-[#1A73E8] hover:text-[#1A73E8] rounded-lg text-xs font-semibold text-[#1E293B] transition-colors cursor-pointer"
            title="Download CSV of displayed data"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Scrollable Table Container with Sticky Header */}
      <div className="overflow-auto max-h-[460px] relative scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F8FAFD] sticky top-0 z-10 border-b border-[#E2E8F0] text-[#5F6368] shadow-2xs">
            <tr>
              <th className="py-2.5 px-4 font-semibold w-12 text-center bg-[#F8FAFD]">#</th>
              {displayedColumns.map((col) => {
                const isSorted = sortConfig.key === col.name;
                return (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:bg-[#E8F0FE]/70 transition-colors select-none bg-[#F8FAFD]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#1E293B]">{col.name}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-sm bg-[#E2E8F0] text-[#64748B] font-mono">
                        {col.type}
                      </span>
                      {isSorted ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-[#1A73E8]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-[#1A73E8]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-[#94A3B8] opacity-50" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] bg-white">
            {processedRows.length === 0 ? (
              <tr>
                <td colSpan={displayedColumns.length + 1} className="py-8 text-center text-xs text-[#5F6368]">
                  No matching records found.
                </td>
              </tr>
            ) : (
              processedRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#F8FAFD] transition-colors">
                  <td className="py-2 px-4 text-center text-[#94A3B8] font-mono text-[11px]">
                    {rIdx + 1}
                  </td>
                  {displayedColumns.map((col) => {
                    const val = row[col.name];
                    const isNum = typeof val === 'number';
                    return (
                      <td
                        key={col.name}
                        className={`py-2 px-4 ${isNum ? 'font-mono text-right' : 'text-[#334155]'}`}
                      >
                        {val === null || val === undefined
                          ? '—'
                          : isNum
                          ? val.toLocaleString()
                          : String(val)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary Bar */}
      <div className="px-5 py-2.5 border-t border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFD] text-xs text-[#5F6368]">
        <div className="flex items-center gap-2">
          <span>
            Total: <strong className="text-[#1E293B] font-semibold">{processedRows.length}</strong> {processedRows.length === 1 ? 'record' : 'records'}
            {searchTerm.trim() && ` (filtered from ${rows.length})`}
          </span>
        </div>
        <div className="text-[11px] text-[#5F6368] font-medium">
          Scrollable table view
        </div>
      </div>

    </div>
  );
}
