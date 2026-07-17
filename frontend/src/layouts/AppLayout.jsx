import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import GlobalSearchOverlay from '../components/GlobalSearchOverlay';
import { useAuth } from '../context/AuthContext';

const AppLayout = ({ children }) => {
    const { user } = useAuth();
    
    // Hide sidebar completely for doctors as requested
    const showSidebar = user?.role !== 'DOCTOR';

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            {showSidebar && <Sidebar />}
            <div className="flex-1 flex flex-col min-w-0 relative">
                <Header />
                <GlobalSearchOverlay />
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
