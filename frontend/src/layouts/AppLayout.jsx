import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import GlobalSearchOverlay from '../components/GlobalSearchOverlay';
import { useAuth } from '../context/AuthContext';

const AppLayout = ({ children }) => {
    const { user } = useAuth();
    const isPharmacyOnly = user?.role === 'PHARMACY';

    return (
        <div className="flex min-h-screen bg-slate-50">
            {!isPharmacyOnly && <Sidebar />}
            <div className="flex-1 flex flex-col min-w-0 relative">
                <Header />
                <GlobalSearchOverlay />
                <main className={`flex-1 ${isPharmacyOnly ? 'p-2' : 'p-8'}`}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
