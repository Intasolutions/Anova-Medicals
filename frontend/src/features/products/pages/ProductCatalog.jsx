import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import { Card, Button, Input, TableContainer, Thead, Th, Tbody, Tr, Td, Pagination } from '../../../components/ui/Base';
import { Alert } from '../../../components/ui/Alerts';
import PrintLayout from '../../../components/print/PrintLayout';
import { ConfirmDialog } from '../../../components/ui/Dialogs';
import { Plus, Package, Hash, IndianRupee, Layers, CheckCircle, AlertCircle, Search, DatabaseZap, Box, ShieldCheck, Trash2, Activity, Edit2, Eye, X, Download, Printer } from 'lucide-react';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [operations, setOperations] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: 'info', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    product_code: '',
    model_number: '',
    price_per_unit: '',
    photo: null,
    operations: [], // Array of {operation_id, piece_rate}
    sizes: [], // Array of {size_id, total_quantity}
  });

  const fetchData = async () => {
    try {
      const [prodRes, opsRes, sizesRes] = await Promise.all([
        apiClient.get('/products/', {
          params: {
            start_date: startDate || undefined,
            end_date: endDate || undefined,
          }
        }),
        apiClient.get('/operations/'),
        apiClient.get('/product-sizes/')
      ]);
      setProducts(prodRes.data.results || prodRes.data);
      setOperations(opsRes.data.results || opsRes.data);
      setSizes((sizesRes.data.results || sizesRes.data).filter(s => s.is_active !== false));
    } catch (err) {
      console.error("Error fetching data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleAddOperation = () => {
    setFormData({
      ...formData,
      operations: [...formData.operations, { operation_id: '', piece_rate: '' }]
    });
  };

  const handleOperationChange = (index, field, value) => {
    const updatedOps = [...formData.operations];
    updatedOps[index][field] = value;
    setFormData({ ...formData, operations: updatedOps });
  };

  const handleRemoveOperation = (index) => {
    const updatedOps = formData.operations.filter((_, i) => i !== index);
    setFormData({ ...formData, operations: updatedOps });
  };

  const handleAddSize = () => {
    setFormData({
      ...formData,
      sizes: [...formData.sizes, { size_id: '', total_quantity: 0 }]
    });
  };

  const handleSizeChange = (index, field, value) => {
    const updatedSizes = [...formData.sizes];
    updatedSizes[index][field] = value;
    setFormData({ ...formData, sizes: updatedSizes });
  };

  const handleRemoveSize = (index) => {
    const updatedSizes = formData.sizes.filter((_, i) => i !== index);
    setFormData({ ...formData, sizes: updatedSizes });
  };

  const resetForm = () => {
    setFormData({ name: '', product_code: '', model_number: '', price_per_unit: '', photo: null, operations: [], sizes: [] });
    setEditingProduct(null);
    setShowAddForm(false);
    setAlertInfo({ ...alertInfo, isOpen: false });
  };

  const startEdit = async (prod) => {
    setLoading(true);
    try {
      const [opsRes, stockRes] = await Promise.all([
        apiClient.get(`/products/${prod.id}/operations/`),
        apiClient.get(`/products/${prod.id}/master_stocks/`)
      ]);

      const existingOps = opsRes.data.map(op => ({
        operation_id: op.operation,
        piece_rate: op.piece_rate
      }));

      const existingSizes = stockRes.data.map(st => ({
        size_id: st.size,
        total_quantity: st.total_quantity
      }));

      setEditingProduct(prod);
      setFormData({
        name: prod.name,
        product_code: prod.product_code,
        model_number: prod.model_number || '',
        price_per_unit: prod.price_per_unit,
        photo: null,
        operations: existingOps,
        sizes: existingSizes
      });
      setShowAddForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setAlertInfo({ isOpen: true, type: 'error', message: "Failed to load product data." });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (prod) => {
    setLoading(true);
    try {
      const [opsRes, stockRes] = await Promise.all([
        apiClient.get(`/products/${prod.id}/operations/`),
        apiClient.get(`/products/${prod.id}/master_stocks/`)
      ]);
      setSelectedProductForDetails({ ...prod, linked_operations: opsRes.data, master_stocks: stockRes.data });
    } catch (err) {
      setAlertInfo({ isOpen: true, type: 'error', message: "Failed to load details." });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectPrint = async (prod) => {
    setLoading(true);
    try {
      const [opsRes, stockRes] = await Promise.all([
        apiClient.get(`/products/${prod.id}/operations/`),
        apiClient.get(`/products/${prod.id}/master_stocks/`)
      ]);
      setSelectedProductForDetails({ ...prod, linked_operations: opsRes.data, master_stocks: stockRes.data });
      
      // Let the DOM render the PrintLayout, then trigger print dialog
      setTimeout(() => {
        window.print();
        setSelectedProductForDetails(null); // Return directly to list
      }, 100);
    } catch (err) {
      setAlertInfo({ isOpen: true, type: 'error', message: "Failed to load product for printing." });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDetails = () => {
    window.print();
  };

  const requestDelete = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await apiClient.delete(`/products/${confirmDialog.id}/`);
      setAlertInfo({ isOpen: true, type: 'success', message: 'Product deleted successfully.' });
      fetchData();
    } catch (err) {
      setAlertInfo({ isOpen: true, type: 'error', message: "Failed to delete product. It might be linked to existing production logs." });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (formData.operations.length === 0) {
      setAlertInfo({ isOpen: true, type: 'error', message: 'Every product must have at least one manufacturing operation assigned to track finished goods.' });
      setLoading(false);
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('product_code', formData.product_code);
      submitData.append('model_number', formData.model_number || '');
      submitData.append('price_per_unit', formData.price_per_unit);
      if (formData.photo instanceof File) {
        submitData.append('photo', formData.photo);
      }
      submitData.append('operations', JSON.stringify(formData.operations));
      submitData.append('sizes', JSON.stringify(formData.sizes));

      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}/`, submitData);
        setAlertInfo({ isOpen: true, type: 'success', message: 'Product updated successfully!' });
      } else {
        await apiClient.post('/products/', submitData);
        setAlertInfo({ isOpen: true, type: 'success', message: 'Product initialized successfully!' });
      }
      resetForm();
      fetchData();
    } catch (err) {
      setAlertInfo({ isOpen: true, type: 'error', message: err.response?.data?.error || 'Operation failed. Check if codes are unique.' });
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.model_number && p.model_number.toLowerCase().includes(searchTerm.toLowerCase()));
                          
    const matchesStatus = filterStatus === 'All' ? true : 
                          filterStatus === 'Active' ? p.is_active === true : 
                          p.is_active === false;

    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Reset to page 1 when search or rowsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  return (
    <>
    <div className="no-print space-y-8 animate-in fade-in duration-500 w-full max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-[#0F172A] rounded-2xl shadow-lg shadow-slate-900/20 border border-slate-700">
              <Box className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">Inventory Master</span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Product Catalog</h1>
            </div>
          </div>
          <p className="text-slate-500 font-medium text-sm pl-1 mt-3">Master registry for manufactured garments and operational piece-rates.</p>
        </div>
        <Button 
          onClick={() => {
            if (showAddForm) resetForm();
            else setShowAddForm(true);
          }}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm rounded-xl transition-all duration-300 uppercase tracking-widest ${showAddForm ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-[#DC2626] hover:bg-red-700 text-white shadow-[0_8px_20px_-6px_rgba(220,38,38,0.5)] transform active:scale-95'}`}
        >
          {showAddForm ? 'Cancel Registration' : <><Plus size={18} strokeWidth={3} /> New Product</>}
        </Button>
      </div>

      {/* REGISTRATION / EDIT FORM */}
      {showAddForm && (
        <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] p-8 relative overflow-hidden animate-in slide-in-from-top-4">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#0F172A]" />
          
          <div className="mb-8 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#DC2626]" />
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {editingProduct ? `Edit: ${editingProduct.name}` : 'Product Initialization'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Input label="Product Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="focus:ring-[#DC2626]/10 focus:border-[#DC2626]" />
              <Input label="Product Code" value={formData.product_code} onChange={e => setFormData({...formData, product_code: e.target.value})} required disabled={!!editingProduct} className={`focus:ring-[#DC2626]/10 focus:border-[#DC2626] ${editingProduct ? 'opacity-50' : ''}`} />
              <Input label="Model Number" value={formData.model_number} onChange={e => setFormData({...formData, model_number: e.target.value})} className="focus:ring-[#DC2626]/10 focus:border-[#DC2626]" />
              <Input label="Price Per Unit" type="number" value={formData.price_per_unit} onChange={e => setFormData({...formData, price_per_unit: e.target.value})} required className="focus:ring-[#DC2626]/10 focus:border-[#DC2626]" />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Product Photo</label>
              <div className="flex items-center gap-4">
                {formData.photo instanceof File ? (
                  <img src={URL.createObjectURL(formData.photo)} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                ) : editingProduct?.photo ? (
                  <img src={editingProduct.photo} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 border-dashed text-slate-400">
                    <Package size={20} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files[0]) {
                      setFormData({ ...formData, photo: e.target.files[0] });
                    }
                  }}
                  className="text-sm font-semibold text-slate-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wider file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-all cursor-pointer outline-none"
                />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  <Layers size={14} className="text-[#DC2626]" /> Assign Piece-Rate Operations
                  <span className="ml-4 px-3 py-1 bg-red-50 text-[#DC2626] rounded text-[10px] shadow-sm border border-red-100">
                    Total Op. Cost: ₹ {formData.operations.reduce((total, op) => total + (parseFloat(op.piece_rate) || 0), 0).toFixed(2)}
                  </span>
                </div>
                <Button type="button" variant="ghost" onClick={handleAddOperation} className="text-[10px] py-2 px-4 rounded-lg">
                  <Plus size={14} strokeWidth={3} className="inline mr-1" /> Add Task
                </Button>
              </div>
              
              {formData.operations.length === 0 ? (
                <div className="text-xs font-bold text-slate-400 py-10 bg-slate-50 rounded-2xl border border-slate-200 border-dashed text-center flex flex-col items-center gap-2">
                  <Activity size={24} className="text-slate-200" />
                  No tasks linked. Every product must have at least one manufacturing operation.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.operations.map((op, index) => (
                    <div key={index} className="flex items-center gap-4 p-5 bg-[#F8FAFC] rounded-2xl border border-slate-200/60 shadow-sm transition-all hover:shadow-md group relative">
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Manufacturing Process</label>
                        <select 
                          className="w-full bg-white text-sm font-black text-slate-700 outline-none border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#DC2626] transition-all cursor-pointer"
                          value={op.operation_id}
                          onChange={e => handleOperationChange(index, 'operation_id', e.target.value)}
                          required
                        >
                          <option value="" disabled>Select Task...</option>
                          {operations.map(o => {
                            const isSelected = formData.operations.some((existingOp, i) => i !== index && existingOp.operation_id === o.id);
                            return (
                              <option key={o.id} value={o.id} disabled={isSelected}>
                                {o.operation_name} {isSelected ? '(Already Assigned)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="w-32">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Piece Rate (₹)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.01"
                            className="w-full bg-white text-sm font-black text-emerald-600 outline-none border border-slate-200 rounded-xl px-4 py-2.5 focus:border-emerald-500 transition-all text-right pr-8"
                            value={op.piece_rate}
                            onChange={e => handleOperationChange(index, 'piece_rate', e.target.value)}
                            required
                          />
                          <IndianRupee size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 opacity-50" />
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveOperation(index)}
                        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  <Package size={14} className="text-[#DC2626]" /> Initial Size Allocations (Master Stock)
                </div>
                <Button type="button" variant="ghost" onClick={handleAddSize} className="text-[10px] py-2 px-4 rounded-lg">
                  <Plus size={14} strokeWidth={3} className="inline mr-1" /> Add Size
                </Button>
              </div>
              
              {formData.sizes.length === 0 ? (
                <div className="text-xs font-bold text-slate-400 py-6 bg-slate-50 rounded-2xl border border-slate-200 border-dashed text-center">
                  No initial stock defined. Master stock validates daily production entry.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.sizes.map((sz, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200/60 shadow-sm">
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Size</label>
                        <select 
                          className="w-full bg-white text-sm font-black text-slate-700 outline-none border border-slate-200 rounded-xl px-4 py-2 focus:border-[#DC2626] transition-all cursor-pointer"
                          value={sz.size_id}
                          onChange={e => handleSizeChange(index, 'size_id', e.target.value)}
                          required
                        >
                          <option value="" disabled>Select...</option>
                          {sizes.map(s => {
                            const isSelected = formData.sizes.some((existingSz, i) => i !== index && existingSz.size_id === s.id);
                            return (
                              <option key={s.id} value={s.id} disabled={isSelected}>
                                {s.size_name} {isSelected ? '(Selected)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Qty</label>
                        <input 
                          type="number" 
                          className="w-full bg-white text-sm font-black text-slate-700 outline-none border border-slate-200 rounded-xl px-4 py-2 focus:border-[#DC2626] transition-all"
                          value={sz.total_quantity}
                          onChange={e => handleSizeChange(index, 'total_quantity', parseInt(e.target.value))}
                          required
                          min="0"
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSize(index)}
                        className="p-2 mt-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100 mt-2 gap-4">
              {editingProduct && (
                <Button type="button" variant="ghost" onClick={resetForm} className="px-8 py-4">
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" disabled={loading} className="px-12 py-4 bg-[#0F172A] hover:bg-slate-800 text-white font-black text-sm rounded-xl shadow-lg transition-all uppercase tracking-widest">
                {loading ? 'Processing Data...' : editingProduct ? 'Update Product' : 'Finalize Product Registration'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER & SEARCH CONTROL PANEL */}
      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#0F172A]" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-wider">
            <Search size={18} className="text-[#DC2626]" strokeWidth={2.5} />
            Filter & Search Catalog
          </div>
          {(startDate || endDate || searchTerm) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
              }}
              className="flex items-center gap-1 text-[10px] font-black text-[#DC2626] hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-all uppercase tracking-widest"
            >
              <X size={14} strokeWidth={3} /> Clear Filters
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4 w-full sm:w-auto flex-1">
            <div className="relative group flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#DC2626] transition-colors" size={20} />
              <input
                type="text"
                placeholder="Query by product name or ID code..."
                className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200/60 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus:ring-4 focus:ring-[#DC2626]/10 focus:border-[#DC2626] outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-full bg-white border border-slate-200/60 rounded-2xl px-4 py-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus:ring-4 focus:ring-[#DC2626]/10 focus:border-[#DC2626] text-slate-700 font-bold outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Models</option>
                <option value="Inactive">Archived</option>
              </select>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-sm border border-emerald-200"
            >
              Print List
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-6 space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Reg. Date (From)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-xs text-slate-900"
            />
          </div>

          <div className="md:col-span-3 space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Reg. Date (To)
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

      <div className="space-y-4">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] overflow-hidden p-1">
          <TableContainer className="border-none shadow-none">
            <Thead className="bg-[#F8FAFC] border-b border-slate-200/60">
              <Th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-5">Product Identity</Th>
              <Th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-5 text-center">Batch Attributes</Th>
              <Th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-5 text-right">Market Valuation</Th>
              <Th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-5 text-right">Total Op. Cost</Th>
              <Th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-5 text-right">Actions</Th>
            </Thead>
            <Tbody className="divide-y divide-slate-100">
              {paginatedProducts.map(prod => (
                <Tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                  <Td className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#0F172A] flex items-center justify-center flex-shrink-0 border border-slate-700 shadow-sm text-white overflow-hidden">
                        {prod.photo ? (
                          <img src={prod.photo} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} strokeWidth={2.5} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-tight">{prod.name}</h3>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-[#DC2626] uppercase tracking-[0.15em] mt-1">
                          <Hash size={10} strokeWidth={3} /> {prod.product_code}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-center">
                    <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60 uppercase tracking-wider">
                      Model: {prod.model_number || 'STD-M1'}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex flex-col items-end">
                      <div className="flex items-center gap-1 text-emerald-600">
                        <IndianRupee size={14} strokeWidth={3} />
                        <span className="text-lg font-black tracking-tighter">{parseFloat(prod.price_per_unit).toLocaleString('en-IN')}</span>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">PER UNIT RATE</span>
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex flex-col items-end">
                      <div className="flex items-center gap-1 text-red-600">
                        <IndianRupee size={14} strokeWidth={3} />
                        <span className="text-lg font-black tracking-tighter">{parseFloat(prod.total_operational_cost || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">OP. COST / UNIT</span>
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button onClick={() => handleDirectPrint(prod)} className="p-2.5 bg-slate-100 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group" title="Print Product">
                        <Printer size={16} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                      </button>
                      <button onClick={() => handleViewDetails(prod)} className="p-2.5 bg-slate-100 text-slate-600 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors group" title="View Operations">
                        <Eye size={16} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                      </button>
                      <button onClick={() => startEdit(prod)} className="p-2.5 bg-slate-100 text-slate-600 hover:text-[#0F172A] hover:bg-slate-200 rounded-lg transition-colors" title="Edit Product">
                        <Edit2 size={16} strokeWidth={2.5} />
                      </button>
                      <button onClick={() => requestDelete(prod.id)} className="p-2.5 bg-slate-100 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Product">
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </TableContainer>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="grid grid-cols-1 md:hidden gap-4">
          {paginatedProducts.map(prod => (
            <div key={`mobile-${prod.id}`} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-sm overflow-hidden">
              <div className="p-5 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#0F172A] flex items-center justify-center flex-shrink-0 border border-slate-700 shadow-sm text-white overflow-hidden">
                    {prod.photo ? (
                      <img src={prod.photo} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={24} strokeWidth={2} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">{prod.name}</h3>
                    <p className="text-[10px] font-black text-[#DC2626] uppercase tracking-widest mt-1">ID: {prod.product_code}</p>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-4 bg-[#F8FAFC] border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Model / Batch</p>
                  <p className="text-xs font-black text-slate-700 uppercase">{prod.model_number || 'STANDARD'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">MSRP Payout</p>
                  <div className="flex items-center gap-1 text-emerald-600 font-black text-lg leading-none justify-end">
                    <IndianRupee size={14} strokeWidth={3} /> {prod.price_per_unit}
                  </div>
                  <div className="mt-2 text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">OP. COST</p>
                    <div className="flex items-center gap-1 text-red-600 font-black text-sm leading-none justify-end">
                      <IndianRupee size={12} strokeWidth={3} /> {parseFloat(prod.total_operational_cost || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 flex gap-2 border-t border-slate-100">
                <button onClick={() => handleDirectPrint(prod)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2 hover:bg-emerald-50 hover:text-emerald-600">
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => handleViewDetails(prod)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Eye size={14} /> Details
                </button>
                <button onClick={() => startEdit(prod)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Edit2 size={14} /> Edit
                </button>
                <button onClick={() => requestDelete(prod.id)} className="p-2.5 bg-slate-100 text-slate-300 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            totalItems={filteredProducts.length}
          />
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedProductForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col border border-slate-200 max-h-[90vh]">
            
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-[#F8FAFC] relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#DC2626]" />
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-[#0F172A] flex items-center justify-center border border-slate-700 shadow-xl text-white overflow-hidden">
                  {selectedProductForDetails.photo ? (
                    <img src={selectedProductForDetails.photo} alt={selectedProductForDetails.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={32} strokeWidth={2} />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedProductForDetails.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-[#DC2626] uppercase tracking-[0.2em] bg-red-50 px-2 py-0.5 rounded">ID: {selectedProductForDetails.product_code}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Model: {selectedProductForDetails.model_number || 'STD-001'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintDetails}
                  className="p-3 bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm flex items-center justify-center no-print"
                  title="Print to PDF"
                >
                  <Download size={20} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setSelectedProductForDetails(null)}
                  className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-[#DC2626] hover:border-[#DC2626] hover:bg-red-50 rounded-2xl transition-all shadow-sm flex items-center justify-center no-print"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Product Photo Full View */}
              {selectedProductForDetails.photo && (
                <div className="w-full h-64 md:h-96 rounded-3xl overflow-hidden border border-slate-200/60 shadow-inner bg-slate-50 flex items-center justify-center">
                  <img src={selectedProductForDetails.photo} alt={selectedProductForDetails.name} className="w-full h-full object-contain p-2" />
                </div>
              )}

              {/* Product Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Market Valuation (MSRP)</p>
                  <div className="text-3xl font-black text-emerald-600 flex items-center gap-2">
                    <IndianRupee size={24} strokeWidth={3} /> {parseFloat(selectedProductForDetails.price_per_unit).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Op. Cost</p>
                  <div className="text-3xl font-black text-red-600 flex items-center gap-2">
                    <IndianRupee size={24} strokeWidth={3} /> {parseFloat(selectedProductForDetails.total_operational_cost || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col justify-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Active Product</span>
                  </div>
                </div>
              </div>

              {/* Linked Operations Table */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  <Layers size={14} className="text-[#DC2626]" /> Assigned Manufacturing Tasks
                </div>
                
                <div className="border border-slate-200/60 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <th className="px-6 py-4">Operation Name</th>
                        <th className="px-6 py-4">Code</th>
                        <th className="px-6 py-4 text-right">Piece Rate (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedProductForDetails.linked_operations?.map(op => (
                        <tr key={op.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-black text-slate-900 uppercase text-xs tracking-wide">{op.operation_name}</td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-400 tracking-widest">{op.operation_code}</td>
                          <td className="px-6 py-4 text-right font-black text-emerald-600 text-base tracking-tighter">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(op.piece_rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Master Stocks Table */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  <DatabaseZap size={14} className="text-[#DC2626]" /> Initial Master Stock Configurations
                </div>
                
                <div className="border border-slate-200/60 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <th className="px-6 py-4">Size Name</th>
                        <th className="px-6 py-4 text-right">Master Quantity Allocated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedProductForDetails.master_stocks?.length === 0 ? (
                        <tr>
                          <td colSpan="2" className="px-6 py-8 text-center text-slate-400 font-bold text-xs">No initial master stock defined for any sizes.</td>
                        </tr>
                      ) : (
                        selectedProductForDetails.master_stocks?.map(st => (
                          <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-black text-slate-900 uppercase text-xs tracking-wide">{st.size_name}</td>
                            <td className="px-6 py-4 text-right font-black text-[#0F172A] text-base tracking-tighter">
                              {st.total_quantity} Units
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-[#F8FAFC] flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  const prod = selectedProductForDetails;
                  setSelectedProductForDetails(null);
                  startEdit(prod);
                }}
                className="px-8 flex items-center gap-2"
              >
                <Edit2 size={14} /> Edit Catalog
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedProductForDetails(null)}
                className="px-8"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}

      <Alert 
        isOpen={alertInfo.isOpen} 
        type={alertInfo.type} 
        message={alertInfo.message} 
        onClose={() => setAlertInfo({ ...alertInfo, isOpen: false })} 
      />

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title="Delete Product"
        message="Are you sure you want to delete this product? This will also remove inventory and production records linked to it."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onClose={() => setConfirmDialog({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
      />
    </div>

    {/* PRINT TEMPLATES */}
    {selectedProductForDetails ? (
      <PrintLayout documentType="Product Profile" title="Product Master Record">
        <div className="flex gap-8 mb-8">
          <div className="w-32 h-32 border-4 border-slate-200 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50">
            {selectedProductForDetails.photo ? (
              <img src={selectedProductForDetails.photo} alt={selectedProductForDetails.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-slate-300">N/A</span>
            )}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-y-4">
            <div><strong className="text-slate-500">Product Name:</strong> <br/><span className="text-lg font-bold">{selectedProductForDetails.name}</span></div>
            <div><strong className="text-slate-500">Product Code:</strong> <br/><span className="text-lg font-bold">{selectedProductForDetails.product_code}</span></div>
            <div><strong className="text-slate-500">Model Number:</strong> <br/><span>{selectedProductForDetails.model_number || 'N/A'}</span></div>
            <div><strong className="text-slate-500">Price (MSRP):</strong> <br/><span>Rs. {parseFloat(selectedProductForDetails.price_per_unit).toLocaleString('en-IN')}</span></div>
            <div><strong className="text-slate-500">Status:</strong> <br/><span>{selectedProductForDetails.is_active ? 'Active Model' : 'Inactive'}</span></div>
          </div>
        </div>

        {selectedProductForDetails.linked_operations && selectedProductForDetails.linked_operations.length > 0 && (
          <div className="mb-8">
            <h4 className="font-bold mb-2">Assigned Manufacturing Tasks</h4>
            <table>
              <thead>
                <tr>
                  <th>Operation Name</th>
                  <th>Operation Code</th>
                  <th>Piece Rate (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {selectedProductForDetails.linked_operations.map(op => (
                  <tr key={op.id}>
                    <td>{op.operation_name}</td>
                    <td>{op.operation_code}</td>
                    <td>{parseFloat(op.piece_rate).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-right">
              <strong className="text-slate-700 uppercase tracking-widest text-sm">Total Operational Cost: </strong>
              <span className="text-lg font-black text-red-600">Rs. {parseFloat(selectedProductForDetails.total_operational_cost || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        {selectedProductForDetails.master_stocks && selectedProductForDetails.master_stocks.length > 0 && (
          <div className="mb-8">
            <h4 className="font-bold mb-2">Initial Master Stock</h4>
            <table>
              <thead>
                <tr>
                  <th>Size / Variant</th>
                  <th>Allocated Quantity</th>
                </tr>
              </thead>
              <tbody>
                {selectedProductForDetails.master_stocks.map(st => (
                  <tr key={st.id}>
                    <td>{st.size_name}</td>
                    <td>{st.total_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PrintLayout>
    ) : (
      <PrintLayout documentType="Product Catalog List" title={`Master List`}>
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Code</th>
              <th>Model</th>
              <th>Price (Rs.)</th>
              <th>Total Op. Cost (Rs.)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(prod => (
              <tr key={prod.id}>
                <td>{prod.name}</td>
                <td>{prod.product_code}</td>
                <td>{prod.model_number || 'N/A'}</td>
                <td>{parseFloat(prod.price_per_unit).toFixed(2)}</td>
                <td>{parseFloat(prod.total_operational_cost || 0).toFixed(2)}</td>
                <td>{prod.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintLayout>
    )}
    </>
  );
};

export default ProductCatalog;
