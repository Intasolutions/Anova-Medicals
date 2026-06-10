import React, { useState } from 'react';
import { X, Send, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, Button, Input } from '../../../components/ui/Base';
import apiClient from '../../../api/apiClient';

const DispatchModal = ({ isOpen, onClose, product, size, availableQuantity, onSuccess }) => {
  const [quantity, setQuantity] = useState('');
  const [recipient, setRecipient] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!quantity || parseInt(quantity) <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (parseInt(quantity) > availableQuantity) {
      setError(`Cannot dispatch more than available (${availableQuantity}).`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiClient.post('/stock-outs/', {
        product: product.id,
        size: product.size_id, // We need to make sure we have the size ID
        quantity: parseInt(quantity),
        recipient,
        remarks
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error during dispatch", err);
      setError(err.response?.data?.error || "Failed to record dispatch. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg animate-in zoom-in-95 duration-300">
        <Card noPadding className="shadow-2xl border-none">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <Send className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Stock Dispatch</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Release Finished Goods</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-900"
            >
              <X size={20} strokeWidth={3} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Product Info Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 flex flex-col gap-2">
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</span>
                 <span className="text-sm font-black text-slate-900">{product.name}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Size</span>
                 <span className="px-2 py-0.5 bg-slate-200 text-[10px] font-black rounded text-slate-700">{size}</span>
               </div>
               <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-1">
                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Available Stock</span>
                 <span className="text-lg font-black text-emerald-600 tracking-tighter">{availableQuantity.toLocaleString()} Units</span>
               </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-xs font-bold text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <Input 
                label="Dispatch Quantity"
                type="number"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="1"
                max={availableQuantity}
              />

              <Input 
                label="Recipient / Destination"
                placeholder="e.g. Main Store, Customer Name"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Remarks</label>
                <textarea 
                  className="w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-[#DC2626]/5 focus:border-[#DC2626] outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-400 min-h-[80px]"
                  placeholder="Additional details..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="primary" 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                disabled={loading || !quantity || parseInt(quantity) > availableQuantity}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} strokeWidth={3} />
                    Confirm Dispatch
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default DispatchModal;
