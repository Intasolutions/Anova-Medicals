import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import { Card, Button, Input } from '../../../components/ui/Base';
import { Alert } from '../../../components/ui/Alerts';
import { ConfirmDialog } from '../../../components/ui/Dialogs';
import { Plus, Trash2, Edit2, AlertCircle, CheckCircle, ArrowUpDown } from 'lucide-react';

const ProductSizes = () => {
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: 'info', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
  
  // Form State
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ size_name: '', display_order: 0 });

  const fetchSizes = async () => {
    try {
      const res = await apiClient.get('/product-sizes/');
      setSizes(res.data.results || res.data);
    } catch (err) {
      console.error("Error fetching sizes", err);
    }
  };

  useEffect(() => {
    fetchSizes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Alphanumeric validation (Frontend)
    const alphanumericRegex = /^[a-zA-Z0-9]*$/;
    if (!alphanumericRegex.test(formData.size_name)) {
      setAlertInfo({ isOpen: true, type: 'error', message: 'Size name must be alphanumeric only.' });
      setLoading(false);
      return;
    }

    try {
      if (editingId) {
        await apiClient.put(`/product-sizes/${editingId}/`, formData);
        setAlertInfo({ isOpen: true, type: 'success', message: 'Size updated successfully!' });
      } else {
        await apiClient.post('/product-sizes/', formData);
        setAlertInfo({ isOpen: true, type: 'success', message: 'Size created successfully!' });
      }
      setFormData({ size_name: '', display_order: 0 });
      setEditingId(null);
      fetchSizes();
    } catch (err) {
      setAlertInfo({ isOpen: true, type: 'error', message: err.response?.data?.size_name?.[0] || err.response?.data?.error || 'Operation failed.' });
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await apiClient.delete(`/product-sizes/${confirmDialog.id}/`);
      setAlertInfo({ isOpen: true, type: 'success', message: 'Size deleted successfully!' });
      fetchSizes();
    } catch (err) {
      setAlertInfo({ isOpen: true, type: 'error', message: err.response?.data?.error || 'Cannot delete: Size is in use.' });
    }
  };

  const startEdit = (size) => {
    setEditingId(size.id);
    setFormData({ size_name: size.size_name, display_order: size.display_order });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Product Sizes</h1>
          <p className="text-slate-500 font-medium">Configure global size attributes for inventory management.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Management Form */}
        <Card className="p-8 h-fit lg:sticky lg:top-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
              {editingId ? 'Edit Size' : 'Add New Size'}
            </h3>

            <Input 
              label="Size Name (e.g. XL)" 
              value={formData.size_name}
              onChange={(e) => setFormData({...formData, size_name: e.target.value.toUpperCase()})}
              placeholder="Enter alphanumeric size..."
              required
            />

            <Input 
              label="Display Order" 
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
              placeholder="e.g. 1, 2, 3..."
            />

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Processing...' : (editingId ? 'Update Size' : 'Save Size')}
              </Button>
              {editingId && (
                <Button variant="secondary" onClick={() => {
                  setEditingId(null);
                  setFormData({ size_name: '', display_order: 0 });
                }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Sizes List */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Order</th>
                  <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Size Name</th>
                  <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sizes.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-12 text-center text-slate-400 font-medium italic">
                      No sizes configured yet. Use the form to add one.
                    </td>
                  </tr>
                ) : (
                  sizes.map((size) => (
                    <tr key={size.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-black">
                          #{size.display_order}
                        </span>
                      </td>
                      <td className="p-6">
                        <span className="text-slate-900 font-bold">{size.size_name}</span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEdit(size)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => requestDelete(size.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      <Alert 
        isOpen={alertInfo.isOpen} 
        type={alertInfo.type} 
        message={alertInfo.message} 
        onClose={() => setAlertInfo({ ...alertInfo, isOpen: false })} 
      />

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title="Delete Size"
        message="Are you sure you want to delete this size? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onClose={() => setConfirmDialog({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default ProductSizes;
