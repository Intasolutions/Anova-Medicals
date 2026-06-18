import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import { Card, Button, Input, Select, TableContainer, Thead, Th, Tbody, Tr, Td, Pagination } from '../../../components/ui/Base';
import { Alert } from '../../../components/ui/Alerts';
import { ConfirmDialog } from '../../../components/ui/Dialogs';
import PrintLayout from '../../../components/print/PrintLayout';
import { Plus, Search, Phone, Calendar, FileText, DatabaseZap, ShieldCheck, Edit2, Eye, X, User, MapPin, Briefcase, Camera, Download, Loader2, Trash2 } from 'lucide-react';

const EmployeeRegistry = () => {
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmpForDetails, setSelectedEmpForDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: 'info', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    employee_code: '',
    designation: '',
    contact_number: '',
    address: '',
    date_of_birth: '',
    date_of_joining: '',
    photo: null,
    id_proof: null,
    is_working: true
  });

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get('/employees/');
      setEmployees(res.data.results || res.data);
    } catch (err) {
      console.error("Error fetching employees", err);
    }
  };

  const fetchDesignations = async () => {
    try {
      const res = await apiClient.get('/designations/');
      setDesignations((res.data.results || res.data).filter(d => d.is_active));
    } catch (err) {
      console.error("Error fetching designations", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDesignations();
  }, []);

  const handleFileChange = (e, field) => {
    setFormData({ ...formData, [field]: e.target.files[0] });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      employee_code: '',
      designation: '',
      contact_number: '',
      address: '',
      date_of_birth: '',
      date_of_joining: '',
      photo: null,
      id_proof: null,
      is_working: true
    });
    setEditingEmployee(null);
    setShowAddForm(false);
    setAlertInfo({ ...alertInfo, isOpen: false });
  };

  const startEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      employee_code: emp.employee_code,
      designation: emp.designation,
      contact_number: emp.contact_number || '',
      address: emp.address || '',
      date_of_birth: emp.date_of_birth || '',
      date_of_joining: emp.date_of_joining || '',
      photo: null, // Keep existing if not changed
      id_proof: null, // Keep existing if not changed
      is_working: emp.is_working
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      // For file fields, only append if a new file is selected
      if ((key === 'photo' || key === 'id_proof') && formData[key] === null) {
        return;
      }

      if (formData[key] !== null && formData[key] !== undefined) {
        if (typeof formData[key] === 'boolean') {
          data.append(key, formData[key] ? 'true' : 'false');
        } else {
          data.append(key, formData[key]);
        }
      }
    });

    try {
      if (editingEmployee) {
        await apiClient.put(`/employees/${editingEmployee.id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await apiClient.post('/employees/', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      resetForm();
      fetchEmployees();
      setAlertInfo({ isOpen: true, type: 'success', message: editingEmployee ? 'Employee updated successfully!' : 'Employee registered successfully!' });
    } catch (err) {
      setAlertInfo({ isOpen: true, type: 'error', message: err.response?.data?.error || "Registration failed." });
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
      await apiClient.delete(`/employees/${confirmDialog.id}/`);
      setAlertInfo({ isOpen: true, type: 'success', message: 'Employee deleted successfully.' });
      fetchEmployees();
    } catch (err) {
      setAlertInfo({ isOpen: true, type: 'error', message: "Failed to delete employee. They might be linked to existing records." });
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'Active') return matchesSearch && emp.is_working;
    if (filterStatus === 'Resigned') return matchesSearch && !emp.is_working;
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, rowsPerPage]);

  const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : 'EMP';

  return (
    <>
    <div className="no-print space-y-8 animate-in fade-in duration-500 w-full max-w-7xl mx-auto">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-[#0F172A] rounded-2xl shadow-lg shadow-slate-900/20 border border-slate-700">
              <DatabaseZap className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">Master Data</span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Employee Registry</h1>
            </div>
          </div>
          <p className="text-slate-500 font-medium text-sm pl-1 mt-3">Manage personnel, designations, and operational documents.</p>
        </div>
        <Button
          onClick={() => {
            if (showAddForm) resetForm();
            else setShowAddForm(true);
          }}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm rounded-xl transition-all duration-300 uppercase tracking-widest ${showAddForm ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-[#DC2626] hover:bg-red-700 text-white shadow-[0_8px_20px_-6px_rgba(220,38,38,0.5)] transform active:scale-95'}`}
        >
          {showAddForm ? 'Cancel Entry' : <><Plus size={18} strokeWidth={3} /> Register Personnel</>}
        </Button>
      </div>

      {/* REGISTRATION / EDIT FORM */}
      {showAddForm && (
        <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] p-8 relative overflow-hidden animate-in slide-in-from-top-4">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#0F172A]" />

          <div className="mb-8 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#DC2626]" />
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {editingEmployee ? `Update: ${editingEmployee.name}` : 'New Record Initialization'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Input label="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="focus:ring-[#DC2626]/10 focus:border-[#DC2626]" />
            <Input
              label="Employee ID / Code"
              value={formData.employee_code}
              onChange={e => setFormData({ ...formData, employee_code: e.target.value })}
              required
              className="focus:ring-[#DC2626]/10 focus:border-[#DC2626]"
            />

            <Select label="Designation" value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} required className="focus:ring-[#DC2626]/10 focus:border-[#DC2626]">
              <option value="">Select Designation</option>
              {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>

            <Input label="Contact Number" value={formData.contact_number} onChange={e => setFormData({ ...formData, contact_number: e.target.value })} required className="focus:ring-[#DC2626]/10 focus:border-[#DC2626]" />
            <Input label="Date of Birth" type="date" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} className="focus:ring-[#DC2626]/10 focus:border-[#DC2626]" />
            <Input label="Date of Joining" type="date" value={formData.date_of_joining} onChange={e => setFormData({ ...formData, date_of_joining: e.target.value })} className="focus:ring-[#DC2626]/10 focus:border-[#DC2626]" />

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Employment Status</label>
              <div className="flex items-center gap-3 bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200/60 shadow-inner">
                <input
                  type="checkbox"
                  checked={formData.is_working}
                  onChange={e => setFormData({ ...formData, is_working: e.target.checked })}
                  className="w-5 h-5 accent-[#DC2626] rounded-md cursor-pointer"
                />
                <span className="text-sm font-bold text-slate-700">Active Shift Member</span>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <Input label="Residential Address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required className="focus:ring-[#DC2626]/10 focus:border-[#DC2626]" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Profile Image {editingEmployee && '(Optional Update)'}</label>
              <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'photo')} className="text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wider file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">ID Proof (Optional Update)</label>
              <input type="file" onChange={e => handleFileChange(e, 'id_proof')} className="text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wider file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
            </div>

            <div className="lg:col-span-3 flex justify-end pt-6 border-t border-slate-100 mt-2 gap-4">
              {editingEmployee && (
                <Button type="button" variant="ghost" onClick={resetForm} className="px-8 py-4">
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" disabled={loading} className="px-12 py-4 bg-[#0F172A] hover:bg-slate-800 text-white font-black text-sm rounded-xl shadow-lg transition-all uppercase tracking-widest">
                {loading ? 'Processing Data...' : editingEmployee ? 'Update Record' : 'Commit to Database'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH BAR & FILTER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
          <div className="relative group flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#DC2626] transition-colors" size={20} />
            <input
              type="text"
              placeholder="Query by personnel name or ID code..."
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
              <option value="All">All Personnel</option>
              <option value="Active">Active Only</option>
              <option value="Resigned">Resigned Only</option>
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

      <div className="space-y-4">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] overflow-hidden p-1">
          <TableContainer className="border-none shadow-none">
            <Thead className="bg-[#F8FAFC] border-b border-slate-200/60">
              <Th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-5">Personnel</Th>
              <Th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-5">Role & Code</Th>
              <Th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-5">Contact</Th>
              <Th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-5">Status</Th>
              <Th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-5 text-right">Actions</Th>
            </Thead>
            <Tbody className="divide-y divide-slate-100">
              {paginatedEmployees.map(emp => (
                <Tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <Td className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#0F172A] flex items-center justify-center flex-shrink-0 border border-slate-700 shadow-sm overflow-hidden">
                        {emp.photo ? (
                          <img src={emp.photo} alt={emp.name} className={`w-full h-full object-cover ${!emp.is_working ? 'grayscale opacity-60' : ''}`} />
                        ) : (
                          <span className="text-white font-black text-sm tracking-widest">{getInitials(emp.name)}</span>
                        )}
                      </div>
                      <div>
                        <h3 className={`text-sm font-black ${emp.is_working ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{emp.name}</h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Joined {emp.date_of_joining || 'N/A'}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className={`text-xs font-black uppercase tracking-wider ${emp.is_working ? 'text-[#0F172A]' : 'text-slate-400'}`}>{emp.designation_name || 'Unassigned'}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">ID: <span className="text-slate-600">{emp.employee_code}</span></p>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1.5 text-xs text-slate-600 font-semibold">
                      <span className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> {emp.contact_number || 'N/A'}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${emp.is_working ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {emp.is_working ? 'Active' : 'Resigned'}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button onClick={() => setSelectedEmpForDetails(emp)} className="p-2.5 bg-slate-100 text-slate-600 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors group" title="View Full Details">
                        <Eye size={16} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                      </button>
                      <button onClick={() => startEdit(emp)} className="p-2.5 bg-slate-100 text-slate-600 hover:text-[#0F172A] hover:bg-slate-200 rounded-lg transition-colors" title="Edit Record">
                        <Edit2 size={16} strokeWidth={2.5} />
                      </button>
                      <button onClick={() => requestDelete(emp.id)} className="p-2.5 bg-slate-100 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Employee">
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
          {paginatedEmployees.map(emp => (
            <div key={`mobile-${emp.id}`} className="bg-white border border-slate-200/60 rounded-[2rem] shadow-sm overflow-hidden">
              <div className="p-5 flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#0F172A] flex items-center justify-center flex-shrink-0 border border-slate-700 shadow-sm overflow-hidden">
                  {emp.photo ? (
                    <img src={emp.photo} alt={emp.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-sm tracking-widest">{getInitials(emp.name)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${emp.is_working ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {emp.is_working ? 'Active' : 'Resigned'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">ID: {emp.employee_code}</span>
                  </div>
                  <h3 className={`text-base font-black truncate ${emp.is_working ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{emp.name}</h3>
                  <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider">{emp.designation_name || 'Unassigned'}</p>
                </div>
              </div>

              <div className="p-3 flex gap-2 border-t border-slate-100">
                <button onClick={() => setSelectedEmpForDetails(emp)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Eye size={14} /> Details
                </button>
                <button onClick={() => requestDelete(emp.id)} className="p-2.5 bg-slate-100 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
            totalItems={filteredEmployees.length}
          />
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedEmpForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200">

            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-[#F8FAFC] relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#DC2626]" />
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-[1.5rem] bg-[#0F172A] flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                  {selectedEmpForDetails.photo ? (
                    <img src={selectedEmpForDetails.photo} alt={selectedEmpForDetails.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-2xl tracking-widest">{getInitials(selectedEmpForDetails.name)}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedEmpForDetails.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-[#DC2626] uppercase tracking-[0.2em] bg-red-50 px-2 py-0.5 rounded">ID: {selectedEmpForDetails.employee_code}</span>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded border ${selectedEmpForDetails.is_working ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {selectedEmpForDetails.is_working ? 'Active Member' : 'Resigned'}
                    </span>
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
                  onClick={() => setSelectedEmpForDetails(null)}
                  className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-[#DC2626] hover:border-[#DC2626] hover:bg-red-50 rounded-2xl transition-all shadow-sm flex items-center justify-center no-print"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="p-8 bg-white grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl"><Briefcase size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Designation / Role</p>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-wide">{selectedEmpForDetails.designation_name || 'Not Specified'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl"><User size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date of Birth</p>
                    <p className="text-sm font-black text-slate-900">{selectedEmpForDetails.date_of_birth || 'Not Logged'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl"><Calendar size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date of Joining</p>
                    <p className="text-sm font-black text-slate-900">{selectedEmpForDetails.date_of_joining || 'Not Logged'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl"><Phone size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Channel</p>
                    <p className="text-sm font-black text-slate-900">{selectedEmpForDetails.contact_number || 'No contact provided'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl"><MapPin size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Residential Address</p>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{selectedEmpForDetails.address || 'Address not registered'}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Verification Documents</p>
                  {selectedEmpForDetails.id_proof ? (
                    <a
                      href={selectedEmpForDetails.id_proof}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 group"
                    >
                      <FileText size={18} className="text-red-500" />
                      <span className="text-xs font-black uppercase tracking-widest">Open ID Document</span>
                    </a>
                  ) : (
                    <div className="p-4 bg-slate-50 text-slate-400 text-xs font-bold rounded-2xl border border-dashed border-slate-200 flex items-center gap-2">
                      <ShieldCheck size={16} /> No ID proof uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-[#F8FAFC] flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  const emp = selectedEmpForDetails;
                  setSelectedEmpForDetails(null);
                  startEdit(emp);
                }}
                className="px-8 flex items-center gap-2"
              >
                <Edit2 size={14} /> Edit Record
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedEmpForDetails(null)}
                className="px-8"
              >
                Done
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
        title="Delete Employee"
        message="Are you sure you want to delete this employee? This will permanently remove them from the registry."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onClose={() => setConfirmDialog({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
      />
    </div>

    {/* PRINT TEMPLATES */}
    {selectedEmpForDetails ? (
      <PrintLayout documentType="Personnel Profile" title="Employee Master Record">
        <div className="flex gap-8 mb-8">
          <div className="w-32 h-32 border-4 border-slate-200 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50">
            {selectedEmpForDetails.photo ? (
              <img src={selectedEmpForDetails.photo} alt={selectedEmpForDetails.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-slate-300">{getInitials(selectedEmpForDetails.name)}</span>
            )}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-y-4">
            <div><strong className="text-slate-500">Full Name:</strong> <br/><span className="text-lg font-bold">{selectedEmpForDetails.name}</span></div>
            <div><strong className="text-slate-500">Employee Code:</strong> <br/><span className="text-lg font-bold">{selectedEmpForDetails.employee_code}</span></div>
            <div><strong className="text-slate-500">Designation:</strong> <br/><span>{selectedEmpForDetails.designation_name || 'N/A'}</span></div>
            <div><strong className="text-slate-500">Employment Status:</strong> <br/><span>{selectedEmpForDetails.is_working ? 'Active Member' : 'Resigned'}</span></div>
          </div>
        </div>
        
        <table className="mb-8">
          <tbody>
            <tr><th className="w-1/3">Contact Number</th><td>{selectedEmpForDetails.contact_number || 'N/A'}</td></tr>
            <tr><th>Date of Birth</th><td>{selectedEmpForDetails.date_of_birth || 'N/A'}</td></tr>
            <tr><th>Date of Joining</th><td>{selectedEmpForDetails.date_of_joining || 'N/A'}</td></tr>
            <tr><th>Residential Address</th><td>{selectedEmpForDetails.address || 'N/A'}</td></tr>
          </tbody>
        </table>

        {selectedEmpForDetails.id_proof && (
          <div className="mt-8">
            <h4 className="font-bold mb-2">ID Proof Document Attached:</h4>
            <p className="text-sm border p-4 bg-slate-50">Yes (Document on file: {selectedEmpForDetails.id_proof.split('/').pop()})</p>
          </div>
        )}
      </PrintLayout>
    ) : (
      <PrintLayout documentType="Personnel Registry List" title={`Master List (Status: ${filterStatus})`}>
        <table>
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Code</th>
              <th>Designation</th>
              <th>Contact</th>
              <th>Joined</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => (
              <tr key={emp.id}>
                <td>{emp.name}</td>
                <td>{emp.employee_code}</td>
                <td>{emp.designation_name || 'N/A'}</td>
                <td>{emp.contact_number || 'N/A'}</td>
                <td>{emp.date_of_joining || 'N/A'}</td>
                <td>{emp.is_working ? 'Active' : 'Resigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintLayout>
    )}
    </>
  );
};

export default EmployeeRegistry;