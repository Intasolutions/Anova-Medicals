import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle2, RotateCcw, User } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import Pagination from './Pagination';

const CasualtyServicesQueue = () => {
    const { showToast } = useToast();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [activeTab, setActiveTab] = useState('PENDING');

    const fetchServices = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const { data } = await api.get(`/casualty/services/?page=${page}&status=${activeTab}`);
            setServices(data.results || (Array.isArray(data) ? data : []));
            setTotal(data.count || (Array.isArray(data) ? data.length : 0));
        } catch (err) {
            console.error("Failed to load services", err);
            showToast('error', 'Failed to load casualty services');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices(true);
        const iv = setInterval(() => fetchServices(false), 5000);
        return () => clearInterval(iv);
    }, [page, activeTab]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await api.patch(`/casualty/services/${id}/`, { status: newStatus });
            showToast('success', `Service marked as ${newStatus}`);
            fetchServices(false);
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to update service status');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-6">
                    <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
                        <Activity size={16} className="text-blue-500" /> Services Queue
                    </h3>
                    <div className="flex gap-2 bg-slate-200/50 p-1 rounded-lg">
                        <button 
                            onClick={() => { setActiveTab('PENDING'); setPage(1); }}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'PENDING' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Pending
                        </button>
                        <button 
                            onClick={() => { setActiveTab('COMPLETED'); setPage(1); }}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'COMPLETED' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            History
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 font-bold text-[10px] uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4">Patient Details</th>
                            <th className="px-6 py-4">Service</th>
                            <th className="px-6 py-4">Status & Time</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {services.length === 0 && !loading && (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                                    <Activity size={24} className="mx-auto mb-2 opacity-50" />
                                    <p className="font-bold">No {activeTab.toLowerCase()} services found</p>
                                </td>
                            </tr>
                        )}
                        {services.map(service => (
                            <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-blue-50 p-1.5 rounded-lg text-blue-500">
                                            <User size={14} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 flex items-center gap-2">
                                                {service.patient_name || 'Unknown Patient'}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase flex gap-2 mt-0.5">
                                                <span>{service.patient_gender || 'N/A'} • {service.patient_age ? `${service.patient_age} yrs` : 'N/A'}</span>
                                                <span className="text-blue-500">{service.patient_reg_no || ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800">{service.name}</div>
                                    {service.notes && <div className="text-[10px] font-medium text-slate-500 mt-1 max-w-[200px] truncate" title={service.notes}>{service.notes}</div>}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 items-start">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                            service.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                            {service.status === 'COMPLETED' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                            {service.status}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400">
                                            {service.status === 'COMPLETED' ? `Completed: ${formatDate(service.updated_at)}` : `Assigned: ${formatDate(service.created_at)}`}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {service.status === 'PENDING' ? (
                                        <button 
                                            onClick={() => handleUpdateStatus(service.id, 'COMPLETED')}
                                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                        >
                                            Mark Done
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleUpdateStatus(service.id, 'PENDING')}
                                            className="flex items-center gap-1 ml-auto px-3 py-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 border border-transparent hover:border-amber-200 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            <RotateCcw size={12} /> Undo
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="p-3 border-t border-slate-100 bg-white shrink-0">
                <Pagination 
                    current={page} 
                    total={Math.ceil(total / 10) || 1} 
                    onPageChange={setPage} 
                    loading={loading} 
                    compact 
                />
            </div>
        </div>
    );
};

export default CasualtyServicesQueue;
