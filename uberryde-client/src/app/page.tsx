'use client'
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import MapComponent from './components/MapComponent';
import HistoryPage from './history/page'; // Reuse history page
import PaymentPage from './pay/page';     // Reuse payment page

export default function Home() {
  const [activeView, setActiveView] = useState('map'); // 'map', 'history', or 'payment'

  const renderActiveView = () => {
    switch (activeView) {
      case 'history':
        return <HistoryPage />;
      case 'payment':
        return <PaymentPage />;
      case 'map':
      default:
        return <MapComponent />;
    }
  };

  return (
    <div 
      className="relative w-full h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="ml-64 h-full">
        {renderActiveView()}
      </main>
    </div>
  );
}
