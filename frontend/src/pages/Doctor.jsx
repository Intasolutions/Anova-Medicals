import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Stethoscope, ClipboardList, Send, User, Activity, X, Search,
    Plus, Trash2, ChevronRight, Clock, Pill,
    History, AlertCircle, FlaskConical,
    Thermometer, Heart, Wind, Scale, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import Pagination from '../components/Pagination';
import { socket } from '../socket';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safePrescrArray = (p) => {
    if (!p) return [];
    if (Array.isArray(p)) return p.map(m => ({
        name: m.name || m.medication || 'Medicine',
        dosage: m.dosage || '--', duration: m.duration || '--', qty: m.qty || m.count || '--'
    }));
    if (typeof p === 'object') return Object.entries(p).map(([name, d]) => {
        if (typeof d === 'object' && d) return { name, dosage: d.dosage || '--', duration: d.duration || '--', qty: d.qty || d.count || '--' };
        const parts = String(d).split(' | ');
        const qm = String(d).match(/Qty:\s*(\d+)/i);
        return { name, dosage: parts[0] || '--', duration: parts[1] || '--', qty: qm ? qm[1] : '--' };
    });
    return [];
};

const prescriptionCount = (p) => {
    if (!p) return 0;
    if (Array.isArray(p)) return p.length;
    if (typeof p === 'object') return Object.keys(p).length;
    return 0;
};

// ─── QueueSkeleton ────────────────────────────────────────────────────────────
const QueueSkeleton = () => (
    <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-100 rounded-full" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 bg-slate-100 rounded" />
                    <div className="h-3 w-1/3 bg-slate-50 rounded" />
                </div>
            </div>
        ))}
    </div>
);

