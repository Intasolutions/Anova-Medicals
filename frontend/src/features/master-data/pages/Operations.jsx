import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import { Card, Button, Input } from '../../../components/ui/Base';
import { Alert } from '../../../components/ui/Alerts';
import { ConfirmDialog } from '../../../components/ui/Dialogs';
import { Plus, Trash2, Edit2, AlertCircle, CheckCircle } from 'lucide-react';

const Operations = () => {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: 'info', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ operation_code: '', operation_name: '' });

  const fetchOperations = async () => {
    try {
      const res = await apiClient.get('/operations/');
      setOperations(res.data.results || res.data);
    } catch (err) {
      console.error("Error fetching operations", err);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await apiClient.put(`/operations/${editingId}/`, formData);
        setAlertInfo({ isOpen: true, type: 'success', message: 'Operation updated successfully!' });
      } else {
        await apiClient.post('/operations/', formData);
        setAlertInfo({ isOpen: true, type: 'success', message: 'Operation created successfully!' });
      }
      setFormData({ operation_code: '', operation_name: '' });
      setEditingId(null);
      fetchOperations();
    } catch (err) {
      setAlertInfo({ 
        isOpen: true, 
        type: 'error', 
        message: err.response?.data?.operation_code?.[0] ||
                 err.response?.data?.operation_name?.[0] ||
                 err.response?.data?.error ||
                 'Action failed.'
      });
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (id) => {
    setConfirmDialog({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await apiClient.delete(`/operations/${confirmDialog.id}/`);
      setAlertInfo({ isOpen: true, type: 'success', message: 'Operation deleted successfully!' });
      fetchOperations();
    } catch (err) {
      setAlertInfo({ isOpen: true, type: 'error', message: err.response?.data?.error || 'Cannot delete: Operation is in use.' });
    }
  };

  const startEdit = (op) => {
    setEditingId(op.id);
    setFormData({ operation_code: op.operation_code, operation_name: op.operation_name });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Global Operations</h1>
          <p className="text-slate-500 font-medium">Define the physical actions that happen on the floor (e.g., Cutting, Stitching).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Management Form */}
        <Card className="p-8 h-fit lg:sticky lg:top-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
              {editingId ? 'Edit Operation' : 'Add New Operation'}
            </h3>


            <Input
              label="Operation Name (e.g. Cutting)"
              value={formData.operation_name}
              onChange={(e) => setFormData({ ...formData, operation_name: e.target.value })}
              placeholder="Enter operation name..."
              required
            />

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Processing...' : (editingId ? 'Update Operation' : 'Save Operation')}
              </Button>
              {editingId && (
                <Button variant="secondary" onClick={() => {
                  setEditingId(null);
                  setFormData({ operation_code: '', operation_name: '' });
                }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Operations List */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Code</th>
                  <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Name</th>
                  <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {operations.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-12 text-center text-slate-400 font-medium italic">
                      No operations configured yet. Use the form to add one.
                    </td>
                  </tr>
                ) : (
                  operations.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-black">
                          {op.operation_code}
                        </span>
                      </td>
                      <td className="p-6">
                        <span className="text-slate-900 font-bold">{op.operation_name}</span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startEdit(op)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(op.id)}
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
        title="Delete Operation"
        message="Are you sure you want to delete this operation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onClose={() => setConfirmDialog({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Operations;
