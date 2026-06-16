import React, { useState, useEffect, useMemo } from 'react';
import {
   useReactTable,
   getCoreRowModel,
   flexRender,
 } from '@tanstack/react-table';
 import { Loader2, Activity, Filter, X, Edit, Trash2 } from 'lucide-react';
 import apiClient from '../../../api/apiClient';
 import { Pagination } from '../../../components/ui/Base';
 import EditProductionLogModal from './EditProductionLogModal';
 import PrintLayout from '../../../components/print/PrintLayout';

const ProductionLogsTable = ({ refreshTrigger }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [editingLog, setEditingLog] = useState(null);

  // Filter State
  const [products, setProducts] = useState([]);
  const [operations, setOperations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedOperation, setSelectedOperation] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modelNumber, setModelNumber] = useState('');

  // Table state
  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20, // Default to 20
  });

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  );

  // Fetch Master Data for Filters
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [prodRes, opRes, empRes] = await Promise.all([
          apiClient.get('/products/'),
          apiClient.get('/operations/'),
          apiClient.get('/employees/')
        ]);
        const allProd = prodRes.data.results || prodRes.data;
        setProducts(allProd.filter(p => p.is_active));

        const allOp = opRes.data.results || opRes.data;
        setOperations(allOp);

        const allEmp = empRes.data.results || empRes.data;
        setEmployees(allEmp.filter(e => e.is_working));
      } catch (err) {
        console.error("Error fetching filter master data", err);
      }
    };
    fetchMasterData();
  }, []);

  // Reset pageIndex to 0 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [selectedProduct, selectedOperation, selectedEmployee, startDate, endDate, modelNumber]);

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/production-logs/', {
          params: {
            page: pageIndex + 1,
            limit: pageSize,
            product: selectedProduct || undefined,
            operation: selectedOperation || undefined,
            employee: selectedEmployee || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            model_number: modelNumber || undefined,
          },
        });
        
        setData(response.data.results || []);
        setRowCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching production logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageIndex, pageSize, selectedProduct, selectedOperation, selectedEmployee, startDate, endDate, modelNumber, refreshTrigger]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this log?')) {
      try {
        await apiClient.delete(`/production-logs/${id}/`);
        setData((prev) => prev.filter((item) => item.id !== id));
        setRowCount((prev) => prev - 1);
      } catch (error) {
        console.error('Error deleting log:', error);
        alert('Failed to delete the log. Please try again.');
      }
    }
  };

  const columns = useMemo(
    () => [
      {
        header: 'Work Date',
        accessorKey: 'work_date',
        cell: (info) => <span className="font-black text-slate-500 text-[11px] uppercase">{info.getValue()}</span>
      },
      {
        header: 'Personnel',
        accessorKey: 'employee_name',
        cell: (info) => <span className="font-black text-slate-900">{info.getValue()}</span>
      },
      {
        header: 'Product Detail',
        accessorKey: 'product_name',
        cell: (info) => (
          <div>
            <span className="font-black text-[#DC2626] uppercase text-[11px] tracking-wider block leading-tight">{info.getValue()}</span>
            {info.row.original.model_number && (
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">Model: {info.row.original.model_number}</span>
            )}
          </div>
        )
      },
      {
        header: 'Matrix Size',
        accessorKey: 'size_name',
        cell: (info) => (
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
            {info.getValue() || 'N/A'}
          </span>
        ),
      },
      {
        header: 'Output Qty',
        accessorKey: 'quantity',
        cell: (info) => (
          <span className="font-black text-slate-900 text-lg tracking-tighter">
            x{info.getValue()}
          </span>
        ),
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingLog(info.row.original)}
              className="p-1.5 bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 hover:border-blue-200"
              title="Edit"
            >
              <Edit size={14} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => handleDelete(info.row.original.id)}
              className="p-1.5 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 hover:border-red-200"
              title="Delete"
            >
              <Trash2 size={14} strokeWidth={2.5} />
            </button>
          </div>
        )
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(rowCount / pageSize),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <>
    <div className="no-print space-y-6">
      {/* FILTER CONTROL PANEL */}
      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#0F172A]" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-wider">
            <Filter size={18} className="text-[#DC2626]" strokeWidth={2.5} />
            Filter Production Logs
          </div>
          {(selectedProduct || selectedOperation || selectedEmployee || startDate || endDate || modelNumber) && (
            <button
              onClick={() => {
                setSelectedProduct('');
                setSelectedOperation('');
                setSelectedEmployee('');
                setStartDate('');
                setEndDate('');
                setModelNumber('');
              }}
              className="flex items-center gap-1 text-[10px] font-black text-[#DC2626] hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-all uppercase tracking-widest"
            >
              <X size={14} strokeWidth={3} /> Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Model Number
            </label>
            <input
              type="text"
              placeholder="Filter by model..."
              value={modelNumber}
              onChange={(e) => setModelNumber(e.target.value)}
              className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-xs text-slate-900 appearance-none cursor-pointer"
            >
              <option value="">All Personnel</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.employee_code}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-xs text-slate-900 appearance-none cursor-pointer"
            >
              <option value="">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.product_code}>{p.name} ({p.product_code})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Operation
            </label>
            <select
              value={selectedOperation}
              onChange={(e) => setSelectedOperation(e.target.value)}
              className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-xs text-slate-900 appearance-none cursor-pointer"
            >
              <option value="">All Operations</option>
              {operations.map(op => (
                <option key={op.id} value={op.operation_code}>{op.operation_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-xs text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-xs text-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-2">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-sm border border-emerald-200"
            >
              Print List
            </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-1">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-[#F8FAFC] border-b border-slate-200/60">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10 animate-in fade-in">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-[#DC2626]" size={32} strokeWidth={3} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Logs...</span>
                </div>
              </div>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-300">
                    <Activity size={40} strokeWidth={1} />
                    <span className="font-black uppercase tracking-[0.2em] text-[10px]">No Production Activity Found</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
        <Pagination 
          currentPage={pageIndex + 1}
          totalPages={table.getPageCount()}
          onPageChange={(page) => table.setPageIndex(page - 1)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(size) => table.setPageSize(Number(size))}
          totalItems={rowCount}
        />
      </div>

      {editingLog && (
        <EditProductionLogModal
          logData={editingLog}
          onClose={() => setEditingLog(null)}
          onSuccess={(updatedLog) => {
            setData((prev) => prev.map((item) => (item.id === updatedLog.id ? updatedLog : item)));
            setEditingLog(null);
          }}
        />
      )}
    </div>

    {/* PRINT TEMPLATE */}
    <PrintLayout documentType="Production Operational Logs" title={`Logs from ${startDate || 'Start'} to ${endDate || 'Today'}`}>
      <table>
        <thead>
          <tr>
            <th>Work Date</th>
            <th>Personnel</th>
            <th>Product Name</th>
            <th>Model</th>
            <th>Operation</th>
            <th>Size</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {data.map(log => (
            <tr key={log.id}>
              <td>{log.work_date}</td>
              <td>{log.employee_name}</td>
              <td>{log.product_name}</td>
              <td>{log.model_number}</td>
              <td>{log.operation_name}</td>
              <td>{log.size_name}</td>
              <td>{log.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintLayout>
    </>
  );
};

export default ProductionLogsTable;
