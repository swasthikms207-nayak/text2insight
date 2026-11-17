import React, { useState, useMemo } from 'react';
import { Table as TableIcon, Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function DataTable({ columns = [], rows = [], totalRows = 0 }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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

  // Pagination calculation
  const totalPages = Math.ceil(processedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, currentPage, pageSize]);

  // Export to CSV
  const handleExportCsv = () => {
    if (!rows.length) return;
    const header = columns.map((c) => `"${c.name}"`).join(',');
    const body = rows
      .map((r) => columns.map((c) => `"${r[c.name] ?? ''}"`).join(','))
      .join('\n');
    const csvContent = `${header}\n${body}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `queryblue_results_${Date.now()}.csv`);
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
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5F6368] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search in table..."
              className="pl-8 pr-3 py-1.5 border border-[#CBD5E1] rounded-lg text-xs focus:outline-hidden focus:border-[#1A73E8] w-40 sm:w-56 bg-white"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] hover:border-[#1A73E8] hover:text-[#1A73E8] rounded-lg text-xs font-semibold text-[#1E293B] transition-colors cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F8FAFD] sticky top-0 z-10 border-b border-[#E2E8F0] text-[#5F6368]">
            <tr>
              <th className="py-2.5 px-4 font-semibold w-10 text-center">#</th>
              {columns.map((col) => {
                const isSorted = sortConfig.key === col.name;
                return (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:bg-[#E8F0FE]/70 transition-colors select-none"
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
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-8 text-center text-xs text-[#5F6368]">
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#F8FAFD] transition-colors">
                  <td className="py-2 px-4 text-center text-[#94A3B8] font-mono text-[11px]">
                    {(currentPage - 1) * pageSize + rIdx + 1}
                  </td>
                  {columns.map((col) => {
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

      {/* Pagination Bar */}
      <div className="px-5 py-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFD] text-xs text-[#5F6368]">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-[#CBD5E1] rounded px-2 py-1 bg-white focus:outline-hidden"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="hidden sm:inline">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, processedRows.length)} of {processedRows.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
