import React, { useState, useEffect } from 'react';
import { Calendar, Users, IndianRupee, Package, Search, Loader2, ArrowRight, X, FileText, Download, Activity, ShieldCheck, DatabaseZap } from 'lucide-react';
import apiClient from '../../../api/apiClient';
import { TableContainer, Thead, Th, Tbody, Tr, Td, Pagination, Button, Card } from '../../../components/ui/Base';
import PrintLayout from '../../../components/print/PrintLayout';

const SalaryHistoryDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Modal State
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportLogs, setReportLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // New States
  const [printMode, setPrintMode] = useState('main'); // 'main' or 'individual'
  const [modelFilter, setModelFilter] = useState('');

  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');

  // Fetch employees for dropdown
  useEffect(() => {
    setFetchingEmployees(true);
    apiClient.get('/employees/')
      .then(res => setEmployees(res.data.results || res.data))
      .catch(err => console.error("Error fetching employees", err))
      .finally(() => setFetchingEmployees(false));
  }, []);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/salary-history/', {
        params: {
          start_date: startDate,
          end_date: endDate,
          employee_id: selectedEmployee || undefined
        }
      });
      setResults(response.data);
      setCurrentPage(1); // Reset to page 1 on new calculation
    } catch (err) {
      console.error("Error calculating payout", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleRowClick = async (report) => {
    setSelectedReport(report);
    setModelFilter(''); // Reset filter when opening new report
    setLoadingLogs(true);
    try {
      const response = await apiClient.get('/production-logs/', {
        params: {
          employee_id: report.employee_id,
          start_date: startDate,
          end_date: endDate
        }
      });
      setReportLogs(response.data.results || response.data);
    } catch (err) {
      console.error("Error fetching logs", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const setQuickDate = (type) => {
    const today = new Date();
    let start, end;

    if (type === 'current') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (type === 'last') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setSelectedEmployee('');
  };

  // Pagination Logic
  const filteredResults = results.filter(r => 
    r.employee__name.toLowerCase().includes(tableSearchTerm.toLowerCase()) || 
    r.employee__employee_code.toLowerCase().includes(tableSearchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredResults.length / rowsPerPage);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Reset to page 1 when rowsPerPage or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, tableSearchTerm]);

  // Derived state for Modal
  const uniqueModels = [...new Set(reportLogs.map(log => log.product_name))].filter(Boolean);
  const filteredReportLogs = modelFilter 
    ? reportLogs.filter(log => log.product_name === modelFilter)
    : reportLogs;

  return (
    <>
    <div className="no-print space-y-8 animate-in fade-in duration-500 w-full max-w-7xl mx-auto">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-[#0F172A] rounded-2xl shadow-lg shadow-slate-900/20 border border-slate-700">
              <IndianRupee className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">Payroll Analytics</span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Salary History</h1>
            </div>
          </div>
          <p className="text-slate-500 font-medium text-sm pl-1 mt-3">Aggregate piece-rate earnings and worker performance auditing.</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setQuickDate('current')}
            variant="ghost"
            className="text-[10px] py-2.5"
          >
            Current Month
          </Button>
          <Button
            onClick={() => setQuickDate('last')}
            variant="ghost"
            className="text-[10px] py-2.5"
          >
            Last Month
          </Button>
        </div>
      </div>

      {/* CONTROL PANEL */}
      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#DC2626]" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar size={14} className="text-[#DC2626]" /> Period Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-black text-xs text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar size={14} className="text-[#DC2626]" /> Period End
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-black text-xs text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Users size={14} className="text-[#DC2626]" /> Employee Filter
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-black text-xs text-slate-900 appearance-none cursor-pointer"
            >
              <option value="">Consolidated Report</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={loading || !startDate || !endDate}
            className="w-full py-4 bg-[#0F172A] hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} strokeWidth={3} />}
            <span>Generate Ledger</span>
          </Button>
        </div>
      </div>

      {/* RESULTS SECTION */}
      {results.length > 0 ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 gap-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Generated Records</h3>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative group flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#DC2626] transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={tableSearchTerm}
                  onChange={(e) => setTableSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/10 focus:border-[#DC2626] outline-none transition-all font-semibold text-xs text-slate-900 placeholder:text-slate-400 shadow-sm"
                />
              </div>
              <button
                onClick={() => {
                  setPrintMode('main');
                  setTimeout(() => window.print(), 100);
                }}
                className="flex items-center gap-2 text-[10px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200 transition-all uppercase tracking-widest flex-shrink-0"
              >
                <Download size={14} strokeWidth={3} /> Print Ledger
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] overflow-hidden p-1">
            <TableContainer className="border-none shadow-none">
              <Thead>
                <Th className="py-5">Personnel Detail</Th>
                <Th className="py-5 text-center">Active Cycles</Th>
                <Th className="py-5 text-center">Output Units</Th>
                <Th className="py-5 text-right">Net Disbursement</Th>
              </Thead>
              <Tbody>
                {paginatedResults.map((report, idx) => (
                  <Tr key={`desktop-${idx}`} onClick={() => handleRowClick(report)} className="cursor-pointer hover:bg-slate-50 group">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#0F172A] group-hover:text-white transition-colors">
                          <Users size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{report.employee__name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {report.employee__employee_code}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-center">
                      <span className="text-[11px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60">
                        {report.present_days} Sessions
                      </span>
                    </Td>
                    <Td className="text-center">
                      <span className="text-[11px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60">
                        {report.total_pieces.toLocaleString()} Units
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1 text-emerald-600">
                        <IndianRupee size={14} strokeWidth={3} />
                        <span className="text-lg font-black tracking-tighter">
                          {parseFloat(report.total_payout).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </TableContainer>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
              totalItems={filteredResults.length}
            />
          </div>
        </div>
      ) : (
        !loading && (
          <div className="w-full bg-slate-50 border border-slate-200/60 border-dashed rounded-[2.5rem] p-24 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50">
              <DatabaseZap className="w-10 h-10 text-slate-200" strokeWidth={1.5} />
            </div>
            <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">Query Pending</h4>
            <p className="text-slate-400 font-medium text-sm mt-2">Initialize date parameters to aggregate operational disbursements.</p>
          </div>
        )
      )}

      {/* MODAL OVERLAY */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">

            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#F8FAFC] relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#DC2626]" />
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Audit Trail</h3>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                  <span className="text-[#DC2626]">{selectedReport.employee__name}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  Code: {selectedReport.employee__employee_code}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className="bg-white border border-slate-200/60 text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] outline-none transition-all shadow-sm max-w-[200px]"
                >
                  <option value="">All Models</option>
                  {uniqueModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-[#DC2626] hover:border-[#DC2626] hover:bg-red-50 rounded-xl transition-all"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {loadingLogs ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="animate-spin text-[#DC2626]" size={40} strokeWidth={2.5} />
                </div>
              ) : reportLogs.length > 0 ? (
                <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <th className="px-6 py-5">Work Date</th>
                        <th className="px-6 py-5">Product Matrix</th>
                        <th className="px-6 py-5">Operational Task</th>
                        <th className="px-6 py-5 text-center">Output</th>
                        <th className="px-6 py-5 text-right">Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReportLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-black text-slate-500 text-xs uppercase">{log.work_date}</td>
                          <td className="px-6 py-4">
                            <span className="font-black text-slate-900 block">{log.product_name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 inline-block bg-slate-100 px-2 py-0.5 rounded">Size: {log.size_name || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 font-black text-[#DC2626] uppercase text-[11px] tracking-wider">{log.operation_name}</td>
                          <td className="px-6 py-4 text-center font-black text-slate-900 text-base">x{log.quantity}</td>
                          <td className="px-6 py-4 text-right font-black text-emerald-600 text-base tracking-tight">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(log.amount_earned)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                  <Activity size={48} strokeWidth={1} className="mb-4 text-slate-200" />
                  <p className="font-black text-lg text-slate-400 uppercase tracking-widest">No detailed logs found.</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-[#F8FAFC] flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Audited {filteredReportLogs.length} Transactions</span>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPrintMode('individual');
                    setTimeout(() => window.print(), 100);
                  }}
                  className="flex items-center gap-2 text-[10px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-6 py-2.5 rounded-xl border border-emerald-200 transition-all uppercase tracking-widest"
                >
                  <Download size={14} strokeWidth={3} /> Print Trace
                </button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedReport(null)}
                  className="px-8 py-2.5 text-xs font-black"
                >
                  Close Trace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* PRINT TEMPLATE - MAIN */}
    {printMode === 'main' && (
      <PrintLayout documentType="Salary Management Ledger" title={`Payout Report (${startDate || 'Start'} to ${endDate || 'Today'})`}>
        <table>
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Employee Code</th>
              <th>Present Days</th>
              <th>Total Output Units</th>
              <th>Net Payout (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((r, i) => (
              <tr key={i}>
                <td>{r.employee__name}</td>
                <td>{r.employee__employee_code}</td>
                <td>{r.present_days}</td>
                <td>{r.total_pieces}</td>
                <td>{parseFloat(r.total_payout).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
          {filteredResults.length > 0 && (
            <tfoot>
              <tr>
                <th colSpan="4" className="text-right">Grand Total</th>
                <th>Rs. {filteredResults.reduce((sum, r) => sum + parseFloat(r.total_payout || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</th>
              </tr>
            </tfoot>
          )}
        </table>
      </PrintLayout>
    )}

    {/* PRINT TEMPLATE - INDIVIDUAL */}
    {printMode === 'individual' && selectedReport && (
      <PrintLayout documentType="Individual Work History" title={`Audit Trail: ${selectedReport.employee__name} (${startDate || 'Start'} to ${endDate || 'Today'})`}>
        <div className="mb-4">
          <p className="font-bold">Employee Code: <span className="font-normal">{selectedReport.employee__employee_code}</span></p>
          {modelFilter && <p className="font-bold">Model Filter: <span className="font-normal">{modelFilter}</span></p>}
        </div>
        <table>
          <thead>
            <tr>
              <th className="text-left">Work Date</th>
              <th className="text-left">Product Matrix</th>
              <th className="text-left">Operational Task</th>
              <th className="text-center">Output</th>
              <th className="text-right">Value (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {filteredReportLogs.map(log => (
              <tr key={log.id}>
                <td>{log.work_date}</td>
                <td>
                  <div>{log.product_name}</div>
                  <div className="text-xs text-gray-500">Size: {log.size_name || 'N/A'}</div>
                </td>
                <td>{log.operation_name}</td>
                <td className="text-center">{log.quantity}</td>
                <td className="text-right">{parseFloat(log.amount_earned).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
          {filteredReportLogs.length > 0 && (
            <tfoot>
              <tr>
                <th colSpan="3" className="text-right">Total</th>
                <th className="text-center">{filteredReportLogs.reduce((sum, log) => sum + (log.quantity || 0), 0)}</th>
                <th className="text-right">Rs. {filteredReportLogs.reduce((sum, log) => sum + parseFloat(log.amount_earned || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</th>
              </tr>
            </tfoot>
          )}
        </table>
      </PrintLayout>
    )}
    </>
  );
};

export default SalaryHistoryDashboard;
