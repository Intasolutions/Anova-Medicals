import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import { Card, Button } from '../../../components/ui/Base';
import { Alert } from '../../../components/ui/Alerts';
import { Package, Layers, TrendingUp, Box, DatabaseZap, Loader2, ArrowUpRight, Activity, Filter, CheckCircle2, ShieldCheck, Trophy, Clock, ClipboardList, Sparkles } from 'lucide-react';

const InventoryDashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [masterStocks, setMasterStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFinishedOnly, setShowFinishedOnly] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: 'success', message: '', title: '' });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [invRes, masterRes] = await Promise.all([
        apiClient.get('/inventory-balances/'),
        apiClient.get('/master-stocks/')
      ]);
      setInventory(invRes.data.results || invRes.data);
      setMasterStocks(masterRes.data.results || masterRes.data);
    } catch (err) {
      console.error("Error fetching inventory data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Process data for grid view
  const processInventoryData = () => {
    const products = {};
    
    if (masterStocks && Array.isArray(masterStocks)) {
      masterStocks.forEach(item => {
        if (!products[item.product]) {
          products[item.product] = {
            name: item.product_name,
            operations: {},
            sizes: new Set(),
            masterStock: {}, // size_name -> total_quantity
            finishedStock: {}, // size_name -> { qty, sizeId }
            pendingStock: {} // size_name -> qty
          };
        }
        const prod = products[item.product];
        prod.sizes.add(item.size_name);
        prod.masterStock[item.size_name] = item.total_quantity;
        prod.finishedStock[item.size_name] = { qty: 0, sizeId: item.size };
        prod.pendingStock[item.size_name] = item.total_quantity;
      });
    }

    if (inventory && Array.isArray(inventory)) {
      inventory.forEach(item => {
        if (!products[item.product]) {
          products[item.product] = {
            name: item.product_name,
            operations: {},
            sizes: new Set(),
            masterStock: {},
            finishedStock: {},
            pendingStock: {}
          };
        }
        
        const prod = products[item.product];
        prod.sizes.add(item.size_name);

        if (item.operation === null) {
          prod.finishedStock[item.size_name] = {
            qty: item.balance_qty,
            sizeId: item.size
          };
          const needed = prod.masterStock[item.size_name] || 0;
          prod.pendingStock[item.size_name] = Math.max(0, needed - item.balance_qty);
        } else {
          const opKey = `${item.operation_code}: ${item.operation_name}`;
          if (!prod.operations[opKey]) {
            prod.operations[opKey] = {
              name: item.operation_name,
              code: item.operation_code,
              stock: {}
            };
          }
          prod.operations[opKey].stock[item.size_name] = item.balance_qty;
        }
      });
    }

    return Object.entries(products).map(([id, data]) => {
      const sortedOps = Object.keys(data.operations).sort();
      const sizesArray = Array.from(data.sizes).sort();
      
      let totalNeeded = 0;
      let totalFinished = 0;

      sizesArray.forEach(sz => {
        totalNeeded += (data.masterStock[sz] || 0);
        totalFinished += (data.finishedStock[sz]?.qty || 0);
      });

      const isFullyCompleted = totalNeeded > 0 && totalFinished >= totalNeeded;
      const completionPercentage = totalNeeded > 0 ? Math.min(100, Math.round((totalFinished / totalNeeded) * 100)) : 0;

      return {
        id,
        name: data.name,
        operations: data.operations,
        sortedOpKeys: sortedOps,
        masterStock: data.masterStock,
        finishedStock: data.finishedStock,
        pendingStock: data.pendingStock,
        sizes: sizesArray,
        totalNeeded,
        totalFinished,
        completionPercentage,
        isFullyCompleted
      };
    });
  };

  const processedProducts = processInventoryData();

  useEffect(() => {
    if (processedProducts.length > 0 && !loading) {
      const completedProds = processedProducts.filter(p => p.isFullyCompleted);
      if (completedProds.length > 0) {
        const names = completedProds.map(p => p.name).join(', ');
        setAlertInfo({ 
          isOpen: true, 
          type: 'success', 
          title: '🏆 Production Target Achieved', 
          message: `100% Fulfillment complete for: ${names}. All required quantities have been successfully manufactured.` 
        });
      }
    }
  }, [inventory, masterStocks, loading]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 text-[#DC2626] animate-spin" strokeWidth={2.5} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Master Data & Ledger...</p>
        </div>
      );
    }

    if (processedProducts.length === 0) {
      return (
        <div className="w-full bg-slate-50 border border-slate-200/60 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#0F172A 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          <div className="relative z-10 w-24 h-24 bg-white border border-slate-200 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50">
            <Box className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
          </div>
          <h4 className="relative z-10 text-2xl font-black text-slate-900 mb-3 tracking-tight">Ledger Empty</h4>
          <p className="relative z-10 text-slate-500 font-medium text-sm max-w-md mb-8 leading-relaxed">
            No products with master stock allocations detected. Register products in the Product Catalog to initialize the inventory ledger.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-12">
        {processedProducts.map(product => (
          <div key={product.id} className={`bg-white rounded-[2.5rem] border ${product.isFullyCompleted ? 'border-emerald-500/40 shadow-[0_12px_40px_rgba(16,185,129,0.15)]' : 'border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)]'} overflow-hidden relative group transition-all duration-300`}>
            <div className={`absolute top-0 left-0 w-full h-1.5 ${product.isFullyCompleted ? 'bg-emerald-500' : 'bg-[#0F172A]'}`} />
            
            {/* 100% COMPLETION BANNER */}
            {product.isFullyCompleted && (
              <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-emerald-500/20 px-8 py-3.5 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                    <Trophy size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                      100% Production Target Achieved <Sparkles size={14} className="text-emerald-600 animate-spin" />
                    </h4>
                    <p className="text-[11px] font-medium text-emerald-600">All required quantities for this product have been fully manufactured.</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-xl uppercase tracking-widest border border-emerald-200 shadow-sm">Fully Complete</span>
              </div>
            )}

            <div className="p-8 pb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${product.isFullyCompleted ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-[#0F172A] text-white shadow-slate-900/20'}`}>
                    <Package size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-[#DC2626] uppercase tracking-[0.2em] bg-red-50 px-2 py-0.5 rounded">SKU TRACKING ACTIVE</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ID: {product.id.split('-')[0]}</span>
                    </div>
                  </div>
                </div>

                {/* PROGRESS BAR */}
                <div className="w-full md:w-72 bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80 shadow-inner">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fulfillment Progress</span>
                    <span className={`text-xs font-black ${product.isFullyCompleted ? 'text-emerald-600' : 'text-slate-700'}`}>{product.completionPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 rounded-full ${product.isFullyCompleted ? 'bg-emerald-500 shadow-[0_0_12px_#10B981]' : 'bg-[#0F172A]'}`}
                      style={{ width: `${product.completionPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Finished: {product.totalFinished.toLocaleString()}</span>
                    <span>Needed: {product.totalNeeded.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto px-8 pb-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] min-w-[200px]">Production Stage</th>
                    {product.sizes.map(size => (
                      <th key={size} className="py-4 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{size}</th>
                    ))}
                    <th className="py-4 px-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aggregate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {/* ROW 1: REQUIRED PRODUCTION */}
                  <tr className="bg-blue-50/40 border-b-2 border-blue-100/50 hover:bg-blue-50/60 transition-colors">
                    <td className="py-5 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-200" />
                        <div>
                          <div className="text-sm font-black text-blue-900 uppercase tracking-tight">Required Production</div>
                          <div className="text-[9px] font-bold text-blue-600/80 uppercase tracking-widest flex items-center gap-1">
                            <ClipboardList size={10} /> Master Stock Target Allocation
                          </div>
                        </div>
                      </div>
                    </td>
                    {product.sizes.map(size => {
                      const qty = product.masterStock[size] || 0;
                      return (
                        <td key={size} className="py-5 px-4 text-center">
                          <span className={`text-xl font-black tracking-tighter ${qty > 0 ? 'text-blue-700' : 'text-slate-300'}`}>
                            {qty.toLocaleString()}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-5 px-4 text-right">
                      <div className={`text-2xl font-black tracking-tighter ${product.totalNeeded > 0 ? 'text-blue-800' : 'text-slate-300'}`}>
                        {product.totalNeeded.toLocaleString()}
                      </div>
                    </td>
                  </tr>

                  {/* ROW 2: FINISHED GOODS */}
                  <tr className="bg-emerald-50/40 border-b-2 border-emerald-100/50 hover:bg-emerald-50/60 transition-colors">
                    <td className="py-5 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse" />
                        <div>
                          <div className="text-sm font-black text-emerald-900 uppercase tracking-tight">Finished Goods</div>
                          <div className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-widest flex items-center gap-1">
                            <ShieldCheck size={10} /> Fully Processed & Ready
                          </div>
                        </div>
                      </div>
                    </td>
                    {product.sizes.map(size => {
                      const qty = product.finishedStock[size]?.qty || 0;
                      return (
                        <td key={size} className="py-5 px-4 text-center">
                          <span className={`text-xl font-black tracking-tighter ${qty > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>
                            {qty.toLocaleString()}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-5 px-4 text-right">
                      <div className={`text-2xl font-black tracking-tighter ${product.totalFinished > 0 ? 'text-emerald-800' : 'text-slate-300'}`}>
                        {product.totalFinished.toLocaleString()}
                      </div>
                    </td>
                  </tr>

                  {/* ROW 3: PINDING PRODUCTION */}
                  <tr className="bg-amber-50/40 border-b-2 border-amber-100/50 hover:bg-amber-50/60 transition-colors">
                    <td className="py-5 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-200" />
                        <div>
                          <div className="text-sm font-black text-amber-900 uppercase tracking-tight">Pending Production</div>
                          <div className="text-[9px] font-bold text-amber-600/80 uppercase tracking-widest flex items-center gap-1">
                            <Clock size={10} /> Remaining Needed Quantity
                          </div>
                        </div>
                      </div>
                    </td>
                    {product.sizes.map(size => {
                      const qty = product.pendingStock[size] || 0;
                      return (
                        <td key={size} className="py-5 px-4 text-center">
                          <span className={`text-xl font-black tracking-tighter ${qty > 0 ? 'text-amber-700' : 'text-slate-300'}`}>
                            {qty.toLocaleString()}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-5 px-4 text-right">
                      <div className={`text-2xl font-black tracking-tighter ${Object.values(product.pendingStock).reduce((a,b) => a+b, 0) > 0 ? 'text-amber-800' : 'text-slate-300'}`}>
                        {Object.values(product.pendingStock).reduce((a,b) => a+b, 0).toLocaleString()}
                      </div>
                    </td>
                  </tr>

                  {!showFinishedOnly && (
                    <>
                      <tr className="bg-slate-50/80">
                        <td colSpan={product.sizes.length + 2} className="py-2 px-4">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Work-In-Progress (WIP) Stages</span>
                        </td>
                      </tr>
                      {product.sortedOpKeys.map(opKey => {
                        const op = product.operations[opKey];
                        let rowTotal = 0;
                        return (
                          <tr key={opKey} className="group/row hover:bg-slate-50/50 transition-colors">
                            <td className="py-5 px-2">
                              <div className="flex items-center gap-3 pl-2">
                                <div className="w-2 h-2 rounded-full bg-slate-300 group-hover/row:bg-slate-400 transition-colors" />
                                <div>
                                  <div className="text-xs font-bold uppercase tracking-tight text-slate-600">{op.name}</div>
                                  <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{op.code}</div>
                                </div>
                              </div>
                            </td>
                            {product.sizes.map(size => {
                              const qty = op.stock[size] || 0;
                              rowTotal += qty;
                              return (
                                <td key={size} className="py-5 px-4 text-center">
                                  <span className={`text-base font-black tracking-tighter ${qty > 0 ? 'text-slate-900' : 'text-slate-200'}`}>
                                    {qty.toLocaleString()}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="py-5 px-4 text-right">
                              <div className={`text-lg font-black tracking-tighter ${rowTotal > 0 ? 'text-slate-900' : 'text-slate-200'}`}>
                                {rowTotal.toLocaleString()}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-slate-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Real-time production ledger verified</span>
              </div>
              {product.isFullyCompleted && (
                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                  <CheckCircle2 size={12} /> Target 100% Fulfilled
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full max-w-7xl mx-auto pb-20">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-[#0F172A] rounded-2xl shadow-lg shadow-slate-900/20 border border-slate-700">
              <DatabaseZap className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">Live Stock & Fulfillment Control</span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Inventory Ledger</h1>
            </div>
          </div>
          <p className="text-slate-500 font-medium text-sm pl-1 mt-3">Operational fulfillment ledger tracking required quantities, finished goods, and pending production.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFinishedOnly(!showFinishedOnly)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${showFinishedOnly ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            <Filter size={14} strokeWidth={3} />
            {showFinishedOnly ? 'Finished Goods Only' : 'Show All Stages'}
          </button>
          <Button 
            onClick={fetchInventory}
            variant="outline"
            className="flex items-center gap-2 px-6 py-3"
          >
            <Activity size={18} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {renderContent()}

      <Alert 
        isOpen={alertInfo.isOpen} 
        type={alertInfo.type} 
        message={alertInfo.message} 
        title={alertInfo.title}
        onClose={() => setAlertInfo({ ...alertInfo, isOpen: false })} 
      />
    </div>
  );
};

export default InventoryDashboard;
