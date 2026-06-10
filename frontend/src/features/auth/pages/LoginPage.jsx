import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../../../api/apiClient';
import {
  User,
  Lock,
  ChevronDown,
  ShieldCheck,
  Globe,
  Activity,
  Cpu,
  Database,
  Eye,
  EyeOff,
  Mail,
  ArrowLeft
} from 'lucide-react';

const LoginPage = () => {
  const [view, setView] = useState('login'); // 'login', 'forgot', 'reset'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Access Denied: Invalid credentials or insufficient permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Simulate API call to verify email
    setTimeout(() => {
      // Updated to match the registered user found in your system
      if (email.toLowerCase() === 'akash@gmail.com') {
        setView('reset');
        setLoading(false);
      } else {
        setError('This Gmail address is not registered in our system. Please check and try again.');
        setLoading(false);
      }
    }, 1200);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      await apiClient.post('/reset-password/', {
        email: email,
        new_password: newPassword
      });
      
      setSuccess('Password updated successfully! You can now log in with your new password.');
      setView('login');
      // Reset fields
      setNewPassword('');
      setConfirmPassword('');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center font-sans overflow-hidden selection:bg-brand-primary/20 selection:text-brand-primary">

      {/* Main Structural Container */}
      <div className="flex flex-col lg:flex-row w-full h-full max-w-[1240px] max-h-[700px] min-h-[500px] lg:rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] bg-white">

        {/* LEFT SIDE: INDUSTRIAL BRAND VISUALS */}
        <div className="hidden lg:flex w-[55%] bg-brand-dark p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <img src="/Logo/icon-only.png" alt="Favourite Logo" className="h-12 w-auto object-contain" />
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight leading-none bg-gradient-to-r from-brand-accent via-brand-secondary to-brand-primary bg-clip-text text-transparent">Favourite</h2>
                <p className="text-brand-secondary text-[10px] font-bold uppercase tracking-[0.25em] mt-1.5">Readymade Garments</p>
              </div>
            </div>

            <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
              Manufacturing <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-brand-secondary to-brand-primary">Execution</span><br />
              System.
            </h1>
          </div>

          <div className="relative z-10 w-full max-w-[400px] mt-12">
            <div className="bg-[#1E293B]/80 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 shadow-2xl relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Database className="text-brand-secondary w-4 h-4" />
                  <span className="text-slate-200 text-sm font-semibold tracking-wide">Master Data Sync</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-slate-600" />
                </div>
              </div>
              <div className="flex items-end gap-2 h-20 mb-4">
                {[30, 60, 40, 85, 55, 75].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md transition-all duration-700"
                    style={{
                      height: `${height}%`,
                      backgroundColor: i === 3 ? 'var(--color-brand-primary)' : '#334155',
                      boxShadow: i === 3 ? '0 0 15px rgba(225, 0, 122, 0.4)' : 'none'
                    }}
                  />
                ))}
              </div>
              <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center">
                <p className="text-slate-400 text-xs font-medium">Production Node: Active</p>
                <Cpu className="text-slate-500 w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: LOGIN OR FORGOT PASSWORD / RESET */}
        <div className="w-full lg:w-[45%] bg-white px-6 py-10 sm:p-12 xl:p-16 flex flex-col justify-between relative">
          <div className="flex justify-between items-center mb-8 lg:mb-0">
            <div className="lg:hidden flex items-center gap-2">
              <img src="/Logo/icon-only.png" alt="Favourite Logo" className="h-8 w-auto object-contain" />
              <span className="font-bold text-slate-900 text-lg">Favourite</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-auto">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Secure Portal
            </div>
          </div>

          <div className="max-w-[400px] w-full mx-auto my-auto lg:my-0 lg:mt-24">
            {view === 'login' ? (
              <>
                <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">Access Hub</h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">Enter your credentials to manage garment master data and production workflows.</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-brand-primary text-red-700 text-sm font-bold rounded-r-lg animate-in shake duration-500 shadow-sm">
                    {error}
                  </div>
                )}
                
                {success && (
                   <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-brand-secondary text-emerald-700 text-sm font-bold rounded-r-lg animate-in slide-in-from-top-4 duration-500 shadow-sm">
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-700">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Username / ID</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors w-5 h-5" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. admin_production"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none text-slate-900 font-bold placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                      <button 
                        type="button" 
                        onClick={() => { setView('forgot'); setSuccess(''); setError(''); }}
                        className="text-[11px] font-black text-brand-primary hover:text-brand-primary-hover transition-colors uppercase tracking-widest"
                      >
                        Recovery
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors w-5 h-5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none text-slate-900 font-bold placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-primary transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 mt-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_8px_20px_-6px_rgba(225,0,122,0.5)] transition-all duration-300 transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Authenticating...' : 'Establish Secure Connection'}
                  </button>
                </form>

              </>
            ) : view === 'forgot' ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <button 
                  onClick={() => { setView('login'); setSuccess(''); setError(''); }}
                  className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors text-sm font-bold mb-8 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to Login
                </button>

                <div className="mb-10">
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Identify Yourself</h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    Enter the Gmail address you used during account registration to verify your identity.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-brand-primary text-red-700 text-sm font-semibold rounded-r-lg animate-in shake duration-500">
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerifyEmail} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">Registered Email (Gmail)</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors w-5 h-5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@gmail.com"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 mt-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold text-sm shadow-[0_8px_20px_-6px_rgba(225,0,122,0.5)] transition-all duration-200 transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Verifying...' : 'Verify My Identity'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="mb-10">
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Create New Password</h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    Identity verified! You can now set a new password for your account.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-brand-primary text-red-700 text-sm font-semibold rounded-r-lg animate-in shake duration-500">
                    {error}
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">New Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors w-5 h-5" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">Confirm New Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors w-5 h-5" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 mt-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl font-bold text-sm shadow-[0_8px_20px_-6px_rgba(11,77,162,0.5)] transition-all duration-200 transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Updating...' : 'Set New Password'}
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="mt-12 lg:mt-auto pt-6 flex justify-between items-center border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              © 2026 Favourite Readymade Garments
            </p>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-brand-primary transition-colors uppercase tracking-wider">
                <Globe className="w-3 h-3" /> EN <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;