import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import apiClient from '../../../api/apiClient';
import { Card, Button, Input, Select } from '../../../components/ui/Base';
import { useNotification } from '../../../context/NotificationContext';
import { CheckCircle, AlertCircle, IndianRupee, UserCircle, Package, Activity, Calculator, CheckSquare, X } from 'lucide-react';

const schema = z.object({
  employee_id: z.string().min(1, "Worker is required"),
  product_id: z.string().min(1, "Product is required"),
  operation_id: z.string().min(1, "Operation is required"),
  size: z.string().min(1, "Size is required"),
  quantity: z.number().min(1, "Quantity must be at least 1").int("Quantity must be a whole number"),
});

const DailyOperationEntry = ({ onSuccess }) => {
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [operations, setOperations] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [masterStocks, setMasterStocks] = useState([]);
  const [inventory, setInventory] = useState([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      quantity: ''
    }
  });

  const selectedProductId = watch("product_id");
  const selectedOperationId = watch("operation_id");

  // Fetch Master Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, prodRes, sizeRes] = await Promise.all([
          apiClient.get('/employees/'),
          apiClient.get('/products/'),
          apiClient.get('/product-sizes/')
        ]);
        const allEmp = empRes.data.results || empRes.data;
        setEmployees(allEmp.filter(e => e.is_working));

        const allProd = prodRes.data.results || prodRes.data;
        setProducts(allProd.filter(p => p.is_active && p.product_code !== "SALARY-PROD"));

        const allSizes = sizeRes.data.results || sizeRes.data;
        setSizes(allSizes.filter(s => s.is_active && s.size_name !== "DAY-WAGE"));

        // Fetch master stocks and inventory balances for validation
        const [masterRes, invRes] = await Promise.all([
          apiClient.get('/master-stocks/'),
          apiClient.get('/inventory-balances/')
        ]);
        setMasterStocks(masterRes.data.results || masterRes.data);
        setInventory(invRes.data.results || invRes.data);

      } catch (err) {
        console.error("Error fetching master data", err);
      }
    };
    fetchData();
  }, []);

  // Auto-Fetch Operations based on Product
  useEffect(() => {
    if (selectedProductId) {
      apiClient.get(`/products/${selectedProductId}/operations/`)
        .then(res => {
          const ops = res.data.results || res.data;
          setOperations(ops.filter(o => o.operation_code !== "SALARY-DAY"));
          setValue("operation_id", "");
        })
        .catch(err => console.error("Error fetching operations", err));
    } else {
      setOperations([]);
      setValue("operation_id", "");
    }
  }, [selectedProductId, setValue]);

  const selectedSizeId = watch("size");
  const [availableQuantity, setAvailableQuantity] = useState(null);

  useEffect(() => {
    if (selectedProductId && selectedOperationId && selectedSizeId && masterStocks.length > 0) {
      const master = masterStocks.find(m => String(m.product) === String(selectedProductId) && String(m.size) === String(selectedSizeId));
      const totalQty = master ? master.total_quantity : 0;
      
      const inv = inventory.find(i => String(i.product) === String(selectedProductId) && String(i.size) === String(selectedSizeId) && (String(i.operation) === String(selectedOperationId) || (!i.operation && !selectedOperationId)));
      const wipQty = inv ? inv.balance_qty : 0;
      
      setAvailableQuantity(Math.max(0, totalQty - wipQty));
    } else {
      setAvailableQuantity(null);
    }
  }, [selectedProductId, selectedOperationId, selectedSizeId, masterStocks, inventory]);

  const rawQuantity = watch("quantity");
  const currentQuantity = (typeof rawQuantity === 'number' && !isNaN(rawQuantity)) ? rawQuantity : 0;

  const currentOperation = operations.find(op => op.operation.toString() === selectedOperationId || op.id.toString() === selectedOperationId);
  const currentRate = currentOperation ? parseFloat(currentOperation.piece_rate) || 0 : 0;

  const totalPayout = !isNaN(currentRate * currentQuantity) ? (currentRate * currentQuantity).toFixed(2) : "0.00";

  const selectedEmployeeId = watch("employee_id");
  const [todayTotalPayout, setTodayTotalPayout] = useState("0.00");
  const [loadingPayout, setLoadingPayout] = useState(false);

  // Fetch Today's Total Payout for Selected Worker
  useEffect(() => {
    if (selectedEmployeeId) {
      setLoadingPayout(true);
      const todayStr = new Date().toISOString().split('T')[0];
      apiClient.get('/salary-history/', {
        params: {
          employee_id: selectedEmployeeId,
          start_date: todayStr,
          end_date: todayStr
        }
      })
      .then(res => {
        const report = res.data;
        if (report && report.length > 0) {
          setTodayTotalPayout(parseFloat(report[0].total_payout || 0).toFixed(2));
        } else {
          setTodayTotalPayout("0.00");
        }
      })
      .catch(err => console.error("Error fetching today payout", err))
      .finally(() => setLoadingPayout(false));
    } else {
      setTodayTotalPayout("0.00");
    }
  }, [selectedEmployeeId, status.message]);

  const { addNotification } = useNotification();

  const onSubmit = async (data) => {
    setLoading(true);
    setStatus({ type: '', message: '' });

    const opToSubmit = currentOperation ? currentOperation.operation : data.operation_id;
    
    if (availableQuantity !== null && data.quantity > availableQuantity) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: `You cannot enter a quantity higher than what is available. (Available: ${availableQuantity})`
      });
      setLoading(false);
      return;
    }

    const payload = { ...data, operation_id: opToSubmit };

    try {
      const res = await apiClient.post('/production-log/', payload);

      const { meta } = res.data;

      if (meta?.finished_increased) {
        addNotification({
          type: 'finished',
          title: 'Batch Completed!',
          message: `Success! This log increased Finished Goods inventory by ${meta.increase_amount}. Total stock is now ${meta.total_finished}.`
        });
      } else {
        addNotification({
          type: 'success',
          title: 'Log Recorded',
          message: 'Production log successfully saved to payroll and WIP.'
        });
      }

      setStatus({ type: 'success', message: 'Log safely recorded! Inventory and Payroll updated.' });

      reset({
        employee_id: data.employee_id,
        product_id: '',
        operation_id: '',
        size: '',
        quantity: ''
      });
      setOperations([]);
      if (onSuccess) onSuccess();
      setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Submission Failed',
        message: err.response?.data?.error || "Failed to submit log. Please try again."
      });
      setStatus({
        type: 'error',
        message: err.response?.data?.error || "Failed to submit log. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  // Custom Salary Modal State
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    employee_id: '',
    work_date: new Date().toISOString().split('T')[0],
    amount: '',
    remarks: 'Fixed Daily Wage / Custom Allowance'
  });
  const [submittingSalary, setSubmittingSalary] = useState(false);

  const handleSalarySubmit = async (e) => {
    e.preventDefault();
    if (!salaryForm.employee_id || !salaryForm.work_date || !salaryForm.amount) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields.'
      });
      return;
    }

    setSubmittingSalary(true);
    try {
      const res = await apiClient.post('/custom-salary/', salaryForm);
      addNotification({
        type: 'success',
        title: 'Salary Allocated',
        message: res.data.message || 'Custom salary successfully recorded.'
      });
      setStatus({ type: 'success', message: res.data.message || 'Custom salary successfully recorded.' });
      setShowSalaryModal(false);
      if (onSuccess) onSuccess();
      setSalaryForm({
        employee_id: '',
        work_date: new Date().toISOString().split('T')[0],
        amount: '',
        remarks: 'Fixed Daily Wage / Custom Allowance'
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Allocation Failed',
        message: err.response?.data?.error || 'Failed to record custom salary.'
      });
      setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to record custom salary.' });
    } finally {
      setSubmittingSalary(false);
    }
  };

  return (
    <div className="no-print w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* HEADER BAR WITH CUSTOM SALARY ACTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-accent" />
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Piece-Rate & Attendance Entry</h3>
          <p className="text-xs font-medium text-slate-500 mt-1">Log manufacturing batches or allocate fixed daily wages / idle allowances.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowSalaryModal(true)}
          className="flex items-center gap-2 px-6 py-3.5 bg-brand-dark hover:bg-brand-accent text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-brand-accent/20 transition-all transform active:scale-95 flex-shrink-0"
        >
          <IndianRupee size={16} className="text-brand-primary" strokeWidth={3} />
          Custom Salary Entry
        </button>
      </div>

      {/* CUSTOM SALARY MODAL */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200 animate-in slide-in-from-bottom-4">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#F8FAFC] relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-primary" />
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-primary-light text-brand-primary rounded-xl">
                  <IndianRupee size={20} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Custom Salary Allocation</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Fixed Daily Wage / Idle Allowance</p>
                </div>
              </div>
              <button
                onClick={() => setShowSalaryModal(false)}
                className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary-light/50 rounded-xl transition-all shadow-sm"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSalarySubmit} className="p-8 space-y-6 bg-white">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Employee</label>
                <select
                  value={salaryForm.employee_id}
                  onChange={(e) => setSalaryForm({ ...salaryForm, employee_id: e.target.value })}
                  className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-sm text-slate-900 appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select Employee...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Work Date</label>
                  <input
                    type="date"
                    value={salaryForm.work_date}
                    onChange={(e) => setSalaryForm({ ...salaryForm, work_date: e.target.value })}
                    className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-sm text-slate-900"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Amount (₹)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={salaryForm.amount}
                      onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                      className="w-full p-4 pl-10 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-black text-sm text-emerald-600"
                      required
                    />
                    <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Remarks / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Fixed Daily Wage, Idle Allowance, Maintenance..."
                  value={salaryForm.remarks}
                  onChange={(e) => setSalaryForm({ ...salaryForm, remarks: e.target.value })}
                  className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-sm text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowSalaryModal(false)}
                  className="px-6 py-3"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingSalary}
                  className="px-8 py-3 bg-brand-dark hover:bg-brand-accent text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg"
                >
                  {submittingSalary ? 'Allocating...' : 'Confirm Allocation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Input Form */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-8 border-slate-100 overflow-visible relative group">
              <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
              </div>

              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <UserCircle size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">1. Operator & Product</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <Select label="Select the Worker" {...register("employee_id")} error={errors.employee_id?.message}>
                  <option value="">Select Employee...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
                </Select>

                <Select label="Select the Item" {...register("product_id")} error={errors.product_id?.message}>
                  <option value="">Select Product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
            </Card>

            <Card className="p-8 border-slate-100 overflow-visible relative group">
              <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
              </div>

              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                  <Activity size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">2. Task & Quantity</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <Select label="Operation" {...register("operation_id")} error={errors.operation_id?.message} disabled={!selectedProductId || operations.length === 0}>
                  <option value="">{selectedProductId && operations.length === 0 ? 'No ops mapped' : 'Select Operation'}</option>
                  {operations.map(o => <option key={o.id} value={o.operation}>{o.operation_name}</option>)}
                </Select>

                <Select label="Size" {...register("size")} error={errors.size?.message}>
                  <option value="">Select Size...</option>
                  {sizes.map(s => <option key={s.id} value={s.id}>{s.size_name}</option>)}
                </Select>

                <div className="space-y-2">
                  <Input 
                    label={`Quantity ${availableQuantity !== null ? `(Max: ${availableQuantity})` : ''}`} 
                    type="number" 
                    placeholder="Pieces..." 
                    {...register("quantity", { 
                      valueAsNumber: true,
                      max: availableQuantity !== null ? { value: availableQuantity, message: `Maximum available is ${availableQuantity}` } : undefined
                    })} 
                    error={errors.quantity?.message} 
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Smart Logic Check Side Panel */}
          <div className="lg:col-span-4">
            <Card className="p-8 h-full border-slate-100 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-accent via-brand-secondary to-brand-primary" />

              <div>
                <div className="flex items-center gap-3 mb-8 text-brand-primary">
                  <Calculator size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">Logic Check</span>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Piece Rate</p>
                    <div className="text-2xl font-mono font-bold text-brand-secondary flex items-center gap-1">
                      <IndianRupee size={18} /> {currentRate.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Current Job Est.</p>
                    <div className="text-2xl font-mono font-bold text-slate-800 flex items-center gap-1">
                      <IndianRupee size={18} className="text-slate-400" /> {totalPayout}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Total Operator Payout (Today)</p>
                    <div className="text-4xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                      <IndianRupee size={28} className="text-brand-primary" /> {loadingPayout ? <span className="text-base font-mono text-slate-400 animate-pulse">Calculating...</span> : todayTotalPayout}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <Button type="submit" disabled={!isValid || loading} className="w-full py-5 text-lg font-bold bg-brand-primary hover:bg-brand-primary-hover text-white border-none shadow-xl shadow-brand-primary/40 transition-all">
                  {loading ? 'Committing...' : (
                    <span className="flex items-center justify-center gap-2">
                      <CheckSquare size={20} /> Submit Log
                    </span>
                  )}
                </Button>
                <p className="text-[10px] text-slate-500 text-center mt-4 font-medium uppercase tracking-widest">Inventory & Payroll auto-syncs on submit</p>
              </div>
            </Card>
          </div>

        </div>
      </form>
    </div>
  );
};

export default DailyOperationEntry;
