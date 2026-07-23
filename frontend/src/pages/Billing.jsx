import React, { useState, useEffect, useRef } from "react";
import {
    Plus, Search, FileText, Download, Printer, CheckCircle2,
    Clock, TrendingUp, IndianRupee, AlertCircle, X, User,
    Calendar, Pill, ChevronDown, Import, ChevronRight, Sparkles,
    Eye, CreditCard, Wallet, MoreHorizontal, RotateCcw
} from "lucide-react";
import api from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";
import { useDialog } from "../context/DialogContext";
import { socket } from "../socket";
import Pagination from "../components/Pagination";

const Billing = () => {
    const { showToast } = useToast();
    const { confirm } = useDialog();

    // --- State ---
    const [invoices, setInvoices] = useState([]);
    const [pendingVisits, setPendingVisits] = useState([]);
    const [stats, setStats] = useState({ revenue_today: 0, pending_amount: 0, invoices_today: 0 });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const [totalInvoices, setTotalInvoices] = useState(0);
    const globalSearch = searchTerm; // Map searchTerm to globalSearch for compatibility with the copied logic

    // --- Date Filter State ---
    const getLocalDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const [selectedDate, setSelectedDate] = useState(getLocalDate());

    // --- Forms ---
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);
    const [pharmacyStock, setPharmacyStock] = useState([]);
    const [serviceDefinitions, setServiceDefinitions] = useState([]); // New state for services
    const [availableLabTests, setAvailableLabTests] = useState([]); // New state for lab tests
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [stockSearch, setStockSearch] = useState({ index: -1, term: "" });

    const [formData, setFormData] = useState({
        patient_name: "",
        doctor_display_name: "",
        visit: null,
        doctor: "",
        payment_status: "PENDING",
        discount_amount: 0,
        patient: null,
        items: [{ dept: "PHARMACY", description: "", qty: 1, unit_price: 0, amount: 0, hsn: "", batch: "", gst_percent: 0, expiry: "", dosage: "", duration: "", mfr: "" }]
    });

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({ invoice: null, payments: { CASH: '', UPI: '', CARD: '' }, remarks: '' });

    // --- Effects ---
    useEffect(() => {
        const fetchData = async () => {
            await Promise.all([
                fetchInvoices(true),
                fetchStats(false),
                fetchPendingVisits(false)
            ]);
        };
        fetchData();
        fetchMetadata(); // Call fetchMetadata once on mount

        // Polling - 4 seconds
        const interval = setInterval(() => {
            fetchInvoices(false);
            fetchStats(false);
            fetchPendingVisits(false);
        }, 4000);

        // Socket Listener
        const onPharmacySale = (data) => {
            console.log("Socket: Pharmacy Sale Update", data);
            fetchPendingVisits(false);
            fetchStats(false);
            showToast('info', 'New billing entry available');
        };

        socket.on('pharmacy_sale_update', onPharmacySale);

        return () => {
            clearInterval(interval);
            socket.off('pharmacy_sale_update', onPharmacySale);
        };

    }, [page, globalSearch, selectedDate]);

    // --- API Calls ---
    const fetchInvoices = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const { data } = await api.get(`/billing/invoices/?page=${page}${globalSearch ? `&search=${encodeURIComponent(globalSearch)}` : ''}${selectedDate ? `&date=${selectedDate}` : ''}`);
            setInvoices(data.results || (Array.isArray(data) ? data : []));
            setTotalInvoices(data.count || (Array.isArray(data) ? data.length : 0));
        } catch (err) {
            showToast('error', 'Failed to load invoices.');
        } finally {
            if (showLoading) {
                setTimeout(() => setLoading(false), 500);
            }
        }
    };

    const fetchPendingVisits = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            // Visits where assigned_role is BILLING OR have unpaid/draft invoices
            const { data } = await api.get('/reception/visits/?billing_queue=true');
            setPendingVisits(data.results || data || []);
        } catch (err) {
            console.error('Failed to load pending bills', err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const fetchStats = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const { data } = await api.get(`/billing/invoices/stats/?${selectedDate ? `date=${selectedDate}` : ''}`);
            setStats(data);
        } catch (err) {
            console.error('Failed to load billing stats', err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const [docRes, patRes, stockRes, svcRes, labRes] = await Promise.all([
                api.get(`users/management/doctors/?page_size=1000`),
                api.get(`reception/patients/?page_size=10000`),
                api.get(`pharmacy/stock/?page_size=10000`),
                api.get(`casualty/service-definitions/?page_size=10000`),
                api.get(`lab/tests/?page_size=10000`)
            ]);
            setDoctors(Array.isArray(docRes.data) ? docRes.data : docRes.data.results);
            setPatients(Array.isArray(patRes.data) ? patRes.data : patRes.data.results);
            setPharmacyStock(Array.isArray(stockRes.data) ? stockRes.data : stockRes.data.results);
            setServiceDefinitions(Array.isArray(svcRes.data) ? svcRes.data : svcRes.data.results);
            setAvailableLabTests(Array.isArray(labRes.data) ? labRes.data : labRes.data.results);
        } catch (err) { console.error(err); }
    };

    // --- Stock / Service Search Logic ---
    const handleStockSearch = (term, index) => {
        if (!term || term.length < 2) {
            setStockSearch({ index: -1, term: "", results: [] });
            return;
        }

        const lowerTerm = term.toLowerCase();

        // Search Service Definitions
        const matchedServices = serviceDefinitions
            .filter(s => s.name.toLowerCase().includes(lowerTerm))
            .map(s => ({ ...s, type: 'SERVICE' }))
            .slice(0, 5);

        // Search Lab Tests
        const matchedLabs = availableLabTests
            .filter(s => s.name.toLowerCase().includes(lowerTerm))
            .map(s => ({ ...s, type: 'LAB' }))
            .slice(0, 5);

        const combined = [...matchedLabs, ...matchedServices];
        
        setStockSearch({ index, term, results: combined });
    };

    const handleSelectStock = (itemData, index) => {
        // Prevent duplication
        const existing = formData.items.findIndex((i, idx) => i.description === itemData.name && idx !== index);
        if (existing !== -1) {
            showToast('error', 'Item already added to invoice!');
            setStockSearch({ index: -1, term: "", results: [] });
            return;
        }

        const newItems = [...formData.items];
        const qty = parseFloat(newItems[index].qty) || 1;

        if (itemData.type === 'SERVICE') {
            const unitPrice = parseFloat(itemData.base_charge) || 0;
            newItems[index] = {
                ...newItems[index],
                dept: "CASUALTY",
                description: itemData.name,
                batch: "",
                unit_price: unitPrice.toFixed(2),
                qty: qty,
                amount: (qty * unitPrice).toFixed(2),
                hsn: "",
                gst_percent: 0,
                expiry: "",
                stock_deducted: false,
                deducted_qty: 0,
                mfr: "",
                ref_id: itemData.id // Save the service definition ID for syncing later
            };
        } else if (itemData.type === 'LAB') {
            const unitPrice = parseFloat(itemData.price) || 0;
            newItems[index] = {
                ...newItems[index],
                dept: "LAB",
                description: itemData.name,
                batch: "",
                unit_price: unitPrice.toFixed(2),
                qty: qty,
                amount: (qty * unitPrice).toFixed(2),
                hsn: "",
                gst_percent: 0,
                expiry: "",
                stock_deducted: false,
                deducted_qty: 0,
                mfr: "",
                ref_id: itemData.id // Save the lab test ID for syncing later
            };
        } else {
            // STOCK
            const tps = itemData.tablets_per_strip || 1;
            const unitPrice = parseFloat(itemData.selling_price) / tps;
            newItems[index] = {
                ...newItems[index],
                dept: "PHARMACY",
                description: itemData.name,
                batch: itemData.batch_no,
                unit_price: unitPrice.toFixed(2),
                qty: qty,
                amount: (qty * unitPrice).toFixed(2),
                hsn: itemData.hsn || "",
                gst_percent: itemData.gst_percent || 0,
                expiry: itemData.expiry_date || "",
                stock_deducted: false,
                deducted_qty: 0,
                mfr: itemData.manufacturer || ""
            };
        }

        // Auto append empty row for next search
        newItems.push({ dept: "", description: "", qty: 1, unit_price: 0, amount: 0, hsn: "", batch: "", gst_percent: 0, expiry: "", dosage: "", duration: "" });
        
        setFormData({ ...formData, items: newItems });
        setStockSearch({ index: -1, term: "", results: [] });
    };

    // --- Logic ---
    const handleBillNow = async (visit) => {
        const patId = (visit.patient && typeof visit.patient === 'object') ? visit.patient.id : visit.patient;
        const patientObj = patients.find(p => p.id === patId);
        const patientName = visit.patient_name || (patientObj ? patientObj.full_name : "Unknown");

        let doctorToSet = visit.doctor || "";
        if (!doctorToSet && visit.doctor_name) {
            const foundDoctor = doctors.find(d => `Dr. ${d.first_name} ${d.last_name}`.toLowerCase().includes(visit.doctor_name.toLowerCase()));
            if (foundDoctor) doctorToSet = foundDoctor.id;
        }

        // --- Check for existing invoice ---
        try {
            const existingInvoiceRes = await api.get(`/billing/invoices/?visit=${visit.id || visit.v_id}`);
            const existingInvoices = existingInvoiceRes.data.results || existingInvoiceRes.data;
            const activeInvoice = existingInvoices.find(inv => inv.payment_status !== 'CANCELLED');
            
            if (activeInvoice) {
                handleEditInvoice(activeInvoice);
                return; // Stop here, we loaded the existing invoice!
            }
        } catch (err) {
            console.warn("Could not check for existing invoices:", err);
        }

        const newFormData = {
            patient_name: patientName,
            patient: patId || null,
            doctor_display_name: visit.doctor_name || "Not Assigned",
            visit: visit.id || visit.v_id,
            doctor: doctorToSet,
            payment_status: "PENDING",
            discount_amount: 0,
            registration_number: (visit.patient && visit.patient.registration_number) || (patientObj && patientObj.registration_number) || "N/A",
            items: []
        }

        const isPharmacyVisit = visit.vitals && visit.vitals.note === 'Auto-created from Pharmacy Manual Sale';
        // Only add Consultation Fee if:
        // 1. Doctor is assigned AND
        // 2. It is NOT purely a Casualty visit (unless they saw a doctor explicitly)
        // 3. It is NOT a direct Lab referral from Casualty
        const isCasualtyDirectLab = visit.assigned_role === 'LAB' && (visit.casualty_services?.length > 0 || visit.casualty_medicines?.length > 0);

        if (visit.doctor_name && visit.doctor_name !== "Not Assigned" && !isPharmacyVisit && visit.doctor && !isCasualtyDirectLab) {
            const fee = visit.consultation_fee ? parseFloat(visit.consultation_fee) : 500;
            newFormData.items.push({ dept: "CONSULTATION", description: "General Consultation Fee", qty: 1, unit_price: fee, amount: fee, hsn: "", batch: "", gst_percent: 0, expiry: "", dosage: "", duration: "" });
        }

        if (visit.pharmacy_items && visit.pharmacy_items.length > 0) {
            console.log("=== PHARMACY ITEMS FROM BACKEND ===");
            visit.pharmacy_items.forEach((item, idx) => {
                console.log(`Item ${idx + 1}: ${item.name}`);
                console.log(`  - qty: ${item.qty}`);
                console.log(`  - unit_price: ${item.unit_price}`);
                console.log(`  - amount: ${item.amount}`);
                console.log(`  - gst: ${item.gst}%`);

                // Note: pharmacy_items from backend are already at tablet level prices if processed by PharmacySale
                newFormData.items.push({
                    dept: "PHARMACY", description: item.name, qty: item.qty, unit_price: parseFloat(item.unit_price), amount: parseFloat(item.amount),
                    hsn: item.hsn || "", batch: item.batch || "", gst_percent: item.gst || 0, expiry: "", dosage: item.dosage || "", duration: item.duration || "",
                    stock_deducted: true,
                    deducted_qty: item.qty
                });
            });
            console.log("=== END PHARMACY ITEMS ===");
        }

        if (visit.casualty_medicines && visit.casualty_medicines.length > 0) {
            visit.casualty_medicines.forEach(item => {
                newFormData.items.push({
                    dept: "PHARMACY", description: item.name, qty: item.qty, unit_price: parseFloat(item.unit_price), amount: parseFloat(item.total_price),
                    hsn: item.hsn || "", batch: item.batch || "", gst_percent: item.gst || 0, expiry: "", dosage: item.dosage || "", duration: "",
                    stock_deducted: true,
                    deducted_qty: item.qty
                });
            });
        }

        if (visit.casualty_services && visit.casualty_services.length > 0) {
            visit.casualty_services.forEach(item => {
                newFormData.items.push({
                    dept: "CASUALTY", description: item.name, qty: item.qty, unit_price: parseFloat(item.unit_charge), amount: parseFloat(item.total_charge),
                    hsn: "", batch: "", gst_percent: 0, expiry: "", dosage: "", duration: ""
                });
            });
        }

        if (visit.casualty_observations && visit.casualty_observations.length > 0) {
            visit.casualty_observations.forEach(obs => {
                if (obs.is_active || obs.end_time) {
                    // Logic: If active, calculate up to NOW. If ended, use stored duration or end_time - start_time
                    let durationMinutes = obs.planned_duration_minutes; // Fallback to planned

                    if (obs.start_time) {
                        const start = new Date(obs.start_time);
                        const end = obs.end_time ? new Date(obs.end_time) : new Date();
                        const elapsed = Math.ceil((end - start) / 60000);
                        // Use the greater of: Actual Elapsed, Planned Duration, or Minimum 60 mins
                        durationMinutes = Math.max(elapsed, obs.planned_duration_minutes || 0, 60);
                    }

                    const hours = (durationMinutes / 60).toFixed(1);

                    // Look for configured rate
                    const obsService = serviceDefinitions.find(s => s.name.toLowerCase().includes('observation'));
                    const chargePerHr = obsService ? parseFloat(obsService.base_charge) : 500;

                    const obsAmount = Math.ceil(parseFloat(hours) * chargePerHr);

                    newFormData.items.push({
                        dept: "CASUALTY", description: `Observation Charges (${hours} hrs @ ₹${chargePerHr}/hr)`, qty: 1, unit_price: obsAmount, amount: obsAmount,
                        hsn: "", batch: "", gst_percent: 0, expiry: "", dosage: "", duration: ""
                    });
                }
            });
        }

        if (visit.lab_charges_data && visit.lab_charges_data.length > 0) {
            visit.lab_charges_data.forEach(item => {
                if (item.status !== 'CANCELLED' && parseFloat(item.amount) > 0) {
                    newFormData.items.push({
                        dept: "LAB", description: item.test_name, qty: 1, unit_price: parseFloat(item.amount), amount: parseFloat(item.amount),
                        hsn: "", batch: "", gst_percent: 0, expiry: "", dosage: "", duration: ""
                    });
                }
            });
        }

        setFormData(newFormData);
        setSelectedPatientId(patId);
        setShowModal(true);
    };

    const handleImportPrescription = async (overridePatientId = null) => {
        const patId = overridePatientId || selectedPatientId;
        if (!patId) return showToast('error', "No patient selected.");

        try {
            const vId = ((typeof formData.visit === 'object') ? formData.visit.id : formData.visit);

            // 1. Fetch Doctor Notes
            let notesData = [];
            try {
                const res = vId ? await api.get(`medical/doctor-notes/?visit=${vId}`) : await api.get(`medical/doctor-notes/?visit__patient=${patId}`);
                notesData = res.data.results || (Array.isArray(res.data) ? res.data : []);
            } catch (e) { console.warn("Failed to fetch notes:", e); }

            // 2. Fetch Fresh Visit Details (CRITICAL for getting latest Pharmacy prices)
            let freshPharmacySales = [];
            if (vId) {
                try {
                    console.log(`Fetching fresh visit data for ID: ${vId}`);
                    const visitRes = await api.get(`reception/visits/${vId}/`);
                    if (visitRes.data && visitRes.data.pharmacy_items) {
                        freshPharmacySales = visitRes.data.pharmacy_items;
                        console.log("Fresh pharmacy items loaded:", freshPharmacySales);
                    }
                } catch (e) {
                    console.warn("Failed to fetch fresh visit details, utilizing fallback:", e);
                    // Fallback to existing formData.visit data
                    if (formData.visit && formData.visit.pharmacy_items) {
                        freshPharmacySales = formData.visit.pharmacy_items;
                    }
                }
            } else if (formData.visit && formData.visit.pharmacy_items) {
                freshPharmacySales = formData.visit.pharmacy_items;
            }

            const newItems = [...formData.items];
            const addedMedNames = new Set(newItems.map(i => i.description.toLowerCase()));

            // A. Process Prescription Items (if any)
            if (notesData.length > 0) {
                const lastNote = notesData[0];
                if (lastNote.prescription) {
                    const presItems = Array.isArray(lastNote.prescription)
                        ? lastNote.prescription
                        : Object.entries(lastNote.prescription).map(([name, details]) => ({ name, details }));

                    presItems.forEach(p => {
                        const medName = (p.name || "").trim();
                        if (!medName || addedMedNames.has(medName.toLowerCase())) return;

                        let qty = 1;
                        if (p.details) {
                            const qtyMatch = p.details.match(/Qty:\s*(\d+)/i);
                            if (qtyMatch && qtyMatch[1]) qty = parseInt(qtyMatch[1], 10);
                        }

                        // Match with Pharmacy Sale
                        const pharmacyRecord = freshPharmacySales.find(i => i.name.toLowerCase() === medName.toLowerCase());
                        const stockItem = pharmacyStock.find(s => s.name.toLowerCase() === medName.toLowerCase());

                        let unitPrice = 0, amount = 0, gstPercent = 0;
                        let hsn = "", batch = "", expiry = "";

                        if (pharmacyRecord) {
                            unitPrice = parseFloat(pharmacyRecord.unit_price) || 0;
                            qty = pharmacyRecord.qty || qty; // Use actual billed qty if available
                            gstPercent = pharmacyRecord.gst || 0;
                            hsn = pharmacyRecord.hsn || "";
                            batch = pharmacyRecord.batch || "";
                            expiry = pharmacyRecord.expiry || ""; // Assuming serializer sends this?
                        } else if (stockItem) {
                            const tps = stockItem.tablets_per_strip || 1;
                            unitPrice = (parseFloat(stockItem.mrp) || 0) / tps;
                            gstPercent = stockItem.gst_percent || 0;
                            hsn = stockItem.hsn || "";
                            batch = stockItem.batch_no || "";
                            expiry = stockItem.expiry_date || "";
                        }

                        amount = (unitPrice * qty).toFixed(2);

                        newItems.push({
                            dept: "PHARMACY",
                            description: medName,
                            qty: qty,
                            unit_price: unitPrice,
                            amount: amount,
                            hsn: hsn,
                            batch: batch,
                            gst_percent: gstPercent,
                            expiry: expiry,
                            dosage: p.details || "",
                            duration: "",
                            stock_deducted: !!pharmacyRecord,
                            deducted_qty: pharmacyRecord ? pharmacyRecord.qty : 0,
                            mfr: pharmacyRecord ? (pharmacyRecord.manufacturer || "") : (stockItem ? (stockItem.manufacturer || "") : "")
                        });
                        addedMedNames.add(medName.toLowerCase());
                    });
                }
            }

            // B. Process Remaining Pharmacy Items (Manual Sales or Non-Prescribed)
            if (freshPharmacySales.length > 0) {
                freshPharmacySales.forEach(item => {
                    const medName = item.name;
                    if (addedMedNames.has(medName.toLowerCase())) return; // Already added via prescription match

                    newItems.push({
                        dept: "PHARMACY",
                        description: medName,
                        qty: item.qty,
                        unit_price: parseFloat(item.unit_price) || 0,
                        amount: parseFloat(item.amount) || 0,
                        hsn: item.hsn || "",
                        batch: item.batch || "",
                        gst_percent: item.gst || 0,
                        expiry: "", // Serializer doesn't pass expiry yet?
                        dosage: item.dosage || "",
                        duration: item.duration || "",
                        stock_deducted: true,
                        deducted_qty: item.qty
                    });
                    addedMedNames.add(medName.toLowerCase());
                });
            }

            setFormData(prev => ({ ...prev, items: newItems }));
            showToast('success', "Imported prescription and pharmacy data.");
        } catch (err) {
            console.error("Import prescription error:", err);
            showToast('error', "Failed to import.");
        }
    };

    const calculateSubtotal = (items) => (items || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitLock = useRef(false);

    const handleCreateInvoice = async (status = 'PENDING') => {
        if (isSubmitting || submitLock.current) return; // Prevent double clicks synchronously
        submitLock.current = true;
        setIsSubmitting(true);

        try {
            // Filter out empty items (no description or empty description)
            const validItems = formData.items.filter(item => item.description && item.description.trim() !== '');

            if (validItems.length === 0) {
                showToast('error', 'Please add at least one item to generate an invoice.');
                return;
            }

            // --- Client Side Stock Validation ---
            for (const item of validItems) {
                if (item.dept === 'PHARMACY' && !item.stock_deducted) {
                    // Find current stock in our local list
                    const stock = pharmacyStock.find(s =>
                        s.name.toLowerCase() === item.description.toLowerCase() &&
                        s.batch_no.toLowerCase() === (item.batch || "").toLowerCase()
                    );

                    if (stock) {
                        if (stock.qty_available < item.qty) {
                            return showToast('error', `Insufficient stock for ${item.description}. Available: ${stock.qty_available}, Requested: ${item.qty}`);
                        }
                    } else if (item.qty > 0) {
                        return showToast('error', `No stock record found for ${item.description}. Please select from the dropdown.`);
                    }
                }
            }

            const subtotal = calculateSubtotal(validItems);
            const discount = parseFloat(formData.discount_amount) || 0;
            const invoiceData = {
                patient_name: formData.patient_name,
                patient: formData.patient || selectedPatientId || null,
                payment_status: status,
                total_amount: subtotal.toFixed(2),
                discount_amount: discount.toFixed(2),
                items: validItems.map(({ id, created_at, updated_at, ...rest }) => ({ ...rest, id })),
                visit: (typeof formData.visit === 'object' && formData.visit) ? formData.visit.id : formData.visit
            };

            let savedInvoice;
            if (formData.id) {
                const res = await api.patch(`billing/invoices/${formData.id}/`, invoiceData);
                savedInvoice = res.data;
            } else {
                const res = await api.post(`billing/invoices/`, invoiceData);
                savedInvoice = res.data;
            }

            // --- Sync Labs and Services to the Visit! ---
            if (formData.visit) {
                const visitId = typeof formData.visit === 'object' ? formData.visit.id : formData.visit;
                if (visitId) {
                    const newLabTests = validItems.filter(i => i.dept === 'LAB' && i.ref_id).map(i => i.ref_id);
                    const newServices = validItems.filter(i => i.dept === 'CASUALTY' && i.ref_id).map(i => i.ref_id);
                    
                    if (newLabTests.length > 0 || newServices.length > 0) {
                        try {
                            const visitRes = await api.get(`/reception/visits/${visitId}/`);
                            const visitData = visitRes.data;
                            
                            const existingLabs = (visitData.lab_tests || []).map(t => t.id || t);
                            const existingServices = (visitData.casualty_services || []).map(s => s.id || s);

                            const mergedLabs = Array.from(new Set([...existingLabs, ...newLabTests]));
                            const mergedServices = Array.from(new Set([...existingServices, ...newServices]));

                            await api.patch(`/reception/visits/${visitId}/`, {
                                lab_tests: mergedLabs,
                                casualty_services: mergedServices
                            });
                        } catch (err) {
                            console.error("Failed to sync labs/services to visit", err);
                        }
                    }
                }
            }

            fetchInvoices(false); fetchStats(false); fetchPendingVisits(false);
            
            if (status === 'DRAFT') {
                showToast('success', "Invoice saved as Draft!");
                // Update formData with the ID from the backend so subsequent saves are PATCHes
                setFormData(prev => ({ ...prev, id: savedInvoice.id }));
            } else {
                setShowModal(false);
                setFormData({ patient_name: "", patient: null, visit: null, doctor: "", payment_status: "PENDING", discount_amount: 0, items: [] });
                
                if (savedInvoice && (savedInvoice.payment_status === 'PENDING' || savedInvoice.payment_status === 'PARTIAL')) {
                    setPaymentData({ invoice: savedInvoice, payments: { CASH: '', UPI: '', CARD: '' }, remarks: '' });
                    setShowPaymentModal(true);
                    showToast('success', "Invoice generated! Please collect payment.");
                } else {
                    showToast('success', "Invoice saved successfully!");
                }
            }
        } catch (err) {
            console.error("Invoice save error:", err);
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Failed to save invoice.";
            showToast('error', errorMsg);
        } finally {
            setIsSubmitting(false);
            submitLock.current = false;
        }
    };

    const handleEditInvoice = async (invoice) => {
        setLoading(true);
        try {
            const vId = invoice.visit && typeof invoice.visit === 'object' ? invoice.visit.id : invoice.visit;
            let visitData = null;

            if (vId) {
                const res = await api.get(`/reception/visits/${vId}/`);
                visitData = res.data;
            }

            let baseItems = invoice.items.map(i => ({ ...i }));

            // Cleanup: remove consultation fee if no doctor
            if (visitData && !visitData.doctor) {
                baseItems = baseItems.filter(i => i.dept !== 'CONSULTATION' && i.description !== 'General Consultation Fee');
            }

            // Sync Pharmacy Items
            const visitPharmacyItems = ((visitData && visitData.pharmacy_items) || []).map(item => ({
                dept: "PHARMACY",
                description: item.name,
                qty: item.qty,
                unit_price: parseFloat(item.unit_price),
                amount: parseFloat(item.amount),
                hsn: item.hsn || "",
                batch: item.batch || "",
                gst_percent: item.gst || 0,
                dosage: item.dosage || "",
                duration: item.duration || "",
                stock_deducted: true,
                deducted_qty: item.qty
            }));

            // Sync Casualty Items
            const visitCasualtyMedicines = ((visitData && visitData.casualty_medicines) || []).map(item => ({
                dept: "PHARMACY",
                description: item.name,
                qty: item.qty,
                unit_price: parseFloat(item.unit_price),
                amount: parseFloat(item.total_price),
                hsn: item.hsn || "",
                batch: item.batch || "",
                gst_percent: item.gst || 0,
                dosage: item.dosage || "",
                duration: "",
                stock_deducted: true,
                deducted_qty: item.qty
            }));

            const visitCasualtyServices = ((visitData && visitData.casualty_services) || []).map(item => ({
                dept: "CASUALTY",
                description: item.name,
                qty: item.qty,
                unit_price: parseFloat(item.unit_charge),
                amount: parseFloat(item.total_charge),
                hsn: "",
                batch: "",
                gst_percent: 0,
                stock_deducted: false,
                deducted_qty: 0
            }));

            // Note: Observations are usually one-time add. Re-syncing logic might duplicate if not careful.
            // For now, simpler to just append them if not present, OR rely on initial creation.
            // Let's rely on standard item merging logic below.

            let uniquePharmacyItems = [];
            let uniqueCasualtyMeds = [];
            let uniqueCasualtyServices = [];
            let uniqueLabItems = [];

            if (invoice.payment_status !== 'PAID' && invoice.payment_status !== 'CANCELLED') {
                const visitLabItems = ((visitData && visitData.lab_charges_data) || []).map(item => ({
                    dept: "LAB",
                    description: item.test_name,
                    qty: 1,
                    unit_price: parseFloat(item.amount),
                    amount: parseFloat(item.amount),
                    hsn: "",
                    batch: "",
                    gst_percent: 0,
                    stock_deducted: false,
                    deducted_qty: 0
                }));

                const existingKeys = new Set(baseItems.map(i => `${i.description}-${i.batch || ''}`));
                uniquePharmacyItems = visitPharmacyItems.filter(i => !existingKeys.has(`${i.description}-${i.batch || ''}`));
                uniqueCasualtyMeds = visitCasualtyMedicines.filter(i => !existingKeys.has(`${i.description}-${i.batch || ''}`));
                uniqueCasualtyServices = visitCasualtyServices.filter(i => !existingKeys.has(`${i.description}-`));
                uniqueLabItems = visitLabItems.filter(i => !existingKeys.has(`${i.description}-`));
            }

            setFormData({
                id: invoice.id,
                patient_name: invoice.patient_name,
                patient: invoice.patient_id || null,
                visit: invoice.visit,
                doctor: invoice.doctor || (visitData ? visitData.doctor : ""),
                doctor_display_name: invoice.doctor_display_name || (visitData ? visitData.doctor_name : "") || "Not Assigned",
                payment_status: invoice.payment_status,
                discount_amount: invoice.discount_amount || 0,
                registration_number: invoice.registration_number || (visitData && visitData.patient ? visitData.patient.registration_number : "") || "N/A",
                items: [
                    ...baseItems.map(i => ({ ...i, stock_deducted: true })),
                    ...uniquePharmacyItems,
                    ...uniqueCasualtyMeds,
                    ...uniqueCasualtyServices,
                    ...uniqueLabItems
                ]
            });

            if (invoice.patient_id || (visitData && visitData.patient)) {
                setSelectedPatientId(invoice.patient_id || (visitData && visitData.patient?.id) || visitData.patient);
            }
            setShowModal(true);
        } catch (err) {
            console.error("Error editing invoice:", err);
            showToast('error', "Failed to load latest invoice details.");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = (invoice) => {
        // Default amount to remaining balance if available, else total
        const due = invoice.balance_due !== undefined ? invoice.balance_due : invoice.total_amount;
        // Initialize with empty strings for easier typing, user can choose how to split
        setPaymentData({
            invoice,
            payments: { CASH: '', UPI: '', CARD: '' },
            remarks: ''
        });
        setShowPaymentModal(true);
    };

    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const paymentLock = useRef(false);

    const handleConfirmPayment = async () => {
        if (isProcessingPayment || paymentLock.current) return;
        if (!paymentData.invoice) return;

        const paymentsList = [];
        Object.entries(paymentData.payments).forEach(([mode, amount]) => {
            const val = parseFloat(amount);
            if (val > 0) {
                paymentsList.push({ mode, amount: val });
            }
        });

        if (paymentsList.length === 0) {
            showToast('error', "Please enter a payment amount.");
            return;
        }

        const due = paymentData.invoice.balance_due !== undefined ? paymentData.invoice.balance_due : paymentData.invoice.total_amount;
        const totalEntered = paymentsList.reduce((sum, p) => sum + p.amount, 0);

        if (totalEntered > parseFloat(due)) {
            showToast('error', `Payment cannot exceed balance due (₹${due}).`);
            return;
        }

        paymentLock.current = true;
        setIsProcessingPayment(true);
        try {
            // New Endpoint for Adding Payment
            await api.post(`billing/invoices/${paymentData.invoice.id}/add_payment/`, {
                payments: paymentsList,
                remarks: paymentData.remarks
            });

            fetchInvoices();
            fetchStats();
            showToast('success', "Payment recorded successfully.");
            setShowPaymentModal(false);
        } catch (error) {
            console.error(error);
            showToast('error', "Failed to record payment.");
        } finally {
            setIsProcessingPayment(false);
            paymentLock.current = false;
        }
    };

    // --- Global Print Handler ---
    const handlePrint = () => {
        window.print();
    };

    // --- Status Badge ---
    const StatusBadge = ({ status }) => {
        const isPaid = status === "PAID";
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border shadow-sm ${isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                {isPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {status}
            </span>
        );
    };
    const totalPages = Math.ceil(totalInvoices / 10) || 1;

    // --- Unified Billing Queue ---
    const unpaidInvoices = invoices.filter(inv => inv.payment_status === 'PENDING' || inv.payment_status === 'PARTIAL');
    const unpaidInvoiceVisitIds = new Set(
        unpaidInvoices
            .map(inv => (typeof inv.visit === 'object' ? inv.visit?.id : inv.visit))
            .filter(Boolean)
    );
    
    // Filter out pending visits that already have an unpaid invoice to avoid duplicates in the top queue
    const filteredPendingVisits = pendingVisits.filter(visit => !unpaidInvoiceVisitIds.has(visit.id));

    const unifiedQueue = [
        ...filteredPendingVisits.map(v => ({ ...v, queue_type: 'visit' })),
        ...unpaidInvoices.map(i => ({ ...i, queue_type: 'invoice' }))
    ];

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-[#F8FAFC] font-sans text-slate-900 relative print:p-0 print:m-0 print:min-h-0 print:bg-white print:overflow-visible print:max-w-none">

            <div className="no-print print:hidden space-y-8">
                {/* --- Header Actions --- */}
                <div className="flex justify-end items-center gap-3 mb-6">
                    <div className="flex gap-3 items-center">
                        {/* Date Filter Controls */}
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm h-[42px]">
                            <Calendar size={16} className="text-slate-400" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer uppercase"
                            />
                            {selectedDate && (
                                <button onClick={() => setSelectedDate("")} className="text-slate-400 hover:text-slate-600 ml-1">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm h-[42px]">
                            <Download size={16} /> Reports
                        </button>
                        <button
                            onClick={() => {
                                setFormData({
                                    patient_name: "", visit: null, doctor: "", payment_status: "PENDING",
                                    items: [{ dept: "PHARMACY", description: "", qty: 1, unit_price: 0, amount: 0 }]
                                });
                                setSelectedPatientId(null);
                                setShowModal(true);
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-blue-600 font-bold text-xs uppercase tracking-wider shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98]"
                        >
                            <Plus size={16} /> New Invoice
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Pending Queue (Always Visible) --- */}
            <div className="mb-10 no-print">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-blue-50/30">
                    <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
                        <AlertCircle size={16} className="text-blue-500" /> Action Required: Pending Bills & Visits
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-black text-slate-500 shadow-sm">
                            TOTAL: {unifiedQueue.length}
                        </span>
                    </div>
                </div>

                {unifiedQueue.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
                        {unifiedQueue.map(item => (
                            <div 
                                key={`${item.queue_type}-${item.id}`} 
                                onClick={() => item.queue_type === 'invoice' ? handleMarkAsPaid(item) : handleBillNow(item)} 
                                className={`bg-white p-5 rounded-2xl border shadow-sm cursor-pointer transition-all group relative overflow-hidden ${item.queue_type === 'invoice' ? 'border-orange-200 hover:border-orange-400 hover:shadow-orange-100' : 'border-slate-200 hover:border-blue-400 hover:shadow-blue-50'}`}
                            >
                                <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-[3rem] -mr-8 -mt-8 z-0 ${item.queue_type === 'invoice' ? 'bg-orange-50' : 'bg-blue-50'}`}></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                                                {item.patient_name?.[0] || "?"}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{item.patient_name || "Guest"}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                    {item.queue_type === 'invoice' ? `INV: ${item.invoice_number || item.id}` : `VISIT: ${item.id}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {item.queue_type === 'invoice' ? (
                                        <div className="space-y-1 mt-3">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500 font-medium">Total Amount</span>
                                                <span className="font-bold text-slate-700">₹{parseFloat(item.total_amount || 0).toFixed(2)}</span>
                                            </div>
                                            {item.payment_status === 'PARTIAL' && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-medium">Balance Due</span>
                                                    <span className="font-bold text-orange-600">₹{parseFloat(item.balance_due || 0).toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-xs mt-2">
                                                <span className="text-slate-500 font-medium text-[10px]">Date Generated</span>
                                                <span className="font-bold text-slate-400 text-[10px]">{new Date(item.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 mt-3">
                                            {(item.consultation_fee && parseFloat(item.consultation_fee) > 0) ? (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-medium">Consultation</span>
                                                    <span className="font-bold text-slate-700">₹{parseFloat(item.consultation_fee).toFixed(2)}</span>
                                                </div>
                                            ) : (item.doctor ? (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-medium">Consultation</span>
                                                    <span className="font-bold text-slate-700 text-[10px]">TBD</span>
                                                </div>
                                            ) : null)}

                                            {(item.pharmacy_items && item.pharmacy_items.length > 0) && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-medium">Pharmacy</span>
                                                    <span className="font-bold text-slate-700">
                                                        ₹{item.pharmacy_items.reduce((sum, i) => sum + (parseFloat(i.amount) || parseFloat(i.total_price) || 0), 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            )}

                                            {(item.lab_charges_data && item.lab_charges_data.length > 0) && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-medium">Lab Tests</span>
                                                    <span className="font-bold text-slate-700">
                                                        ₹{item.lab_charges_data.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            )}

                                            {(item.casualty_services && item.casualty_services.length > 0) && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-medium">Services</span>
                                                    <span className="font-bold text-slate-700">
                                                        ₹{item.casualty_services.reduce((sum, i) => sum + parseFloat(i.total_charge || 0), 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                        {item.queue_type === 'invoice' ? (
                                            <span className={`text-[10px] font-black px-2 py-1 rounded ${item.payment_status === 'PARTIAL' ? 'text-orange-600 bg-orange-50' : 'text-rose-600 bg-rose-50'}`}>
                                                {item.payment_status}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">WAITING</span>
                                        )}
                                        <div className={`flex items-center gap-1 text-xs font-bold ${item.queue_type === 'invoice' ? 'text-orange-400 group-hover:text-orange-600' : 'text-slate-400 group-hover:text-blue-500'}`}>
                                            <span>{item.queue_type === 'invoice' ? 'Collect Payment' : 'Bill Now'}</span>
                                            <ChevronRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                        <div className="p-4 bg-slate-50 rounded-full mb-3 text-slate-300">
                            <Sparkles size={24} />
                        </div>
                        <h4 className="font-bold text-slate-900">No Pending Bills</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Patients will appear here when they are marked for billing.</p>
                    </div>
                )}
            </div>

            {/* --- Invoice List --- */}
            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden no-print">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
                        <FileText size={16} className="text-slate-400" /> Recent Invoices
                    </h3>
                    <div className="flex items-center gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="py-2 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PAID">Paid</option>
                            <option value="PENDING">Pending</option>
                            <option value="PARTIAL">Partial</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="DRAFT">Draft</option>
                        </select>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search invoices..."
                                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-64 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Invoice ID</th>
                                <th className="px-6 py-4">Patient</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.filter(inv => { const matchesSearch = (inv.patient_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (inv.invoice_number || inv.id || "").toString().toLowerCase().includes(searchTerm.toLowerCase()); const matchesStatus = statusFilter === "ALL" || inv.payment_status === statusFilter; return matchesSearch && matchesStatus; }).map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{invoice.invoice_number || `#${invoice.id}`}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{invoice.patient_name || "Guest"}</td>
                                    <td className="px-6 py-4 font-bold text-slate-700">₹{invoice.total_amount}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${
                                                invoice.payment_status === 'PAID' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                                                invoice.payment_status === 'PARTIAL' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                invoice.payment_status === 'CANCELLED' ? "bg-slate-50 text-slate-500 border-slate-200" :
                                                "bg-amber-50 text-amber-700 border-amber-100"
                                            }`}>
                                                {invoice.payment_status}
                                            </span>
                                            {invoice.payment_status === 'PARTIAL' && (
                                                <span className="text-[9px] font-bold text-slate-500 uppercase">
                                                    Paid: ₹{invoice.amount_paid} / Due: ₹{invoice.balance_due}
                                                </span>
                                            )}
                                            {/* Show breakdown if multiple or single */}
                                            {invoice.payments && invoice.payments.length > 0 ? (
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    {invoice.payments.map((p, pIdx) => (
                                                        <span key={pIdx} className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                            {p.mode === 'CASH' && <Wallet size={10} />}
                                                            {p.mode === 'UPI' && <Sparkles size={10} />}
                                                            {p.mode === 'CARD' && <CreditCard size={10} />}
                                                            {p.mode === 'UPI' ? 'GooglePay' : p.mode}: ₹{p.amount}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                invoice.payment_mode && (
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                        {invoice.payment_mode === 'CASH' && <Wallet size={10} />}
                                                        {invoice.payment_mode === 'UPI' && <Sparkles size={10} />}
                                                        {invoice.payment_mode === 'CARD' && <CreditCard size={10} />}
                                                        {invoice.payment_mode === 'UPI' ? 'GoogPe' : invoice.payment_mode}
                                                    </span>
                                                )
                                            )}
                                            {parseFloat(invoice.refund_amount) > 0 && (
                                                <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wide border bg-rose-50 text-rose-600 border-rose-100 flex items-center gap-1">
                                                    <RotateCcw size={10} /> Refunded: ₹{invoice.refund_amount}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{(() => { const d = new Date(invoice.created_at); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })()}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        {/* IMPORTANT: Buttons are always visible now, no group-hover opacity */}
                                        {invoice.payment_status !== 'PAID' && (
                                            <button onClick={() => handleMarkAsPaid(invoice)} className="text-emerald-500 hover:text-emerald-700 p-2 rounded-lg hover:bg-emerald-50 border border-emerald-100">
                                                <CreditCard size={16} />
                                            </button>
                                        )}
                                        <button className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50" onClick={() => handleEditInvoice(invoice)}>
                                            <Printer size={16} />
                                        </button>
                                        <button onClick={() => handleEditInvoice(invoice)} className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50">
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-3 border-t border-slate-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-2"></div>
                    <Pagination 
                        current={page} 
                        total={Math.ceil(totalInvoices / 10) || 1} 
                        onPageChange={setPage} 
                        loading={loading} 
                        compact 
                    />
                </div>

                {/* --- Footer Summary --- */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-6">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Monthly Summary</span>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100/50 rounded-lg text-emerald-700 border border-emerald-200">
                                <Wallet size={14} />
                                <span className="text-xs font-bold">Cash: ₹{(stats?.monthly_breakdown?.CASH || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100/50 rounded-lg text-blue-700 border border-blue-200">
                                <Sparkles size={14} />
                                <span className="text-xs font-bold">UPI: ₹{(stats?.monthly_breakdown?.UPI || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100/50 rounded-lg text-purple-700 border border-purple-200">
                                <CreditCard size={14} />
                                <span className="text-xs font-bold">Card: ₹{(stats?.monthly_breakdown?.CARD || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Monthly Credited</p>
                        <p className="text-lg font-black text-slate-900">₹{(stats?.monthly_total || 0).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* --- Premium Modal (Invoice Preview & Edit) --- */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print-modal">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-7xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[95vh] no-print print:hidden">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tight">{formData.id ? 'Edit Invoice' : 'New Invoice'}</h2>
                                    <p className="text-xs text-slate-500 font-bold mt-1">Ref: {formData.id ? `#${formData.id}` : 'Draft'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handlePrint} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                                        <Printer size={20} />
                                    </button>
                                    <button onClick={() => setShowModal(false)} className="p-2 bg-white rounded-full hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Form Area */}
                            <div className="flex-1 overflow-y-auto p-8 bg-white">
                                {/* Doctor/Patient Form Inputs - Keep existing interactive layout here */}
                                <div className="grid grid-cols-2 gap-12 mb-12">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Billed To</label>
                                        {!formData.id && (
                                            <div className="relative mb-2">
                                                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                                    <Search size={14} className="text-slate-400" />
                                                    <input
                                                        className="bg-transparent outline-none text-xs font-bold w-full"
                                                        placeholder="Search patient..."
                                                        autoComplete="off"
                                                        onChange={(e) => {
                                                            const term = e.target.value.toLowerCase();
                                                            const found = patients.find(p => p.full_name?.toLowerCase().includes(term));
                                                            if (found) {
                                                                setFormData(prev => ({ ...prev, patient_name: found.full_name }));
                                                                setSelectedPatientId(found.id);
                                                            } else {
                                                                setFormData(prev => ({ ...prev, patient_name: e.target.value }));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="text-lg font-bold text-slate-900">{formData.patient_name || "Unknown Patient"}</div>
                                        <div className="text-xs text-slate-500 mt-1">Reg No: {formData.registration_number || 'N/A'}</div>
                                    </div>
                                    <div className="text-right">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Doctor</label>
                                        <div className="text-lg font-bold text-slate-900">{formData.doctor_display_name || "Not Assigned"}</div>
                                    </div>
                                </div>

                                {/* Interactive Items Table */}
                                <div className="mb-12 overflow-visible min-h-[400px]">
                                    <table className="w-full text-left text-sm min-w-[1000px]">
                                        <thead className="border-b-2 border-slate-900">
                                            <tr>
                                                <th className="py-3 text-[10px] font-black text-slate-900 uppercase tracking-widest w-12">#</th>
                                                <th className="py-3 text-[10px] font-black text-slate-900 uppercase tracking-widest min-w-[250px]">Description</th>
                                                <th className="py-3 text-[10px] font-black text-slate-900 uppercase tracking-widest w-16 text-center">Qty</th>
                                                <th className="py-3 text-[10px] font-black text-slate-900 uppercase tracking-widest w-16 text-center">GST%</th>
                                                <th className="py-3 text-[10px] font-black text-slate-900 uppercase tracking-widest w-24 text-right">Price</th>
                                                <th className="py-3 text-[10px] font-black text-slate-900 uppercase tracking-widest w-28 text-right">Amount</th>
                                                <th className="py-3 w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {formData.items.map((item, idx) => (
                                                <tr key={idx} className="group">
                                                    <td className="py-4 text-slate-400 font-mono">{idx + 1}</td>
                                                    <td className="py-4 relative" style={{ zIndex: stockSearch.index === idx ? 100 : 1 }}>
                                                        <input
                                                            readOnly={!!formData.id && formData.payment_status !== 'DRAFT'}
                                                            className={`w-full bg-transparent outline-none font-bold text-slate-700 placeholder:text-slate-300 ${!!formData.id && formData.payment_status !== 'DRAFT' ? 'cursor-not-allowed opacity-80' : ''}`}
                                                            placeholder="Item Name / Service"
                                                            autoComplete="off"
                                                            value={item.description}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const newItems = [...formData.items];
                                                                newItems[idx].description = val;
                                                                setFormData({ ...formData, items: newItems });
                                                                handleStockSearch(val, idx);
                                                            }}
                                                            onFocus={() => {
                                                                if (item.description.length >= 2 && (!formData.id || formData.payment_status === 'DRAFT')) {
                                                                    handleStockSearch(item.description, idx);
                                                                }
                                                            }}
                                                        />
                                                        {stockSearch.index === idx && stockSearch.results.length > 0 && (
                                                            <div className="absolute top-full left-0 z-[100] w-[400px] bg-white border border-slate-200 rounded-xl shadow-2xl py-2 mt-2 max-h-[300px] overflow-y-auto">
                                                                {stockSearch.results.map(item => {
                                                                    const isService = item.type === 'SERVICE';
                                                                    const outOfStock = !isService && item.qty_available <= 0;
                                                                    const itemPrice = isService ? item.base_charge : (item.selling_price / (item.tablets_per_strip || 1));
                                                                    
                                                                    return (
                                                                        <button
                                                                            key={`${item.type}-${item.id}`}
                                                                            disabled={outOfStock}
                                                                            onClick={() => handleSelectStock(item, idx)}
                                                                            className={`w-full text-left px-4 py-2 flex items-center justify-between group transition-colors ${outOfStock ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-blue-50'}`}
                                                                        >
                                                                            <div>
                                                                                <p className={`text-sm font-bold flex items-center gap-2 ${outOfStock ? 'text-slate-400' : 'text-slate-800'}`}>
                                                                                    {item.name}
                                                                                    {isService && <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 uppercase tracking-widest">Service</span>}
                                                                                </p>
                                                                                {!isService && (
                                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Batch: {item.batch_no}</span>
                                                                                        <span className={`text-[10px] font-bold ${outOfStock ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                                            {outOfStock ? 'Out of Stock' : `${item.qty_available} in stock`}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <p className={`text-xs font-black ${outOfStock ? 'text-slate-400' : 'text-slate-900 group-hover:text-blue-600'} transition-colors`}>₹{parseFloat(itemPrice).toFixed(2)}</p>
                                                                                <p className="text-[8px] font-bold text-slate-400">per unit</p>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        {stockSearch.index === idx && (
                                                            <div className="fixed inset-0 z-[50] pointer-events-auto" onClick={() => setStockSearch({ index: -1, term: "", results: [] })} />
                                                        )}
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        <input
                                                            readOnly={!!formData.id && formData.payment_status !== 'DRAFT'}
                                                            type="number" className={`w-full bg-transparent text-center font-bold outline-none ${!!formData.id && formData.payment_status !== 'DRAFT' ? 'cursor-not-allowed opacity-80' : ''}`}
                                                            value={item.qty}
                                                            onChange={(e) => {
                                                                const qty = parseInt(e.target.value) || 0;
                                                                const newItems = [...formData.items];
                                                                newItems[idx] = { ...item, qty, amount: (qty * item.unit_price).toFixed(2) };
                                                                setFormData({ ...formData, items: newItems });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        <input
                                                            readOnly={!!formData.id && formData.payment_status !== 'DRAFT'}
                                                            type="number" className={`w-full bg-transparent text-center font-medium outline-none text-slate-500 ${!!formData.id && formData.payment_status !== 'DRAFT' ? 'cursor-not-allowed opacity-80' : ''}`}
                                                            value={item.gst_percent}
                                                            placeholder="0"
                                                            onChange={(e) => {
                                                                const gst = parseFloat(e.target.value) || 0;
                                                                const newItems = [...formData.items];
                                                                newItems[idx] = { ...item, gst_percent: gst };
                                                                setFormData({ ...formData, items: newItems });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <input
                                                            readOnly={!!formData.id && formData.payment_status !== 'DRAFT'}
                                                            type="number" className={`w-full bg-transparent text-right font-medium outline-none ${!!formData.id && formData.payment_status !== 'DRAFT' ? 'cursor-not-allowed opacity-80' : ''}`}
                                                            value={item.unit_price}
                                                            onChange={(e) => {
                                                                const price = parseFloat(e.target.value) || 0;
                                                                const newItems = [...formData.items];
                                                                newItems[idx] = { ...item, unit_price: price, amount: (item.qty * price).toFixed(2) };
                                                                setFormData({ ...formData, items: newItems });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <input
                                                            readOnly={!!formData.id && formData.payment_status !== 'DRAFT'}
                                                            type="number"
                                                            className={`w-full bg-transparent text-right font-bold text-slate-900 outline-none placeholder:text-slate-300 ${!!formData.id && formData.payment_status !== 'DRAFT' ? 'cursor-not-allowed opacity-80' : ''}`}
                                                            value={item.amount}
                                                            onChange={(e) => {
                                                                const newAmount = parseFloat(e.target.value) || 0;
                                                                const newItems = [...formData.items];
                                                                const newUnitPrice = item.qty > 0 ? (newAmount / item.qty).toFixed(2) : 0;
                                                                newItems[idx] = { ...item, amount: newAmount, unit_price: newUnitPrice };
                                                                setFormData({ ...formData, items: newItems });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        {(!formData.id || formData.payment_status === 'DRAFT') && (
                                                            <button onClick={() => {
                                                                const newItems = formData.items.filter((_, i) => i !== idx);
                                                                setFormData({ ...formData, items: newItems });
                                                            }} className="text-slate-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {(!formData.id || formData.payment_status === 'DRAFT') && (
                                        <div className="mt-3 flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    setFormData({
                                                        ...formData,
                                                        items: [...formData.items, { dept: 'CASUALTY', description: '', qty: 1, unit_price: 0, amount: 0 }]
                                                    });
                                                }}
                                                className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                            >
                                                + Add Service
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setFormData({
                                                        ...formData,
                                                        items: [...formData.items, { dept: 'LAB', description: '', qty: 1, unit_price: 0, amount: 0 }]
                                                    });
                                                }}
                                                className="px-3 py-1.5 text-xs font-bold bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                                            >
                                                + Add Lab Test
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <div className="w-80 space-y-3">
                                        <div className="flex justify-between text-sm font-medium text-slate-500">
                                            <span>Subtotal</span>
                                            <span>₹{calculateSubtotal(formData.items).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm font-medium text-rose-500">
                                            <span>Discount (₹)</span>
                                            <input 
                                                type="number" 
                                                className="w-24 text-right bg-rose-50 border border-rose-200 rounded p-1 outline-none text-rose-700 font-bold focus:border-rose-400"
                                                value={formData.discount_amount}
                                                onChange={e => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-end">
                                            <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Net Total</span>
                                            <span className="text-2xl font-black text-slate-900 leading-none">₹{Math.ceil(Math.max(0, calculateSubtotal(formData.items) - (parseFloat(formData.discount_amount) || 0))).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50/80 flex justify-between items-center">
                                <div>
                                    {(!formData.id || formData.payment_status === 'DRAFT') && (
                                        <button onClick={() => handleImportPrescription()} disabled={!selectedPatientId} className={`text-xs font-bold flex items-center gap-2 ${selectedPatientId ? 'text-blue-600 hover:text-blue-800' : 'text-slate-300 cursor-not-allowed'}`}>
                                            <Import size={16} /> Import from Prescription
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all">Cancel</button>
                                    {(!formData.id || formData.payment_status === 'DRAFT') && (
                                        <button onClick={() => handleCreateInvoice('DRAFT')} disabled={isSubmitting} className="px-6 py-3 rounded-xl font-bold text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all">
                                            Save as Draft
                                        </button>
                                    )}
                                    {(!formData.id || formData.payment_status === 'DRAFT' || formData.payment_status === 'PENDING' || formData.payment_status === 'PARTIAL') && (
                                        <button onClick={() => handleCreateInvoice('PENDING')} disabled={isSubmitting} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-xl shadow-slate-900/20 hover:bg-blue-600 transition-all flex items-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed">
                                            <CheckCircle2 size={18} /> {isSubmitting ? 'Saving...' : (formData.id && (formData.payment_status === 'PENDING' || formData.payment_status === 'PARTIAL') ? 'Collect Payment' : 'Generate Invoice & Pay')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                    </div>
                )
                }
            </AnimatePresence >

            {/* --- DEDICATED PRINT VIEW (Moved outside modal, visible only on print) --- */}
            <style>
                {`
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    #invoice-print-area {
                        width: 100%;
                        height: auto;
                        padding: 0 !important;
                    }
                    /* Page break fixes for multi-page tables */
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                }
                `}
            </style>
            <div id="invoice-print-area" className="hidden print:block absolute top-0 left-0 w-full h-auto bg-white z-[9999] p-8">
                <div className="flex flex-col gap-6">
                    <div>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-4">
                            <div className="flex items-center gap-4">
                                <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 tracking-widest uppercase">ANOVA MEDICAL CENTER</h1>
                                    <div className="mt-1 text-xs text-slate-600 font-bold">
                                        <p>144, Calicut Road, Kellur, 5th mile, Wayanad</p>
                                        <p>Ph: 8304889381 | anovamedicalcentre29@gmail.com</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-slate-300">INVOICE</div>
                                <p className="text-sm font-bold text-slate-900 mt-2">#{formData.id ? String(formData.id).toUpperCase() : 'DRAFT'}</p>
                                <p className="text-xs text-slate-500">{(() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`; })()}</p>
                            </div>
                        </div>

                        {/* Patient Information */}
                        <div className="flex justify-between mb-8">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Billed To</label>
                                <div className="text-base font-bold text-slate-900">{formData.patient_name || "Unknown Patient"}</div>
                                <div className="text-xs text-slate-500">Reg No: {formData.registration_number || 'N/A'}</div>
                            </div>
                            <div className="text-right">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Doctor</label>
                                <div className="text-base font-bold text-slate-900">{formData.doctor_display_name || "Not Assigned"}</div>
                            </div>
                        </div>

                        {/* Items Table - Strict Layout with Borders */}
                        <table className="w-full text-left border-collapse border border-slate-900">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="py-2 px-2 border-b border-r border-slate-900 text-[9px] font-black text-slate-900 uppercase tracking-widest w-[5%] text-center">#</th>
                                    <th className="py-2 px-2 border-b border-r border-slate-900 text-[9px] font-black text-slate-900 uppercase tracking-widest w-[63%]">Description</th>
                                    <th className="py-2 px-2 border-b border-r border-slate-900 text-[9px] font-black text-slate-900 uppercase tracking-widest w-[7%] text-center">Qty</th>
                                    <th className="py-2 px-2 border-b border-r border-slate-900 text-[9px] font-black text-slate-900 uppercase tracking-widest w-[7%] text-center">GST%</th>
                                    <th className="py-2 px-2 border-b border-r border-slate-900 text-[9px] font-black text-slate-900 uppercase tracking-widest w-[9%] text-right">Price</th>
                                    <th className="py-2 px-2 border-b border-slate-900 text-[9px] font-black text-slate-900 uppercase tracking-widest w-[9%] text-right">Amount</th>
                                </tr>
                            </thead>
                                {(() => {
                                    let globalIdx = 1;
                                    const groupedItems = formData.items.reduce((acc, item) => {
                                        const dept = item.dept || 'OTHER';
                                        if (!acc[dept]) acc[dept] = [];
                                        acc[dept].push(item);
                                        return acc;
                                    }, {});
                                    
                                    return Object.entries(groupedItems).map(([dept, items]) => (
                                        <tbody key={dept}>
                                            <tr className="bg-slate-200/50 border-b border-slate-400">
                                                <td colSpan={6} className="py-1 px-2 text-[9px] font-black text-slate-700 tracking-widest uppercase">
                                                    {dept === 'CASUALTY' ? 'SERVICES' : dept === 'LAB' ? 'LABORATORY' : dept === 'PHARMACY' ? 'PHARMACY' : dept}
                                                </td>
                                            </tr>
                                            {items.map((item) => (
                                                <tr key={globalIdx} className="border-b border-slate-300 bg-white">
                                                    <td className="py-2 px-2 border-r border-slate-300 text-[10px] font-medium text-slate-600 text-center">{globalIdx++}</td>
                                                    <td className="py-2 px-2 border-r border-slate-300 text-[10px] font-bold text-slate-800 leading-tight">{item.description}</td>
                                                    <td className="py-2 px-2 border-r border-slate-300 text-[10px] font-bold text-slate-800 text-center">{item.qty}</td>
                                                    <td className="py-2 px-2 border-r border-slate-300 text-[10px] text-slate-600 text-center">{item.gst_percent}</td>
                                                    <td className="py-2 px-2 border-r border-slate-300 text-[10px] text-slate-800 text-right">{parseFloat(item.unit_price).toFixed(2)}</td>
                                                    <td className="py-2 px-2 text-[10px] font-bold text-slate-900 text-right">{parseFloat(item.amount).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    ));
                                })()}
                                
                                <tbody>
                                    <tr className="bg-slate-50 border-t-2 border-slate-900">
                                        <td colSpan={5} className="py-2 px-2 text-right text-[10px] font-bold text-slate-500 border-r border-slate-900 uppercase tracking-wide">Subtotal</td>
                                        <td className="py-2 px-2 text-right text-sm font-bold text-slate-600">₹{calculateSubtotal(formData.items).toFixed(2)}</td>
                                    </tr>
                                    {(parseFloat(formData.discount_amount) > 0) && (
                                        <tr className="bg-rose-50 border-t border-slate-300">
                                            <td colSpan={5} className="py-2 px-2 text-right text-[10px] font-bold text-rose-600 border-r border-slate-900 uppercase tracking-wide">Discount</td>
                                            <td className="py-2 px-2 text-right text-sm font-bold text-rose-600">-₹{parseFloat(formData.discount_amount).toFixed(2)}</td>
                                        </tr>
                                    )}
                                    <tr className="bg-slate-100 border-t-2 border-slate-900">
                                        <td colSpan={5} className="py-3 px-2 text-right text-[10px] font-black text-slate-900 border-r border-slate-900 uppercase tracking-wide">Net Amount</td>
                                        <td className="py-3 px-2 text-right text-sm font-black text-slate-900">₹{Math.ceil(Math.max(0, calculateSubtotal(formData.items) - (parseFloat(formData.discount_amount) || 0))).toFixed(2)}</td>
                                    </tr>
                                </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div>
                        <div className="flex flex-col items-center mt-8 pt-2">
                            <div className="text-[9px] text-slate-500 max-w-lg text-center leading-relaxed mb-8">
                                <p className="font-bold text-slate-800 uppercase tracking-wide mb-1">Terms & Conditions:</p>
                                <p>Certified that the medicines sold as per this bill have been purchased local
                                    from Registered Dealers who have certified in the related sales bills that such
                                    medicines had duly suffered compound tax.
                                    Wish You a Speedy Recovery.</p>
                            </div>

                            <div className="w-full flex justify-end px-12">
                                <div className="text-center">
                                    <div className="h-12 w-40 border-b border-slate-400 mb-2 mx-auto"></div>
                                    <p className="text-xs font-bold text-slate-900">For ANOVA MEDICAL CENTER</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Authorized Signatory</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 border-t border-dashed border-slate-300 pt-2 flex justify-between items-center px-8">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Generated by Anova CMS</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Thank You - Get Well Soon</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Payment Modal --- */}
            < AnimatePresence >
                {showPaymentModal && paymentData.invoice && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 no-print">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setShowPaymentModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-800">Confirm Payment</h3>
                                <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">Net Amount</p>
                                    <p className="text-4xl font-black text-slate-900 mt-1">₹{Math.max(0, parseFloat(paymentData.invoice.total_amount) - (parseFloat(paymentData.invoice.discount_amount) || 0)).toFixed(2)}</p>
                                    {(paymentData.invoice.amount_paid > 0) && (
                                        <p className="text-xs font-bold text-emerald-600 mt-1">Paid: ₹{paymentData.invoice.amount_paid} • Due: ₹{paymentData.invoice.balance_due}</p>
                                    )}
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Amount</label>
                                        <span className="text-xs font-bold text-slate-400">
                                            Entered: <span className="text-emerald-600">₹{Object.values(paymentData.payments).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0).toFixed(2)}</span>
                                            {' • '}
                                            Remaining: <span className="text-red-500">₹{Math.max(0, (parseFloat(paymentData.invoice.balance_due !== undefined ? paymentData.invoice.balance_due : paymentData.invoice.total_amount) - Object.values(paymentData.payments).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0))).toFixed(2)}</span>
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {['CASH', 'UPI', 'CARD'].map(mode => (
                                            <div key={mode} className="flex items-center gap-3">
                                                <div className="w-32 flex items-center gap-2 text-slate-600 font-bold text-sm">
                                                    {mode === 'CASH' && <Wallet size={16} />}
                                                    {mode === 'UPI' && <Sparkles size={16} />}
                                                    {mode === 'CARD' && <CreditCard size={16} />}
                                                    {mode}
                                                </div>
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-7 pr-3 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all placeholder:text-slate-300"
                                                        value={paymentData.payments[mode]}
                                                        onChange={(e) => setPaymentData({
                                                            ...paymentData,
                                                            payments: { ...paymentData.payments, [mode]: e.target.value }
                                                        })}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Remarks (Optional)</label>
                                    <textarea
                                        rows="2"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-medium text-sm text-slate-700 outline-none focus:border-blue-500 transition-all resize-none"
                                        placeholder="Add transaction ID or notes..."
                                        value={paymentData.remarks}
                                        onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                                    />
                                </div>

                                <button
                                    onClick={handleConfirmPayment}
                                    disabled={isProcessingPayment}
                                    className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 flex justify-center items-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
                                >
                                    <CheckCircle2 size={18} /> {isProcessingPayment ? "Processing..." : "Confirm Payment"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >

        </div >
    );
};

export default Billing;