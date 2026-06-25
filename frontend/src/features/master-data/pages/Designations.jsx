import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import { Card, Button, Input, Pagination } from '../../../components/ui/Base';
import { Plus, Archive, Edit2, AlertCircle, CheckCircle, UserCheck, ShieldOff } from 'lucide-react';

const Designations = () => {
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', is_active: true });

  const fetchDesignations = async () => {
    try {
      const res = await apiClient.get('/designations/');
      setDesignations(res.data.results || res.data);
    } catch (err) {
      console.error("Error fetching designations", err);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        await apiClient.put(`/designations/${editingId}/`, formData);
        setSuccess('Designation updated!');
      } else {
        await apiClient.post('/designations/', formData);
        setSuccess('Designation created!');
      }
      setFormData({ name: '', is_active: true });
      setEditingId(null);
      fetchDesignations();
    } catch (err) {
      setError(err.response?.data?.name?.[0] || 'Operation failed. Ensure name is unique.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (designation) => {
    try {
      await apiClient.patch(`/designations/${designation.id}/`, {
        is_active: !designation.is_active
      });
      setSuccess(`Designation ${designation.is_active ? 'deactivated' : 'activated'}!`);
      fetchDesignations();
    } catch (err) {
      setError('Failed to update status.');
    }
  };

  const startEdit = (designation) => {
    setEditingId(designation.id);
    setFormData({ name: designation.name, is_active: designation.is_active });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination logic
  const totalPages = Math.ceil(designations.length / rowsPerPage);
  const paginatedData = designations.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleRowsChange = (val) => {
    setRowsPerPage(Number(val));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Designations</h1>
        <p className="text-slate-500 font-medium">Manage employee roles and job titles across the organization.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Management Form */}
        <Card className="p-8 h-fit lg:sticky lg:top-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
              {editingId ? 'Edit Role' : 'Add New Role'}
            </h3>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-center gap-3 text-sm font-bold">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center gap-3 text-sm font-bold">
                <CheckCircle size={18} /> {success}
              </div>
            )}

            <Input
              label="Designation Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Supervisor, Tailor..."
              required
            />

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Processing...' : (editingId ? 'Update Role' : 'Save Role')}
              </Button>
              {editingId && (
                <Button variant="secondary" onClick={() => {
                  setEditingId(null);
                  setFormData({ name: '', is_active: true });
                }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Designations List */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Role Name</th>
                  <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-12 text-center text-slate-400 font-medium italic">
                      No designations defined yet.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((role) => (
                    <tr key={role.id} className={`hover:bg-slate-50/50 transition-colors group ${!role.is_active ? 'opacity-50' : ''}`}>
                      <td className="p-6">
                        {role.is_active ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full w-fit">
                            <UserCheck size={12} /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full w-fit">
                            <ShieldOff size={12} /> Archived
                          </span>
                        )}
                      </td>
                      <td className="p-6">
                        <span className={`font-bold ${role.is_active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                          {role.name}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(role)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => toggleStatus(role)}
                            className={`p-2 text-slate-400 transition-all rounded-xl ${role.is_active ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title={role.is_active ? 'Archive' : 'Restore'}
                          >
                            <Archive size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleRowsChange}
              totalItems={designations.length}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Designations;
