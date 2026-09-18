import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, X, Plus, AlertCircle, CheckCircle2, Ban } from 'lucide-react';
import api from '../api/axios';

const AdminInvoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [notification, setNotification] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        details: [],
        onConfirm: null,
        type: 'warning'
    });

    useEffect(() => {
        fetchInvoices();
    }, [searchQuery]);

    const showToast = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
            const res = await api.get(`/billing/invoices/${query}`);
            setInvoices(res.data.results || res.data || []);
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to load invoices.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = (invoice) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancel Invoice',
            message: 'Invoices cannot be permanently deleted for auditing purposes. Are you sure you want to mark this invoice as CANCELLED?',
            details: [
                { label: 'Invoice ID', value: invoice.id },
                { label: 'Patient Name', value: invoice.patient_name || invoice.patient_display },
                { label: 'Total Amount', value: `₹${invoice.total_amount}` }
            ],
            type: 'danger',
            onConfirm: () => executeCancel(invoice.id)
        });
    };

    const executeCancel = async (id) => {
        try {
            await api.patch(`/billing/invoices/${id}/`, { payment_status: 'CANCELLED' });
            showToast('success', 'Invoice has been cancelled.');
            setConfirmModal({ ...confirmModal, isOpen: false });
            fetchInvoices();
        } catch (error) {
            console.error(error);
            showToast('error', 'Failed to cancel invoice.');
        }
    };

    const handleEdit = (invoice) => {
        // Deep clone so we don't mutate state accidentally
        setEditData({
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            patient_name: invoice.patient_name || invoice.patient_display || '',
            total_amount: invoice.total_amount || 0,
            discount_amount: invoice.discount_amount || 0,
            refund_amount: invoice.refund_amount || 0,
            payment_status: invoice.payment_status || 'PENDING',
            payment_mode: invoice.payment_mode || 'CASH',
            remarks: invoice.remarks || '',
            items: invoice.items ? invoice.items.map(item => ({ ...item })) : []
        });
        setShowModal(true);
    };

    const handleSave = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Force Save Invoice',
            message: 'You are bypassing normal workflows and directly modifying database values. Are you sure you want to apply these changes?',
            details: [
                { label: 'Invoice ID', value: editData.id },
                { label: 'New Computed Total', value: `₹${editData.total_amount}` },
                { label: 'Discount Amount', value: `₹${editData.discount_amount}` },
                { label: 'New Status', value: editData.payment_status }
            ],
            type: 'warning',
            onConfirm: () => executeSave()
        });
    };

    const executeSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                patient_name: editData.patient_name,
                total_amount: parseFloat(editData.total_amount) || 0,
                discount_amount: parseFloat(editData.discount_amount) || 0,
                refund_amount: parseFloat(editData.refund_amount) || 0,
                payment_status: editData.payment_status,
                payment_mode: editData.payment_mode,
                remarks: editData.remarks,
                items: editData.items.map(({ id, dept, description, qty, unit_price, amount, gst_percent, hsn, batch }) => ({
                    id, dept, description, qty, unit_price, amount, gst_percent, hsn, batch
                }))
            };

            await api.patch(`/billing/invoices/${editData.id}/`, payload);
            showToast('success', 'Invoice updated successfully.');
            setConfirmModal({ ...confirmModal, isOpen: false });
            setShowModal(false);
            fetchInvoices();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || error.response?.data?.detail || 'Failed to update invoice.';
            showToast('error', msg);
        } finally {
            setIsSaving(false);
        }
    };

    const updateItem = (index, field, value) => {
        const newItems = [...editData.items];
        newItems[index][field] = value;
        if (field === 'qty' || field === 'unit_price') {
            const qty = parseFloat(newItems[index].qty) || 0;
            const price = parseFloat(newItems[index].unit_price) || 0;
            newItems[index].amount = (qty * price).toFixed(2);
        }
        if (field === 'amount') {
            const qty = parseFloat(newItems[index].qty) || 0;
            const amount = parseFloat(value) || 0;
            if (qty > 0) newItems[index].unit_price = (amount / qty).toFixed(2);
        }
        
        const newTotal = newItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        setEditData({ ...editData, items: newItems, total_amount: newTotal.toFixed(2) });
    };

    const addItem = () => {
        const newItems = [
            ...editData.items,
            { dept: 'CASUALTY', description: 'New Item', qty: 1, unit_price: 0, amount: 0, gst_percent: 0 }
        ];
        const newTotal = newItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        setEditData({ ...editData, items: newItems, total_amount: newTotal.toFixed(2) });
    };

    const removeItem = (index) => {
        const newItems = editData.items.filter((_, i) => i !== index);
        const newTotal = newItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        setEditData({ ...editData, items: newItems, total_amount: newTotal.toFixed(2) });
    };

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex justify-between items-center bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Raw Invoice Management</h2>
                    <p className="text-xs text-slate-500 font-medium">Edit, override, or cancel invoices.</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by ID or Patient..."
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">ID / Ref</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Patient Name</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Total Amount</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No invoices found.</td></tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-600">{inv.id} {inv.invoice_number ? `(${inv.invoice_number})` : ''}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{inv.patient_name || inv.patient_display}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                inv.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                                inv.payment_status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {inv.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">₹{inv.total_amount}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(inv)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Raw Data"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(inv)}
                                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Cancel Invoice"
                                                    disabled={inv.payment_status === 'CANCELLED'}
                                                >
                                                    <Ban size={16} className={inv.payment_status === 'CANCELLED' ? 'opacity-50' : ''} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Editor Modal */}
            {showModal && editData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col my-8 max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-3xl z-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Edit Raw Invoice #{editData.id}</h3>
                                <p className="text-sm text-slate-500 font-medium">Bypass normal workflows and directly modify database values.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                            {/* Base Fields */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Patient Name</label>
                                    <input 
                                        type="text"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        value={editData.patient_name}
                                        onChange={(e) => setEditData({...editData, patient_name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                                    <select
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        value={editData.payment_status}
                                        onChange={(e) => setEditData({...editData, payment_status: e.target.value})}
                                    >
                                        <option value="DRAFT">DRAFT</option>
                                        <option value="PENDING">PENDING</option>
                                        <option value="PARTIAL">PARTIAL</option>
                                        <option value="PAID">PAID</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Mode</label>
                                    <select
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        value={editData.payment_mode || 'CASH'}
                                        onChange={(e) => setEditData({...editData, payment_mode: e.target.value})}
                                    >
                                        <option value="CASH">CASH</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CARD">CARD</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Computed Total Amount</label>
                                    <input 
                                        type="number"
                                        readOnly
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 text-slate-500 focus:outline-none"
                                        value={editData.total_amount}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Discount Amount</label>
                                    <input 
                                        type="number"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        value={editData.discount_amount}
                                        onChange={(e) => setEditData({...editData, discount_amount: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Remarks</label>
                                    <input 
                                        type="text"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        value={editData.remarks}
                                        onChange={(e) => setEditData({...editData, remarks: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Items */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <h4 className="font-bold text-slate-700">Line Items</h4>
                                    <button onClick={addItem} className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                        <Plus size={16} /> Add Row
                                    </button>
                                </div>
                                <div className="p-4 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                                        <thead>
                                            <tr>
                                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-1/4">Description</th>
                                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-24">Dept</th>
                                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-20">Qty</th>
                                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-24">Price</th>
                                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-24">Amount</th>
                                                <th className="pb-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {editData.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="py-2 pr-2">
                                                        <input 
                                                            type="text" 
                                                            className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm font-medium focus:outline-none focus:border-blue-500"
                                                            value={item.description}
                                                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <select
                                                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm font-medium focus:outline-none focus:border-blue-500"
                                                            value={item.dept}
                                                            onChange={(e) => updateItem(idx, 'dept', e.target.value)}
                                                        >
                                                            <option value="CONSULTATION">CONSULTATION</option>
                                                            <option value="PHARMACY">PHARMACY</option>
                                                            <option value="LAB">LAB</option>
                                                            <option value="CASUALTY">CASUALTY</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <input 
                                                            type="number" 
                                                            className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm font-medium focus:outline-none focus:border-blue-500"
                                                            value={item.qty}
                                                            onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <input 
                                                            type="number" 
                                                            className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm font-medium focus:outline-none focus:border-blue-500"
                                                            value={item.unit_price}
                                                            onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="py-2 pl-2 pr-4">
                                                        <input 
                                                            type="number" 
                                                            className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm font-medium focus:outline-none focus:border-blue-500"
                                                            value={item.amount}
                                                            onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="py-2 text-right">
                                                        <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-4 rounded-b-3xl sticky bottom-0 z-10">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSaving ? 'Saving...' : 'Force Save Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ zIndex: 9999 }}>
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className={`px-6 py-4 border-b flex items-center gap-3 ${confirmModal.type === 'danger' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                            <div className={`p-2 rounded-full ${confirmModal.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                <AlertCircle size={20} />
                            </div>
                            <h3 className={`font-bold text-lg ${confirmModal.type === 'danger' ? 'text-rose-900' : 'text-amber-900'}`}>
                                {confirmModal.title}
                            </h3>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 mb-6 font-medium leading-relaxed">{confirmModal.message}</p>
                            
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                                {confirmModal.details.map((detail, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium">{detail.label}</span>
                                        <span className="font-bold text-slate-900">{detail.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => confirmModal.onConfirm()}
                                className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition-colors flex items-center gap-2 shadow-sm ${
                                    confirmModal.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'
                                }`}
                            >
                                Confirm Action
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 border ${notification.type === 'success' ? 'bg-white border-green-100' : 'bg-white border-red-100'}`}>
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
        </div>
    );
};

export default AdminInvoices;