// ─── HistoryModal ──────────────────────────────────────────────────────────────
const HistoryModal = ({ history, onClose }) => {
    if (!history) return null;
    const meds = safePrescrArray(history.prescription);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Consultation Details</h3>
                        <p className="text-sm text-slate-500 font-medium">{new Date(history.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"><X size={24} /></button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                    {/* Vitals */}
                    {history.vitals && Object.values(history.vitals).some(Boolean) && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600"><Activity size={16} /></div> Recorded Vitals
                            </div>
                            <div className="grid grid-cols-5 gap-3">
                                {[{ l: 'BP', k: 'bp', c: 'blue' }, { l: 'Temp', k: 'temp', c: 'amber' }, { l: 'Pulse', k: 'pulse', c: 'rose' }, { l: 'SpO2', k: 'spo2', c: 'cyan' }, { l: 'Weight', k: 'weight', c: 'slate' }].map(v =>
                                    history.vitals[v.k] ? (
                                        <div key={v.k} className={`p-3 bg-${v.c}-50 rounded-2xl border border-${v.c}-100`}>
                                            <label className={`text-[10px] font-black text-${v.c}-600 uppercase block mb-1`}>{v.l}</label>
                                            <p className="text-sm font-bold text-slate-900">{history.vitals[v.k]}</p>
                                        </div>
                                    ) : null
                                )}
                            </div>
                        </div>
                    )}
                    {/* Complaints & Examination */}
                    {(history.complaints || history.examination) && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><AlertCircle size={16} /></div> Chief Complaints & Examination
                            </div>
                            {history.complaints && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800 font-medium leading-relaxed">
                                    <span className="font-bold block mb-1 text-slate-400 uppercase text-[10px]">Complaints</span>{history.complaints}
                                </div>
                            )}
                            {history.examination && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800 font-medium leading-relaxed">
                                    <span className="font-bold block mb-1 text-slate-400 uppercase text-[10px]">Examination</span>{history.examination}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Diagnosis */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><Stethoscope size={16} /></div> Clinical Diagnosis
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800 font-medium leading-relaxed">{history.diagnosis || 'No diagnosis recorded.'}</div>
                        {history.notes && (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 text-sm">
                                <span className="font-bold block mb-1 text-slate-400 uppercase text-[10px]">Additional Notes</span>{history.notes}
                            </div>
                        )}
                    </div>
                    {/* Prescription */}
                    {meds.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600"><Pill size={16} /></div> Prescribed Medication
                            </div>
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            {['Medicine', 'Dosage', 'Duration', 'Qty'].map(h => (
                                                <th key={h} className={`px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wider${h === 'Qty' ? ' text-right' : ''}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {meds.map((med, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-slate-900">{med.name}</td>
                                                <td className="px-4 py-3 text-slate-600 font-medium">{med.dosage}</td>
                                                <td className="px-4 py-3 text-slate-600 font-medium">{med.duration}</td>
                                                <td className="px-4 py-3 text-slate-900 font-bold text-right">{med.qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {/* Lab Reports */}
                    {history.lab_results && history.lab_results.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600"><FlaskConical size={16} /></div> Lab Reports
                            </div>
                            {history.lab_results.map((report, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{report.test_name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Tech: {report.technician || report.technician_name || 'N/A'}</p>
                                        </div>
                                        <span className="text-xs font-mono text-slate-400">
                                            {(() => { const d = new Date(report.date || report.report_date); return isNaN(d) ? 'N/A' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })()}
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        {Array.isArray(report.results) ? (
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-[10px] text-slate-400 uppercase font-bold bg-slate-50/50">
                                                    <tr><th className="px-3 py-2">Parameter</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Ref. Range</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {report.results.map((res, rIdx) => (
                                                        <tr key={rIdx}>
                                                            <td className="px-3 py-2 font-medium text-slate-700">
                                                                {typeof res === 'object' ? (
                                                                    <>
                                                                        {res.name}
                                                                        {res.note && <span className="block font-medium text-slate-500 text-[10px] mt-0.5 whitespace-pre-wrap">{res.note}</span>}
                                                                    </>
                                                                ) : String(res)}
                                                            </td>
                                                            <td className="px-3 py-2 font-bold text-slate-900">{typeof res === 'object' ? res.value : '--'}</td>
                                                            <td className="px-3 py-2 text-slate-500">{typeof res === 'object' ? res.unit : '--'}</td>
                                                            <td className="px-3 py-2 text-slate-400 text-xs">{typeof res === 'object' ? res.normal : '--'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <pre className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-lg overflow-auto">{JSON.stringify(report.results, null, 2)}</pre>
                                        )}
                                        {report.notes && (
                                            <div className="mt-4 border-t border-slate-100 pt-3">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Test Remarks / Notes</p>
                                                <p className="text-xs font-bold text-slate-700 whitespace-pre-wrap">{report.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!history.lab_results?.length && history.lab_referral_details && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600"><ClipboardList size={16} /></div> Lab Requests (Pending)
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 text-sm font-medium italic">{history.lab_referral_details}</div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// ─── Doctor Main ──────────────────────────────────────────────────────────────
const Doctor = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { globalSearch, setGlobalSearch } = useSearch();

    const [queueTab, setQueueTab] = useState('waiting');
    const [visitsData, setVisitsData] = useState({ results: [], count: 0 });
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [patientHistory, setPatientHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [viewingHistory, setViewingHistory] = useState(null);
    const [doctorsList, setDoctorsList] = useState([]);
    const [saving, setSaving] = useState(false);

    const [notes, setNotes] = useState({ complaints: '', examination: '', diagnosis: '', notes: '' });
    const [vitals, setVitals] = useState({ bp: '', temp: '', pulse: '', spo2: '', weight: '' });
    const [medicalHistory, setMedicalHistory] = useState('');
    const [medSearch, setMedSearch] = useState('');
    const [medResults, setMedResults] = useState([]);
    const [selectedMeds, setSelectedMeds] = useState([]);
    const [referral, setReferral] = useState('NONE');
    const [referredDoctorId, setReferredDoctorId] = useState('');
    const [labSearch, setLabSearch] = useState('');
    const [labResults, setLabResults] = useState([]);
    const [selectedTests, setSelectedTests] = useState([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [serviceResults, setServiceResults] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [existingNoteId, setExistingNoteId] = useState(null);
    const [localSearch, setLocalSearch] = useState('');

    // ── Qty Calculator ────────────────────────────────────────────────────────
    const calculateQty = (dosage, duration) => {
        let perDay = 0;
        if (dosage && dosage.includes('-')) {
            perDay = dosage.split('-').reduce((s, p) => s + (parseFloat(p) || 0), 0);
        } else if (dosage === 'SOS' || dosage === 'STAT') {
            perDay = 1;
        } else {
            perDay = parseFloat(dosage) || 0;
        }
        let days = 0;
        if (duration) {
            const num = parseFloat(duration) || 0;
            const s = duration.toLowerCase();
            if (s.includes('month') || s.includes('mos')) days = num * 30;
            else if (s.includes('week') || s.includes('wk')) days = num * 7;
            else days = num;
        }
        return perDay > 0 && days > 0 ? Math.ceil(perDay * days) : null;
    };

    // ── Medicine handlers ────────────────────────────────────────────────────
    const addMedicine = (med) => {
        if (selectedMeds.find(m => m.name === med.name)) {
            showToast('info', `${med.name} already in prescription`);
            setMedSearch(''); setMedResults([]); return;
        }
        const dosage = '1-0-1'; const duration = '5 Days';
        const count = String(calculateQty(dosage, duration) || 15);
        setSelectedMeds(prev => [...prev, {
            name: med.name, dosage, duration, count,
            stock: med.qty_available || 0, mrp: med.mrp || 0, tps: med.tablets_per_strip || 1
        }]);
        if (referral !== 'PHARMACY' && referral !== 'CASUALTY') {
            setReferral('PHARMACY'); showToast('info', 'Referral auto-set to Pharmacy');
        }
        showToast('success', `${med.name} added to prescription`);
        setMedSearch(''); setMedResults([]);
    };

    const removeMedicine = (name) => {
        const rem = selectedMeds.filter(m => m.name !== name);
        setSelectedMeds(rem);
        if (rem.length === 0 && referral === 'PHARMACY') setReferral('NONE');
    };

    const handleMedFieldChange = (name, field, value) => {
        setSelectedMeds(prev => prev.map(m => {
            if (m.name !== name) return m;
            const updated = { ...m, [field]: value };
            if (field === 'dosage' || field === 'duration') {
                const q = calculateQty(updated.dosage, updated.duration);
                if (q !== null) updated.count = String(q);
            }
            return updated;
        }));
    };

    // ── Lab test handlers ─────────────────────────────────────────────────────
    const addTest = (test) => {
        if (selectedTests.find(t => t.name === test.name)) {
            showToast('info', `${test.name} already added`);
            setLabSearch(''); setLabResults([]); return;
        }
        setSelectedTests(prev => [...prev, test]);
        if (referral !== 'LAB') { setReferral('LAB'); showToast('info', 'Referral auto-set to Lab'); }
        showToast('success', `${test.name} added`);
        setLabSearch(''); setLabResults([]);
    };

    const removeTest = (id) => {
        const rem = selectedTests.filter(t => t.id !== id);
        setSelectedTests(rem);
        if (rem.length === 0 && referral === 'LAB') setReferral('NONE');
    };

    // ── API ───────────────────────────────────────────────────────────────────
    const fetchQueue = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const df = user?.role === 'DOCTOR' ? `&doctor=${user.u_id}` : '';
            const sf = localSearch ? `&search=${encodeURIComponent(localSearch)}` : '';
            const { data } = await api.get(`/reception/visits/?status__in=OPEN,IN_PROGRESS${df}&page=${page}${sf}`);
            setVisitsData(data || { results: [], count: 0 });
        } catch (e) { showToast('error', 'Could not refresh patient queue'); }
        finally { if (showLoading) setLoading(false); }
    }, [user, page, localSearch]);

    const fetchDoctors = async () => {
        try {
            const { data } = await api.get('/users/management/doctors/?page_size=1000');
            const docs = Array.isArray(data) ? data : (data.results || []);
            setDoctorsList(docs.filter(d => (d.u_id || d.id) !== (user?.u_id || user?.id)));
        } catch (e) { console.error(e); }
    };

    const fetchPatientHistory = async (patientId) => {
        if (!patientId) return;
        setHistoryLoading(true); setPatientHistory([]);
        try {
            // Fetch visits for this patient (closed + open)
            const { data: vd } = await api.get(`/reception/visits/?patient=${patientId}&page_size=100`);
            const visits = vd.results || vd || [];
            if (!visits.length) { setHistoryLoading(false); return; }
            const vIds = visits.map(v => v.v_id || v.id);
            // Fetch notes scoped to this patient via visit filter
            const { data: nd } = await api.get(`/medical/doctor-notes/?page_size=100`);
            const allNotes = nd.results || nd || [];
            const enriched = allNotes
                .filter(n => vIds.includes(n.visit))
                .map(note => {
                    const visit = visits.find(v => (v.v_id || v.id) === note.visit);
                    return { ...note, vitals: visit?.vitals || {}, lab_results: visit?.lab_results || [] };
                })
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setPatientHistory(enriched);
        } catch (e) { console.error(e); }
        finally { setHistoryLoading(false); }
    };

    const fetchExistingNote = async (visit, draftLoaded = false) => {
        try {
            const vId = visit.v_id || visit.id;
            const { data } = await api.get(`/medical/doctor-notes/?visit=${vId}`);
            const existing = (data.results || data)[0];
            if (!existing) return;
            setExistingNoteId(existing.note_id || existing.id);
            if (!draftLoaded) {
                setNotes({ complaints: existing.complaints || '', examination: existing.examination || '', diagnosis: existing.diagnosis || '', notes: existing.notes || '' });
            }
            if (existing.prescription && typeof existing.prescription === 'object' && !draftLoaded) {
                const medPromises = Object.entries(existing.prescription).map(async ([name, details]) => {
                    let dosage = '1-0-1', duration = '5 Days', count = '15';
                    try {
                        if (typeof details === 'string') {
                            const parts = details.split(' | ');
                            dosage = parts[0]?.trim() || dosage;
                            duration = parts[1]?.trim() || duration;
                            const qm = details.match(/Qty:\s*(\d+)/i);
                            if (qm) count = qm[1];
                        } else if (details && typeof details === 'object') {
                            dosage = details.dosage || dosage;
                            duration = details.duration || duration;
                            count = String(details.qty || details.count || count);
                        }
                    } catch (e) { console.error('parse med', name, e); }
                    let stock = 0;
                    try {
                        const { data: sd } = await api.get(`/pharmacy/stock/doctor-search/?search=${encodeURIComponent(name)}`);
                        const match = (sd.results || sd).find(m => m.name === name);
                        if (match) stock = match.qty_available;
                    } catch (e) { /* ignore */ }
                    return { name, dosage, duration, count, stock };
                });
                const resolved = (await Promise.all(medPromises)).filter(Boolean);
                setSelectedMeds(resolved);
                if (resolved.length > 0) setReferral('PHARMACY');
            }
            // Only restore pending lab tests if results haven't come back yet.
            // If lab_results exist on the visit, those tests are DONE — don't restore them
            // so the doctor can freely switch referral to Pharmacy.
            const hasCompletedResults = visit.lab_results && visit.lab_results.length > 0;
            if (existing.lab_referral_details && !hasCompletedResults) {
                const names = existing.lab_referral_details.split(', ').filter(Boolean);
                setSelectedTests(names.map((name, i) => ({ id: `restored-${i}`, name })));
                setReferral('LAB');
            }
        } catch (e) { console.error('fetch existing note', e); }
    };

    const searchMedicines = async (query) => {
        setMedSearch(query);
        if (query.length < 2) { setMedResults([]); return; }
        try {
            const { data } = await api.get(`/pharmacy/stock/doctor-search/?search=${query}&_t=${Date.now()}`);
            
            // Deduplicate by normalized name (trim and lowercase) in case of trailing spaces in DB
            const results = data.results || data;
            const uniqueMap = new Map();
            results.forEach(item => {
                const normalized = item.name.trim().toLowerCase();
                if (!uniqueMap.has(normalized)) {
                    uniqueMap.set(normalized, { ...item, name: item.name.trim() });
                } else {
                    const existing = uniqueMap.get(normalized);
                    existing.qty_available += item.qty_available;
                }
            });
            setMedResults(Array.from(uniqueMap.values()));
        } catch (e) { console.error(e); }
    };

    const searchLabTests = async (query) => {
        setLabSearch(query);
        if (query.length < 2) { setLabResults([]); return; }
        try {
            const { data } = await api.get(`/lab/tests/?search=${query}`);
            setLabResults(data.results || data);
        } catch (e) { console.error(e); }
    };

    const searchServices = async (query) => {
        setServiceSearch(query);
        if (query.length < 2) { setServiceResults([]); return; }
        try {
            const { data } = await api.get(`/casualty/service-definitions/?search=${query}&page_size=1000`);
            setServiceResults(data.results || data);
        } catch (e) { console.error(e); }
    };

    const addService = (service) => {
        if (selectedServices.find(s => s.name === service.name)) {
            showToast('info', `${service.name} already added`);
            setServiceSearch(''); setServiceResults([]); return;
        }
        setSelectedServices(prev => [...prev, service]);
        // Services go to Billing directly now
        if (referral !== 'BILLING') { setReferral('BILLING'); showToast('info', 'Referral auto-set to Billing (for Services)'); }
        showToast('success', `${service.name} added`);
        setServiceSearch(''); setServiceResults([]);
    };

    const removeService = (id) => {
        const rem = selectedServices.filter(s => s.id !== id);
        setSelectedServices(rem);
        if (rem.length === 0 && referral === 'BILLING') setReferral('NONE');
    };

    // Human-readable referral label
    const referralLabel = { LAB: 'Lab', PHARMACY: 'Pharmacy', DOCTOR: 'Another Doctor', BILLING: 'Billing', NONE: 'Discharge' };

    const handleSaveConsultation = async () => {
        if (!selectedVisit || saving) return;

        const labsAlreadyDone = (selectedVisit.lab_results || []).length > 0;
        const hasNewTests = selectedTests.length > 0;

        // Validations
        if (referral === 'DOCTOR' && !referredDoctorId) {
            showToast('error', 'Please select a doctor to refer to'); return;
        }
        if (referral === 'LAB' && !hasNewTests) {
            showToast('error', 'Add at least one lab test before referring to Lab'); return;
        }
        
        const oos = selectedMeds.filter(m => (parseInt(m.count) || 0) > (m.stock || 0) && m.stock > 0);
        if (oos.length) {
            showToast('error', `Insufficient stock for: ${oos.map(m => m.name).join(', ')}`); return;
        }
        const invQty = selectedMeds.filter(m => !m.count || parseInt(m.count) <= 0);
        if (invQty.length) {
            showToast('error', `Set a valid quantity for: ${invQty.map(m => m.name).join(', ')}`); return;
        }
        
        if (!notes.complaints?.trim()) { showToast('error', 'Please enter patient complaints'); return; }
        if (!notes.examination?.trim()) { showToast('error', 'Please enter examination findings'); return; }
        if (!notes.diagnosis?.trim()) { showToast('error', 'Please enter a clinical diagnosis'); return; }
        if (referral === 'NONE' && !notes.notes?.trim()) {
            showToast('error', 'Please enter closing notes before discharging the patient'); return;
        }

        setSaving(true);
        try {
            // Update patient medical history if changed
            if (medicalHistory !== (selectedVisit.patient_medical_history || '')) {
                try { await api.patch(`/reception/patients/${selectedVisit.patient}/`, { medical_history: medicalHistory }); }
                catch (e) { console.error('medical history update failed:', e); }
            }

            // Build prescription
            const prescriptionObj = {};
            selectedMeds.forEach(m => { prescriptionObj[m.name] = `${m.dosage} | ${m.duration} | Qty: ${m.count}`; });

            // Preserve existing lab_referral_details if results are already done
            // (so the note still records which tests were ordered originally)
            const labReferralText = hasNewTests
                ? selectedTests.map(t => t.name).join(', ')
                : (labsAlreadyDone ? (selectedVisit.lab_referral_details || '') : '');

            const payload = {
                visit: selectedVisit.v_id || selectedVisit.id,
                diagnosis: notes.diagnosis,
                notes: notes.notes,
                complaints: notes.complaints,
                examination: notes.examination,
                prescription: prescriptionObj,
                lab_referral_details: labReferralText,
            };

            if (existingNoteId) {
                await api.patch(`/medical/doctor-notes/${existingNoteId}/`, payload);
            } else {
                await api.post('/medical/doctor-notes/', payload);
            }

            // Update visit routing
            let vu = { vitals };
            if (selectedServices.length > 0) {
                vu.casualty_services = selectedServices.map(s => s.id || s.service_id);
            }
            
            // Smart routing: if discharge is selected but they have pending services/meds
            let finalReferral = referral;
            if (referral === 'NONE') {
                if (selectedServices.length > 0) finalReferral = 'BILLING';
                else if (selectedMeds.length > 0) finalReferral = 'PHARMACY';
                else if (hasNewTests && !labsAlreadyDone) finalReferral = 'LAB';
            }

            if (finalReferral === 'LAB') vu = { ...vu, status: 'OPEN', assigned_role: 'LAB' };
            else if (finalReferral === 'DOCTOR') vu = { ...vu, status: 'OPEN', assigned_role: 'DOCTOR', doctor: referredDoctorId };
            else if (finalReferral !== 'NONE') vu = { ...vu, status: 'OPEN', assigned_role: finalReferral };
            else vu = { ...vu, status: 'CLOSED' };

            await api.patch(`/reception/visits/${selectedVisit.v_id || selectedVisit.id}/`, vu);

            // Clear draft autosave on successful save
            localStorage.removeItem(`doctor_draft_visit_${selectedVisit.v_id || selectedVisit.id}`);

            const label = referralLabel[referral] || referral;
            showToast('success', referral !== 'NONE' ? `Patient referred to ${label}` : 'Patient discharged successfully');
            setSelectedVisit(null);
            fetchQueue();
        } catch (e) {
            console.error('Save consultation error:', e);
            // Parse backend error into human-readable message
            const errData = e.response?.data;
            let msg = 'Failed to save consultation';
            if (errData) {
                if (typeof errData === 'string') msg = errData;
                else if (errData.detail) msg = errData.detail;
                else {
                    const firstKey = Object.keys(errData)[0];
                    const firstErr = errData[firstKey];
                    msg = `${firstKey}: ${Array.isArray(firstErr) ? firstErr[0] : firstErr}`;
                }
            }
            showToast('error', msg);
        } finally { setSaving(false); }
    };

    // ── Effects ──────────────────────────────────────────────────────────────
    useEffect(() => { if (user) { fetchQueue(); fetchDoctors(); } }, [user, page, localSearch]);

    useEffect(() => {
        if (!user) return;
        const iv = setInterval(async () => {
            await fetchQueue(false);
            // Live-sync the selectedVisit so lab_results update without needing a re-click
            if (selectedVisit) {
                try {
                    const vId = selectedVisit.v_id || selectedVisit.id;
                    const { data } = await api.get(`/reception/visits/${vId}/`);
                    if (data) {
                        setSelectedVisit(prev => prev && (prev.v_id || prev.id) === vId ? { ...prev, ...data } : prev);
                    }
                } catch (e) { /* silent */ }
            }
        }, 5000);
        const onVU = (d) => {
            fetchQueue(false);
            // If socket tells us about the currently-open visit, re-fetch it
            if (selectedVisit && d?.visit_id && d.visit_id === String(selectedVisit.v_id || selectedVisit.id)) {
                api.get(`/reception/visits/${selectedVisit.v_id || selectedVisit.id}/`)
                    .then(({ data }) => setSelectedVisit(prev => prev ? { ...prev, ...data } : prev))
                    .catch(() => {});
            }
        };
        const onLU = (d) => {
            if (d?.status === 'COMPLETED') {
                showToast('success', `Lab results are ready for ${d.patient_name || 'a patient'}!`);
                fetchQueue(false);
            }
        };
        socket.on('visit_update', onVU);
        socket.on('lab_update', onLU);
        return () => { clearInterval(iv); socket.off('visit_update', onVU); socket.off('lab_update', onLU); };
    }, [user, page, globalSearch, selectedVisit]);

    useEffect(() => {
        if (!selectedVisit) { setPatientHistory([]); return; }
        setNotes({ complaints: '', examination: '', diagnosis: '', notes: '' });
        setVitals(selectedVisit.vitals && Object.values(selectedVisit.vitals).some(Boolean)
            ? selectedVisit.vitals : { bp: '', temp: '', pulse: '', spo2: '', weight: '' });
        setMedicalHistory(selectedVisit.patient_medical_history || '');
        setSelectedMeds([]); setSelectedTests([]); setReferral('NONE'); setReferredDoctorId('');
        setExistingNoteId(null); setMedSearch(''); setMedResults([]); setLabSearch(''); setLabResults([]);

        // Try restoring draft first
        const draftKey = `doctor_draft_visit_${selectedVisit.v_id || selectedVisit.id}`;
        const draftJson = localStorage.getItem(draftKey);
        let draftLoaded = false;
        if (draftJson) {
            try {
                const draft = JSON.parse(draftJson);
                if (draft.notes) setNotes(draft.notes);
                if (draft.vitals) setVitals(draft.vitals);
                if (draft.selectedMeds) setSelectedMeds(draft.selectedMeds);
                if (draft.selectedTests) setSelectedTests(draft.selectedTests);
                if (draft.referral) setReferral(draft.referral);
                if (draft.referredDoctorId) setReferredDoctorId(draft.referredDoctorId);
                draftLoaded = true;
            } catch (e) { console.error('Error parsing draft', e); }
        }

        fetchExistingNote(selectedVisit, draftLoaded);
        fetchPatientHistory(selectedVisit.patient_id || selectedVisit.patient);
    }, [selectedVisit?.v_id, selectedVisit?.id]);

    // ── Autosave Draft Effect ──
    useEffect(() => {
        if (!selectedVisit) return;
        const vId = selectedVisit.v_id || selectedVisit.id;
        const draftKey = `doctor_draft_visit_${vId}`;
        const dataToSave = { notes, vitals, selectedMeds, selectedTests, referral, referredDoctorId };
        
        const timer = setTimeout(() => {
            localStorage.setItem(draftKey, JSON.stringify(dataToSave));
        }, 1000); // 1s debounce
        
        return () => clearTimeout(timer);
    }, [notes, vitals, selectedMeds, selectedTests, referral, referredDoctorId, selectedVisit]);

    const totalPages = Math.ceil((visitsData.count || 0) / 10);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="p-6 h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden flex flex-col">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950">Consultation Room</h1>
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mt-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span>Dr. {user?.first_name || user?.username} — Online</span>
                    </div>
                </div>
                <button onClick={fetchQueue} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                    <RefreshCw size={14} /> Refresh Queue
                </button>
            </div>

            {/* Main Grid */}
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* LEFT: Queue */}
                <div className="col-span-3 bg-white rounded-[24px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3 shrink-0">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">My Queue</h3>
                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{visitsData.count || 0}</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                            <input className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all shadow-sm"
                                placeholder="Search queue..." value={localSearch} onChange={e => setLocalSearch(e.target.value)} />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {[{ id: 'waiting', l: 'Waiting Room' }, { id: 'in_clinic', l: 'In Clinic' }].map(tab => (
                                <button key={tab.id} onClick={() => setQueueTab(tab.id)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${queueTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {tab.l}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? <QueueSkeleton /> : (() => {
                            const filtered = (visitsData.results || []).filter(v => {
                                if (localSearch) return true; // Show all search results regardless of tab
                                if (queueTab === 'waiting') {
                                    // Waiting: directly assigned to this doctor, not yet with lab/pharmacy
                                    return v.assigned_role === 'DOCTOR';
                                } else {
                                    // In Clinic: patient was seen by THIS doctor and is now at Lab/Pharmacy
                                    // (they belong to this visit flow)
                                    return v.assigned_role !== 'DOCTOR' && v.status !== 'CLOSED';
                                }
                            });
                            if (!filtered.length) return (
                                <div className="flex flex-col items-center justify-center h-48 text-center p-6">
                                    <Clock className="text-slate-200 mb-3" size={36} />
                                    <p className="text-sm font-medium text-slate-400">{queueTab === 'waiting' ? 'No patients waiting' : 'No patients in clinic'}</p>
                                </div>
                            );
                            return (
                                <div className="divide-y divide-slate-50">
                                    {filtered.map(v => {
                                        const isActive = selectedVisit && (selectedVisit.v_id || selectedVisit.id) === (v.v_id || v.id);
                                        const hasResults = v.lab_results && v.lab_results.length > 0;
                                        return (
                                            <div key={v.v_id || v.id} onClick={() => setSelectedVisit(v)}
                                                className={`p-4 cursor-pointer transition-all hover:bg-slate-50 relative group ${isActive ? 'bg-blue-50/60' : ''}`}>
                                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />}
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-white border border-slate-100 text-slate-500'}`}>
                                                        {v.patient_name?.[0] || 'U'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                            <p className={`text-sm font-bold truncate ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>{v.patient_name}</p>
                                                            {v.assigned_role === 'LAB' && !hasResults && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-600 border border-purple-200 shrink-0">IN LAB</span>
                                                            )}
                                                            {v.assigned_role === 'PHARMACY' && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-600 border border-emerald-200 shrink-0">PHARMACY</span>
                                                            )}
                                                            {hasResults && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 border border-green-200 shrink-0">✓ RESULTS</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            {v.patient_gender === 'M' ? 'Male' : v.patient_gender === 'F' ? 'Female' : 'Other'}, {v.patient_age} Yrs
                                                        </p>
                                                        {hasResults && (
                                                            <p className="text-[10px] font-bold text-purple-600 mt-0.5 truncate">{v.lab_results.map(r => r.test_name).join(', ')}</p>
                                                        )}
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={16} className={`transition-opacity shrink-0 ${isActive ? 'opacity-100 text-blue-500' : 'opacity-0 group-hover:opacity-50 text-slate-300'}`} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                    <div className="p-3 border-t border-slate-100 shrink-0">
                        <Pagination current={page} total={totalPages} onPageChange={setPage} loading={loading} compact={true} />
                    </div>
                </div>

                {/* RIGHT: Consultation */}
                <div className="col-span-9 bg-white rounded-[24px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                    {selectedVisit ? (
                        <>
                            {/* Patient Header */}
                            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center shrink-0 flex-wrap gap-3">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{selectedVisit.patient_name}</h2>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-0.5 uppercase flex-wrap">
                                            <span>ID: {selectedVisit.patient_registration_number || (selectedVisit.v_id || selectedVisit.id)}</span>
                                            <span className="text-blue-600">
                                                {selectedVisit.patient_gender === 'M' ? 'Male' : selectedVisit.patient_gender === 'F' ? 'Female' : 'Other'} · {selectedVisit.patient_age} Yrs
                                                {selectedVisit.patient_age_months > 0 ? ` ${selectedVisit.patient_age_months} Mos` : ''}
                                            </span>
                                        </div>
                                        {selectedVisit.patient_medical_history && (
                                            <div className="mt-1 text-xs font-bold bg-rose-50 text-rose-800 px-2 py-1 rounded-lg inline-flex items-center gap-1 border border-rose-200">
                                                <Activity size={10} className="text-rose-600" /> PMH: {selectedVisit.patient_medical_history}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center flex-wrap">
                                    <select value={referral} onChange={e => { setReferral(e.target.value); if (e.target.value !== 'DOCTOR') setReferredDoctorId(''); }}
                                        className="h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer">
                                        <option value="NONE">No Referral (Discharge)</option>
                                        <option value="LAB">→ Lab</option>
                                        <option value="PHARMACY">→ Pharmacy</option>
                                        <option value="BILLING">→ Billing</option>
                                        <option value="DOCTOR">→ Another Doctor</option>
                                    </select>
                                    {referral === 'DOCTOR' && (
                                        <select value={referredDoctorId} onChange={e => setReferredDoctorId(e.target.value)}
                                            className="h-10 pl-3 pr-8 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 outline-none cursor-pointer min-w-[150px]">
                                            <option value="">Select Doctor...</option>
                                            {doctorsList.map(doc => (
                                                <option key={doc.u_id || doc.id} value={doc.u_id || doc.id}>
                                                    Dr. {doc.first_name ? `${doc.first_name} ${doc.last_name}` : doc.username}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    <button onClick={() => setSelectedVisit(null)}
                                        className="px-4 py-2 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-100 transition-colors border border-slate-200">
                                        ← Back
                                    </button>
                                    <button onClick={handleSaveConsultation} disabled={saving}
                                        className={`px-6 py-2 text-white rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-60 ${referral !== 'NONE' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-blue-600'}`}>
                                        {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><Send size={14} /> {referral !== 'NONE' ? 'Refer & Release' : 'Finalize & Discharge'}</>}
                                    </button>
                                </div>
                            </div>

                            {/* Workspace */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-8">
                                        {/* Vitals */}
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                                <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600"><Activity size={16} /></div> Vitals Check
                                            </label>
                                            <div className="grid grid-cols-5 gap-3">
                                                {[{ l: 'BP', k: 'bp', ph: '120/80', c: 'blue' }, { l: 'Temp', k: 'temp', ph: '98.6°F', c: 'amber' },
                                                { l: 'Pulse', k: 'pulse', ph: '72 bpm', c: 'rose' }, { l: 'SpO2', k: 'spo2', ph: '98%', c: 'cyan' }, { l: 'Weight', k: 'weight', ph: 'Kg', c: 'slate' }].map(v => (
                                                    <div key={v.k} className={`p-3 bg-${v.c}-50 rounded-2xl border border-${v.c}-100`}>
                                                        <label className={`text-[10px] font-black text-${v.c}-600 uppercase block mb-1`}>{v.l}</label>
                                                        <input className="w-full bg-transparent font-black text-slate-900 outline-none text-xs placeholder:text-slate-300"
                                                            placeholder={v.ph} value={vitals[v.k] || ''} onChange={e => setVitals({ ...vitals, [v.k]: e.target.value })} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Medical History */}
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                                <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600"><Activity size={16} /></div> Medical History
                                            </label>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {['Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Heart Disease'].map(cond => {
                                                    const isA = (medicalHistory || '').includes(cond);
                                                    return (
                                                        <button key={cond} type="button" onClick={() => {
                                                            if (isA) {
                                                                const ps = medicalHistory.split(',').map(s => s.trim()).filter(s => s && !s.includes(cond));
                                                                setMedicalHistory(ps.join(', '));
                                                            } else {
                                                                const ps = medicalHistory.split(',').map(s => s.trim()).filter(Boolean);
                                                                ps.push(cond); setMedicalHistory(ps.join(', '));
                                                            }
                                                        }}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isA ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50'}`}>
                                                            {isA ? '✓ ' : '+ '}{cond}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 focus:bg-white focus:border-rose-400 outline-none transition-all resize-none placeholder:text-slate-400"
                                                rows="2" placeholder="Update known conditions..." value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} />
                                        </div>

                                        {/* Complaints & Examination */}
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                                <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><AlertCircle size={16} /></div> Chief Complaints & Examination
                                            </label>
                                            <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all resize-none placeholder:text-slate-400"
                                                rows="3" placeholder="Chief complaints (e.g., Headache for 3 days)..." value={notes.complaints || ''} onChange={e => setNotes({ ...notes, complaints: e.target.value })} />
                                            <textarea className="w-full mt-2 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all resize-none placeholder:text-slate-400"
                                                rows="3" placeholder="Clinical examination findings..." value={notes.examination || ''} onChange={e => setNotes({ ...notes, examination: e.target.value })} />
                                        </div>

                                        {/* Diagnosis */}
                                        <div>
                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><Stethoscope size={16} /></div>
                                                Clinical Diagnosis & Notes
                                                {referral === 'NONE' && <span className="text-red-400 text-[10px] ml-1">*required to discharge</span>}
                                            </label>
                                            <textarea className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all resize-none placeholder:text-slate-400"
                                                rows="4" placeholder="Clinical findings, diagnosis..." value={notes.diagnosis} onChange={e => setNotes({ ...notes, diagnosis: e.target.value })} />
                                            <textarea className="w-full mt-2 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-400 outline-none transition-all resize-none placeholder:text-slate-400"
                                                rows="2" placeholder="Additional notes (optional)..." value={notes.notes} onChange={e => setNotes({ ...notes, notes: e.target.value })} />
                                        </div>

                                        {/* Lab Results */}
                                        {selectedVisit.lab_results && selectedVisit.lab_results.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-2 bg-green-100 rounded-lg text-green-600"><FlaskConical size={20} /></div>
                                                    <h3 className="text-lg font-bold text-slate-800">Lab Reports</h3>
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">{selectedVisit.lab_results.length} Ready</span>
                                                </div>
                                                {selectedVisit.lab_results.map((report, idx) => (
                                                    <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-4">
                                                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm">{report.test_name}</p>
                                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Tech: {report.technician || report.technician_name || 'N/A'}</p>
                                                            </div>
                                                            <span className="text-xs font-mono text-slate-400">
                                                                {(() => { const d = new Date(report.date || report.report_date); return isNaN(d) ? 'N/A' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })()}
                                                            </span>
                                                        </div>
                                                        <div className="p-4">
                                                            {Array.isArray(report.results) ? (
                                                                <table className="w-full text-sm text-left">
                                                                    <thead className="text-[10px] text-slate-400 uppercase font-bold bg-slate-50/50">
                                                                        <tr><th className="px-3 py-2">Parameter</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Ref. Range</th></tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {report.results.map((res, rIdx) => (
                                                                            <tr key={rIdx}>
                                                                                <td className="px-3 py-2 font-medium text-slate-700">{typeof res === 'object' ? res.name : String(res)}</td>
                                                                                <td className="px-3 py-2 font-bold text-slate-900">{typeof res === 'object' ? res.value : '--'}</td>
                                                                                <td className="px-3 py-2 text-slate-500">{typeof res === 'object' ? res.unit : '--'}</td>
                                                                                <td className="px-3 py-2 text-slate-400 text-xs">{typeof res === 'object' ? res.normal : '--'}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                <pre className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-lg overflow-auto">{JSON.stringify(report.results, null, 2)}</pre>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Casualty */}
                                        {(selectedVisit.casualty_medicines?.length > 0 || selectedVisit.casualty_services?.length > 0) && (
                                            <div>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Activity size={20} /></div>
                                                    <h3 className="text-lg font-bold text-slate-800">Emergency Care Record</h3>
                                                </div>
                                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100">
                                                    {selectedVisit.casualty_observations?.map((obs, idx) => (
                                                        <div key={idx} className="p-4 bg-amber-50/30">
                                                            <span className="text-xs font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Observation</span>
                                                            <p className="text-sm font-medium text-slate-800 mt-2">{obs.observation_notes || 'No notes.'}</p>
                                                        </div>
                                                    ))}
                                                    {selectedVisit.casualty_medicines?.length > 0 && (
                                                        <div className="p-4">
                                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Medicines Administered</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {selectedVisit.casualty_medicines.map((med, idx) => (
                                                                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                                                                        <Pill size={12} className="text-slate-400" />
                                                                        <span className="text-xs font-bold text-slate-700">{med.name}</span>
                                                                        <span className="text-[10px] font-black text-slate-400 bg-white px-1.5 rounded border border-slate-100">x{med.qty}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Lab Requisition */}
                                        <AnimatePresence>
                                            {referral === 'LAB' && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                    <div className="bg-purple-50/50 rounded-[24px] border border-purple-100 p-6">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                                <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600"><ClipboardList size={16} /></div>
                                                                Lab Requisition {selectedTests.length === 0 && <span className="text-red-400 text-[10px]">*required</span>}
                                                            </label>
                                                            <div className="relative w-64 z-20">
                                                                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                                                                <input className="w-full pl-9 pr-4 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-500 transition-all shadow-sm"
                                                                    placeholder="Search lab tests..." value={labSearch} onChange={e => searchLabTests(e.target.value)} />
                                                                <AnimatePresence>
                                                                    {labResults.length > 0 && (
                                                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                                            className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-50 z-30">
                                                                            {labResults.map(test => (
                                                                                <div key={test.id} onClick={() => addTest(test)} className="px-4 py-3 hover:bg-purple-50 cursor-pointer flex justify-between items-center">
                                                                                    <span className="text-sm font-bold text-slate-700">{test.name}</span>
                                                                                    {test.category && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{test.category}</span>}
                                                                                </div>
                                                                            ))}
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 min-h-[48px]">
                                                            {selectedTests.length === 0 && <p className="text-xs text-slate-400 italic w-full text-center py-2">Search and add tests from catalog</p>}
                                                            <AnimatePresence>
                                                                {selectedTests.map(test => (
                                                                    <motion.div key={test.id || test.name}
                                                                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                                                        className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-purple-200 rounded-lg shadow-sm">
                                                                        <span className="text-xs font-bold text-slate-700">{test.name}</span>
                                                                        <button onClick={() => removeTest(test.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><X size={12} /></button>
                                                                    </motion.div>
                                                                ))}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Assign Services */}
                                        <AnimatePresence>
                                            {true && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
                                                    <div className="bg-teal-50/50 rounded-[24px] border border-teal-100 p-6">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                                <div className="p-1.5 bg-teal-100 rounded-lg text-teal-600"><Activity size={16} /></div>
                                                                Assign Services
                                                            </label>
                                                            <div className="relative w-64 z-20">
                                                                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                                                                <input className="w-full pl-9 pr-4 py-2 bg-white border border-teal-200 rounded-xl text-xs font-bold outline-none focus:border-teal-500 transition-all shadow-sm"
                                                                    placeholder="Search services..." value={serviceSearch} onChange={e => searchServices(e.target.value)} />
                                                                <AnimatePresence>
                                                                    {serviceResults.length > 0 && (
                                                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                                            className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-50 z-30">
                                                                            {serviceResults.map(srv => (
                                                                                <div key={srv.id} onClick={() => addService(srv)} className="px-4 py-3 hover:bg-teal-50 cursor-pointer flex justify-between items-center">
                                                                                    <span className="text-sm font-bold text-slate-700">{srv.name}</span>
                                                                                </div>
                                                                            ))}
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 min-h-[48px]">
                                                            {selectedServices.length === 0 && <p className="text-xs text-slate-400 italic w-full text-center py-2">Search and assign services (e.g. ECG)</p>}
                                                            <AnimatePresence>
                                                                {selectedServices.map(srv => (
                                                                    <motion.div key={srv.id}
                                                                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                                                        className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-teal-200 rounded-lg shadow-sm">
                                                                        <span className="text-xs font-bold text-slate-700">{srv.name}</span>
                                                                        <button onClick={() => removeService(srv.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><X size={12} /></button>
                                                                    </motion.div>
                                                                ))}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Prescription Pad */}
                                        <div className="bg-slate-50/50 rounded-[24px] border border-slate-100 p-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                    <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600"><Pill size={16} /></div>
                                                    Prescription Pad
                                                    {selectedMeds.length > 0 && referral !== 'PHARMACY' && referral !== 'BILLING' && (
                                                        <span className="text-amber-500 text-[10px] ml-1">⚠ Set referral to Pharmacy</span>
                                                    )}
                                                </label>
                                                <div className="relative w-64 z-20">
                                                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                                                    <input className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-sm"
                                                        placeholder="Search medicine..." value={medSearch} onChange={e => searchMedicines(e.target.value)} />
                                                    <AnimatePresence>
                                                        {medResults.length > 0 && (
                                                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-50 z-30">
                                                                {medResults.map(med => (
                                                                    <div key={med.id} onClick={() => addMedicine(med)}
                                                                        className={`px-4 py-3 cursor-pointer flex justify-between items-center group transition-colors ${med.qty_available < 1 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-emerald-50'}`}>
                                                                        <div>
                                                                            <span className={`text-sm font-bold ${med.qty_available < 1 ? 'text-red-700' : 'text-slate-700 group-hover:text-emerald-700'}`}>{med.name}</span>
                                                                            {med.qty_available < 1 && <span className="block text-[9px] font-bold text-red-500">Out of Stock</span>}
                                                                        </div>
                                                                        <div className="flex flex-col items-end">
                                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 ${med.qty_available < 1 ? 'bg-red-200 text-red-800' : med.qty_available < 10 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                                {med.qty_available < 1 ? '0 Stock' : `Stock: ${med.qty_available}`}
                                                                            </span>
                                                                            <span className="text-[10px] font-black text-emerald-600">₹{(med.mrp / (med.tablets_per_strip || 1)).toFixed(2)}/Tab</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                            <div className="space-y-3 min-h-[80px]">
                                                {selectedMeds.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-8 text-slate-300 border-2 border-dashed border-slate-200 rounded-xl">
                                                        <Plus size={24} /><span className="text-xs font-bold mt-2">Search and add medicines above</span>
                                                    </div>
                                                ) : (
                                                    <AnimatePresence>
                                                        {selectedMeds.map((med, idx) => {
                                                            const pQty = parseInt(med.count) || 0;
                                                            const stock = med.stock || 0;
                                                            const isIns = pQty > stock && stock > 0;
                                                            const isOOS = stock === 0;
                                                            const isLow = stock > 0 && stock < 10 && !isIns;
                                                            return (
                                                                <motion.div key={med.name}
                                                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                                                                    className={`bg-white p-4 rounded-xl border-2 shadow-sm flex flex-col gap-3 ${isIns || isOOS ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
                                                                    <div className="flex items-center justify-between w-full">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isIns || isOOS ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{idx + 1}</div>
                                                                            <div>
                                                                                <span className="font-bold text-slate-800 text-sm">{med.name}</span>
                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                    {isOOS ? (
                                                                                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md flex items-center gap-1"><AlertCircle size={10} /> Out of Stock</span>
                                                                                    ) : isIns ? (
                                                                                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md flex items-center gap-1"><AlertCircle size={10} /> Only {stock} in stock</span>
                                                                                    ) : isLow ? (
                                                                                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">Low: {stock} Tabs</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">Stock: {stock} Tabs</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            {med.mrp > 0 && (
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="text-[10px] font-bold text-slate-400">₹{(med.mrp / (med.tps || 1)).toFixed(2)}/Tab</span>
                                                                                    <span className="text-xs font-black text-slate-900">Est: ₹{((med.mrp / (med.tps || 1)) * pQty).toFixed(2)}</span>
                                                                                </div>
                                                                            )}
                                                                            <button onClick={() => removeMedicine(med.name)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 w-full">
                                                                        {[
                                                                            { field: 'dosage', l: 'Dosage', ph: '1-0-1', lid: `d-${idx}`, opts: ['1-0-1', '1-1-1', '1-0-0', '0-0-1', '0-1-0', 'SOS', 'STAT'] },
                                                                            { field: 'duration', l: 'Duration', ph: '5 Days', lid: `dur-${idx}`, opts: ['1 Day', '3 Days', '5 Days', '1 Week', '2 Weeks', '1 Month', '2 Months', '3 Months'] },
                                                                        ].map(inp => (
                                                                            <div key={inp.field} className="relative flex-1">
                                                                                <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase z-10">{inp.l}</label>
                                                                                <input list={inp.lid} value={med[inp.field]} placeholder={inp.ph}
                                                                                    onChange={e => handleMedFieldChange(med.name, inp.field, e.target.value)}
                                                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:border-blue-500 focus:bg-white outline-none" />
                                                                                <datalist id={inp.lid}>{inp.opts.map(o => <option key={o} value={o} />)}</datalist>
                                                                            </div>
                                                                        ))}
                                                                        <div className="relative flex-1">
                                                                            <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase z-10">Qty</label>
                                                                            <input type="number" min="1" value={med.count}
                                                                                onChange={e => handleMedFieldChange(med.name, 'count', e.target.value)}
                                                                                className={`w-full px-3 py-2 bg-slate-50 border-2 rounded-lg text-xs font-bold text-center outline-none transition-all focus:bg-white ${isIns ? 'border-red-400 text-red-700' : 'border-slate-200 focus:border-blue-500'}`} />
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </AnimatePresence>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* History Sidebar */}
                                    <div className="col-span-1 border-l border-slate-100 pl-8">
                                        <div className="sticky top-0 space-y-6">
                                            <div>
                                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4">
                                                    <History size={16} className="text-purple-500" /> History Timeline
                                                </label>
                                                <div className="space-y-0 relative">
                                                    <div className="absolute left-2.5 top-2 bottom-0 w-0.5 bg-slate-100" />
                                                    {historyLoading ? (
                                                        <div className="pl-8 text-xs text-slate-400 animate-pulse">Loading history...</div>
                                                    ) : patientHistory.length === 0 ? (
                                                        <div className="pl-8 text-xs text-slate-400 italic">No previous records.</div>
                                                    ) : (
                                                        patientHistory.map((h, i) => {
                                                            const mc = prescriptionCount(h.prescription);
                                                            return (
                                                                <div key={h.note_id || h.id || i} className="relative pl-8 pb-6 group cursor-pointer"
                                                                    onClick={() => setViewingHistory({ ...h, lab_results: h.lab_results || [] })}>
                                                                    <div className="absolute left-0 top-1 w-5 h-5 bg-white border-2 border-slate-200 rounded-full group-hover:border-blue-500 transition-colors z-10" />
                                                                    <p className="text-xs font-bold text-slate-400 mb-1">{new Date(h.created_at).toLocaleDateString()}</p>
                                                                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm group-hover:shadow-md transition-all group-hover:border-blue-200">
                                                                        <p className="text-xs font-bold text-slate-800 line-clamp-2">{h.diagnosis || 'No diagnosis'}</p>
                                                                        <div className="mt-2 flex gap-1 flex-wrap">
                                                                            {mc > 0 && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{mc} Med{mc > 1 ? 's' : ''}</span>}
                                                                            {h.lab_results?.length > 0 && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold">{h.lab_results.length} Lab</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                                <div className="p-4 bg-white rounded-full shadow-sm"><Stethoscope size={40} className="text-blue-200" /></div>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready for Consultation</h2>
                            <p className="text-slate-500 max-w-md mx-auto">
                                Select a patient from the <strong>Waiting Room</strong> tab to begin.
                                If you sent a patient to the Lab, check the <strong>In Clinic</strong> tab for their results.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {viewingHistory && <HistoryModal history={viewingHistory} onClose={() => setViewingHistory(null)} />}
            </AnimatePresence>
        </div>
    );
};

export default Doctor;
