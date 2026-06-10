import React from 'react';
import DailyOperationEntry from '../features/production/components/DailyOperationEntry';
import ProductionLogsTable from '../features/production/components/ProductionLogsTable';
import SalaryHistoryDashboard from '../features/salary/components/SalaryHistoryDashboard';
import {
  Factory,
  Plus,
  Cpu,
  ListRestart
} from 'lucide-react';

// ==========================================
// 1. FINANCIAL DASHBOARD (OVERVIEW)
// ==========================================
export const Dashboard = () => (
  <div className="space-y-8 animate-in fade-in duration-500 w-full max-w-7xl mx-auto">
    <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] p-6 md:p-8 relative overflow-hidden">
      {/* Subtle brand accent */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-[#0F172A]" />
      <SalaryHistoryDashboard />
    </div>

  </div>
);


// ==========================================
// 3. FLOOR OPERATIONS (EXECUTION)
// ==========================================
export const Operations = () => (
  <div className="space-y-8 animate-in fade-in duration-500 w-full max-w-7xl mx-auto">

    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200/60">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-[#0F172A] rounded-2xl shadow-lg shadow-slate-900/20 border border-slate-700">
            <Factory className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">Execution System</span>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Floor Operations</h3>
          </div>
        </div>
        <p className="text-slate-500 font-medium text-sm pl-1 mt-3">Submit production logs and monitor active manufacturing cycles.</p>
      </div>

      {/* Active Shift Indicator */}
      <div className="flex items-center gap-2 text-[11px] font-black text-emerald-600 bg-emerald-500/10 px-5 py-2.5 rounded-xl border border-emerald-500/20 uppercase tracking-widest shadow-sm">
        <span className="relative flex h-2.5 w-2.5 mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        Live Shift Active
      </div>
    </header>

    {/* Vertical Stacked Layout for Maximum Readability */}
    <div className="flex flex-col gap-8">

      {/* TOP SECTION: Entry Form Panel */}
      <section className="w-full">
        <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] p-6 md:p-8 relative overflow-hidden">
          {/* Brand Red accent line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#DC2626]" />

          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Operation Entry</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Log completed garment batches into the system.</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
              <Cpu className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          {/* Component Wrapper */}
          <div className="bg-[#F8FAFC] rounded-2xl p-1 md:p-3 border border-slate-200/60 shadow-inner">
            <DailyOperationEntry />
          </div>
        </div>
      </section>

      {/* BOTTOM SECTION: Data Table Panel */}
      <section className="w-full">
        <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] p-6 md:p-8 relative overflow-hidden">

          {/* Subtle slate top accent */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#0F172A]" />

          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Production Logs</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Historical operations view with server-side sync.</p>
            </div>
            <button className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-[#DC2626] transition-colors uppercase tracking-widest px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <ListRestart size={14} /> View All Logs
            </button>
          </div>

          {/* Component Wrapper */}
          <div className="w-full bg-[#F8FAFC] rounded-2xl border border-slate-200/60 overflow-hidden p-1 shadow-inner">
            <ProductionLogsTable />
          </div>

        </div>
      </section>

    </div>
  </div>
);