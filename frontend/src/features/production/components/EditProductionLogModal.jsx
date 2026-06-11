import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import apiClient from '../../../api/apiClient';
import { Button, Input, Select } from '../../../components/ui/Base';
import { X, Loader2 } from 'lucide-react';

const schema = z.object({
  employee_id: z.string().or(z.number()).transform(v => String(v)).refine(v => v.length > 0, "Worker is required"),
  product_id: z.string().or(z.number()).transform(v => String(v)).refine(v => v.length > 0, "Product is required"),
  operation_id: z.string().or(z.number()).transform(v => String(v)).refine(v => v.length > 0, "Operation is required"),
  size_id: z.string().or(z.number()).transform(v => String(v)).refine(v => v.length > 0, "Size is required"),
  quantity: z.number().optional(),
  amount_earned: z.number().optional(),
  work_date: z.string().min(1, "Work date is required"),
}).refine(data => data.quantity !== undefined || data.amount_earned !== undefined, {
  message: "Either quantity or amount is required",
  path: ["quantity"]
});

const EditProductionLogModal = ({ logData, onClose, onSuccess }) => {
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [operations, setOperations] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      employee_id: String(logData.employee),
      product_id: String(logData.product),
      operation_id: String(logData.operation),
      size_id: String(logData.size),
      quantity: logData.quantity,
      amount_earned: logData.amount_earned ? Number(logData.amount_earned) : 0,
      work_date: logData.work_date,
    }
  });

  const selectedProductId = watch("product_id");
  const isCustomSalary = logData.product_name === "Custom Salary Allocation" || String(logData.operation_name).includes("Salary");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [empRes, prodRes, sizeRes] = await Promise.all([
          apiClient.get('/employees/'),
          apiClient.get('/products/'),
          apiClient.get('/product-sizes/')
        ]);
        
        const allEmp = empRes.data.results || empRes.data;
        setEmployees(allEmp.filter(e => e.is_working || e.id === logData.employee));

        const allProd = prodRes.data.results || prodRes.data;
        setProducts(allProd.filter(p => p.is_active || p.id === logData.product));

        const allSizes = sizeRes.data.results || sizeRes.data;
        setSizes(allSizes.filter(s => s.is_active || s.id === logData.size));
      } catch (err) {
        console.error("Error fetching master data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [logData]);

  useEffect(() => {
    if (selectedProductId) {
      apiClient.get(`/products/${selectedProductId}/operations/`)
        .then(res => {
          const ops = res.data.results || res.data;
          setOperations(ops);
          
          if (String(selectedProductId) !== String(logData.product)) {
            setValue("operation_id", "");
          } else {
            setValue("operation_id", String(logData.operation));
          }
        })
        .catch(err => console.error("Error fetching operations", err));
    } else {
      setOperations([]);
      setValue("operation_id", "");
    }
  }, [selectedProductId, logData.product, logData.operation, setValue]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await apiClient.patch(`/production-logs/${logData.id}/`, data);
      onSuccess(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update log.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200 animate-in slide-in-from-bottom-4">
        
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#F8FAFC] relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#DC2626]" />
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Edit Production Log</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {logData.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-[#DC2626] hover:border-[#DC2626] hover:bg-red-50 rounded-xl transition-all shadow-sm"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-[#DC2626]" size={40} />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Form...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 bg-white">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select label="Worker" {...register("employee_id")} error={errors.employee_id?.message}>
                <option value="">Select Employee...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
              </Select>
              
              <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Work Date</label>
                  <input
                    type="date"
                    {...register("work_date")}
                    className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-sm text-slate-900"
                  />
                  {errors.work_date && <p className="text-xs text-red-500 mt-1">{errors.work_date.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select label="Product" {...register("product_id")} error={errors.product_id?.message} disabled={isCustomSalary}>
                <option value="">Select Product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>

              <Select label="Operation" {...register("operation_id")} error={errors.operation_id?.message} disabled={!selectedProductId || operations.length === 0 || isCustomSalary}>
                <option value="">{selectedProductId && operations.length === 0 ? 'No ops mapped' : 'Select Operation'}</option>
                {operations.map(o => <option key={o.id} value={o.operation || o.operation_id || o.id}>{o.operation_name}</option>)}
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select label="Size" {...register("size_id")} error={errors.size_id?.message} disabled={isCustomSalary}>
                <option value="">Select Size...</option>
                {sizes.map(s => <option key={s.id} value={s.id}>{s.size_name}</option>)}
              </Select>

              {isCustomSalary ? (
                <Input label="Amount (₹)" type="number" step="0.01" placeholder="₹..." {...register("amount_earned", { valueAsNumber: true })} error={errors.amount_earned?.message} />
              ) : (
                <Input label="Quantity" type="number" placeholder="Pieces..." {...register("quantity", { valueAsNumber: true })} error={errors.quantity?.message} />
              )}
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
              <Button type="button" variant="ghost" onClick={onClose} className="px-6 py-3">
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid || submitting} className="px-8 py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg">
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditProductionLogModal;
