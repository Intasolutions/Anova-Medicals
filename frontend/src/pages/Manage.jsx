import React, { useState, useEffect } from 'react';
import { User, DollarSign, Save, Edit2, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import api from '../api/axios';

const ManagePage = () => {
    const [activeTab, setActiveTab] = useState('doctors');
    const [doctors, setDoctors] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [notification, setNotification] = useState(null);

    // New Service State
    const [isCreatingService, setIsCreatingService] = useState(false);
    const [newService, setNewService] = useState({ name: '', description: '', base_charge: '' });

    // Pharmacy Suppliers State
    const [pharmacySuppliers, setPharmacySuppliers] = useState([]);
    const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ supplier_name: '', phone: '', address: '', gst_no: '' });
    const [editPhone, setEditPhone] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editGst, setEditGst] = useState('');

    useEffect(() => {
        if (activeTab === 'doctors') fetchDoctors();
        if (activeTab === 'services') fetchServices();
        if (activeTab === 'pharmacy_suppliers') fetchPharmacySuppliers();
    }, [activeTab]);

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/users/management/doctors/');
            setDoctors(data);
        } catch (error) {
            showToast('error', 'Failed to fetch doctors list.');
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/casualty/service-definitions/');
            setServices(data.results || data);
        } catch (error) {
            showToast('error', 'Failed to fetch services list.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPharmacySuppliers = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/pharmacy/suppliers/');
            setPharmacySuppliers(data.results || data);
        } catch (error) {
            showToast('error', 'Failed to fetch pharmacy suppliers.');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const startEditing = (doc) => {
        setEditingId(doc.id);
        setEditValue(doc.consultation_fee || 500);
    };

    const saveFee = async (docId) => {
        try {
            await api.patch(`/users/management/${docId}/`, {
                consultation_fee: editValue
            });
            showToast('success', 'Fee updated successfully!');
            setEditingId(null);
            fetchDoctors(); // Refresh list
        } catch (error) {
            showToast('error', 'Failed to update fee.');
        }
    };

    // Services Handlers
    const startEditingService = (srv) => {
        setEditingId(srv.id);
        setEditValue(srv.base_charge);
        setEditDesc(srv.description);
    };

    const saveService = async (srvId) => {
        try {
            await api.patch(`/casualty/service-definitions/${srvId}/`, {
                base_charge: editValue,
                description: editDesc
            });
            showToast('success', 'Service updated successfully!');
            setEditingId(null);
            fetchServices();
        } catch (error) {
            showToast('error', 'Failed to update service.');
        }
    };

    const createService = async () => {
        if (!newService.name || !newService.base_charge) {
            showToast('error', 'Name and Charge are required');
            return;
        }
        try {
            await api.post('/casualty/service-definitions/', newService);
            showToast('success', 'Service created successfully!');
            setIsCreatingService(false);
            setNewService({ name: '', description: '', base_charge: '' });
            fetchServices();
        } catch (error) {
            showToast('error', 'Failed to create service.');
        }
    };

    const deleteService = async (srvId) => {
        if (!confirm('Are you sure you want to deactivate this service?')) return;
        try {
            await api.patch(`/casualty/service-definitions/${srvId}/`, { is_active: false });
            showToast('success', 'Service deactivated');
            fetchServices();
        } catch (error) {
            showToast('error', 'Failed to deactivate service.');
        }
    };

    // Pharmacy Supplier Handlers
    const startEditingSupplier = (sup) => {
        setEditingId(sup.id);
        setEditValue(sup.supplier_name);
        setEditPhone(sup.phone);
        setEditAddress(sup.address);
        setEditGst(sup.gst_no);
    };

    const saveSupplier = async (supId) => {
        try {
            await api.patch(`/pharmacy/suppliers/${supId}/`, {
                supplier_name: editValue,
                phone: editPhone,
                address: editAddress,
                gst_no: editGst
            });
            showToast('success', 'Supplier updated successfully!');
            setEditingId(null);
            fetchPharmacySuppliers();
        } catch (error) {
            showToast('error', 'Failed to update supplier.');
        }
    };

    const createSupplier = async () => {
        if (!newSupplier.supplier_name) {
            showToast('error', 'Supplier Name is required');
            return;
        }
        try {
            await api.post('/pharmacy/suppliers/', newSupplier);
            showToast('success', 'Supplier created successfully!');
            setIsCreatingSupplier(false);
            setNewSupplier({ supplier_name: '', phone: '', address: '', gst_no: '' });
            fetchPharmacySuppliers();
        } catch (error) {
            showToast('error', 'Failed to create supplier.');
        }
    };

    const deleteSupplier = async (supId) => {
        if (!confirm('Are you sure you want to remove this supplier?')) return;
        try {
            await api.delete(`/pharmacy/suppliers/${supId}/`);
            showToast('success', 'Supplier removed');
            fetchPharmacySuppliers();
        } catch (error) {
            showToast('error', 'Failed to remove supplier. It might be in use.');
        }
    };

    return (
        <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Management</h1>
                    <div className="flex items-center gap-6 mt-2">
                        {['doctors', 'services', 'pharmacy_suppliers'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-1 text-sm font-bold transition-all border-b-2 ${activeTab === tab ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                            >
                                {tab === 'doctors' ? 'Doctors & Fees' : tab === 'services' ? 'Services Catalog' : 'Pharmacy Suppliers'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 border ${notification.type === 'success' ? 'bg-white border-green-100' : 'bg-white border-red-100'
                    }`}>
                    <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div>
                        <h4 className={`text-sm font-bold ${notification.type === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                            {notification.type === 'success' ? 'Success' : 'Error'}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">{notification.message}</p>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : activeTab === 'doctors' ? (
                        doctors.length === 0 ? (
                            <div className="text-center py-20 opacity-50">
                                <User size={48} className="mx-auto text-slate-300 mb-4" />
                                <p className="font-bold text-slate-900">No doctors found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {doctors.map(doc => (
                                    <div key={doc.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                                                    {doc.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">Dr. {doc.username}</h3>
                                                    <p className="text-xs text-slate-400 font-medium">{doc.email || 'No email'}</p>
                                                </div>
                                            </div>
                                            <div className="px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                                {doc.formatted_role || 'Doctor'}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block">Consultation Fee</label>

                                            <div className="flex items-center gap-2">
                                                {editingId === doc.id ? (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <div className="flex items-center gap-2 bg-white border-2 border-blue-500 rounded-xl px-3 py-2 flex-1 shadow-sm">
                                                            <DollarSign size={14} className="text-slate-400" />
                                                            <input
                                                                autoFocus
                                                                type="number"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="w-full font-bold text-slate-900 outline-none bg-transparent"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => saveFee(doc.id)}
                                                            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                                                        >
                                                            <Save size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center w-full justify-between group-hover:bg-white transition-colors rounded-xl p-1 -ml-1">
                                                        <div className="px-3 py-1">
                                                            <span className="text-2xl font-bold text-slate-900">₹{doc.consultation_fee || '500.00'}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => startEditing(doc)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : activeTab === 'services' ? (
                        <div className="space-y-6">
                            {/* Create Service Action */}
                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-700">Services Catalog</h3>
                                <button onClick={() => setIsCreatingService(!isCreatingService)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all">
                                    + Create Service
                                </button>
                            </div>

                            {isCreatingService && (
                                <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-400">Service Name</label>
                                        <input type="text" value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-emerald-500" placeholder="e.g. ECG" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-400">Description</label>
                                        <input type="text" value={newService.description} onChange={e => setNewService({ ...newService, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-emerald-500" placeholder="Optional details..." />
                                    </div>
                                    <div className="w-32">
                                        <label className="text-xs font-bold text-slate-400">Base Charge</label>
                                        <input type="number" value={newService.base_charge} onChange={e => setNewService({ ...newService, base_charge: e.target.value })} className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-emerald-500" placeholder="₹ 0.00" />
                                    </div>
                                    <button onClick={createService} className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-600 transition-all">Save</button>
                                </div>
                            )}

                            {services.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <p className="font-bold text-slate-900">No active services found.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                                            <tr>
                                                <th className="px-6 py-4">Service Name</th>
                                                <th className="px-6 py-4">Description</th>
                                                <th className="px-6 py-4 text-right">Base Charge</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {services.map(srv => (
                                                <tr key={srv.id} className="hover:bg-slate-50/50">
                                                    <td className="px-6 py-4 font-bold text-slate-800">{srv.name}</td>
                                                    <td className="px-6 py-4">
                                                        {editingId === srv.id ? (
                                                            <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full px-2 py-1 border rounded focus:border-blue-500 outline-none" />
                                                        ) : (
                                                            srv.description || <span className="text-slate-300 italic">None</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-900">
                                                        {editingId === srv.id ? (
                                                            <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-24 px-2 py-1 border rounded text-right focus:border-blue-500 outline-none" />
                                                        ) : (
                                                            `₹${srv.base_charge}`
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {editingId === srv.id ? (
                                                            <button onClick={() => saveService(srv.id)} className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-600 mr-2">Save</button>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => startEditingService(srv)} className="text-blue-500 hover:text-blue-700 mr-4 font-bold text-xs">Edit</button>
                                                                <button onClick={() => deleteService(srv.id)} className="text-red-500 hover:text-red-700 font-bold text-xs">Remove</button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'pharmacy_suppliers' ? (
                        <div className="space-y-6">
                            {/* Create Supplier Action */}
                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-700">Pharmacy Suppliers</h3>
                                <button onClick={() => setIsCreatingSupplier(!isCreatingSupplier)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all">
                                    + Add Supplier
                                </button>
                            </div>

                            {isCreatingSupplier && (
                                <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex flex-wrap gap-4 items-end">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-xs font-bold text-slate-400">Supplier Name *</label>
                                        <input type="text" value={newSupplier.supplier_name} onChange={e => setNewSupplier({ ...newSupplier, supplier_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-emerald-500" placeholder="e.g. PharmaCorp" />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-xs font-bold text-slate-400">Phone</label>
                                        <input type="text" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-emerald-500" placeholder="Contact number" />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-xs font-bold text-slate-400">GST No.</label>
                                        <input type="text" value={newSupplier.gst_no} onChange={e => setNewSupplier({ ...newSupplier, gst_no: e.target.value })} className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-emerald-500" placeholder="GST Number" />
                                    </div>
                                    <div className="w-full mt-2">
                                        <label className="text-xs font-bold text-slate-400">Address</label>
                                        <input type="text" value={newSupplier.address} onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg mt-1 outline-none focus:border-emerald-500" placeholder="Full address" />
                                    </div>
                                    <div className="w-full flex justify-end mt-2">
                                        <button onClick={createSupplier} className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-600 transition-all">Save Supplier</button>
                                    </div>
                                </div>
                            )}

                            {pharmacySuppliers.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <p className="font-bold text-slate-900">No pharmacy suppliers found.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                                            <tr>
                                                <th className="px-6 py-4">Supplier Name</th>
                                                <th className="px-6 py-4">Phone</th>
                                                <th className="px-6 py-4">GST No.</th>
                                                <th className="px-6 py-4">Address</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pharmacySuppliers.map(sup => (
                                                <tr key={sup.id} className="hover:bg-slate-50/50">
                                                    <td className="px-6 py-4 font-bold text-slate-800">
                                                        {editingId === sup.id ? (
                                                            <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-full px-2 py-1 border rounded focus:border-blue-500 outline-none" />
                                                        ) : (
                                                            sup.supplier_name
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingId === sup.id ? (
                                                            <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full px-2 py-1 border rounded focus:border-blue-500 outline-none" />
                                                        ) : (
                                                            sup.phone || <span className="text-slate-300 italic">None</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingId === sup.id ? (
                                                            <input type="text" value={editGst} onChange={e => setEditGst(e.target.value)} className="w-full px-2 py-1 border rounded focus:border-blue-500 outline-none" />
                                                        ) : (
                                                            sup.gst_no || <span className="text-slate-300 italic">None</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingId === sup.id ? (
                                                            <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} className="w-full px-2 py-1 border rounded focus:border-blue-500 outline-none" />
                                                        ) : (
                                                            sup.address || <span className="text-slate-300 italic">None</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {editingId === sup.id ? (
                                                            <button onClick={() => saveSupplier(sup.id)} className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-600 mr-2">Save</button>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => startEditingSupplier(sup)} className="text-blue-500 hover:text-blue-700 mr-4 font-bold text-xs">Edit</button>
                                                                <button onClick={() => deleteSupplier(sup.id)} className="text-red-500 hover:text-red-700 font-bold text-xs">Remove</button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default ManagePage;
