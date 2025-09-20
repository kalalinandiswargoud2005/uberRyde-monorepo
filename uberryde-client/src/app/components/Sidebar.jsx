'use client'
import { Home, History, CreditCard, LogOut, User } from 'lucide-react';

export default function Sidebar({ activeView, setActiveView }) {
  const menuItems = [
    { id: 'map', label: 'Book a Ride', icon: Home },
    { id: 'history', label: 'Ride History', icon: History },
    { id: 'payment', label: 'Payment', icon: CreditCard },
  ];

  return (
    <div className="absolute top-0 left-0 h-full w-64 m-4">
      <div className="h-full w-full bg-black/30 backdrop-blur-lg rounded-2xl p-6 flex flex-col border border-white/10 shadow-lg">
        {/* User Profile Section */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
            <User className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white">Rider Name</h2>
            <p className="text-xs text-gray-400">View Profile</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-grow">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center p-3 my-2 rounded-lg transition-all duration-200 ease-in-out group ${
                activeView === item.id
                  ? 'bg-indigo-500 shadow-lg'
                  : 'hover:bg-white/10'
              }`}
            >
              <item.icon 
                className={`transition-colors ${
                  activeView === item.id ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`} 
                size={20} 
              />
              <span 
                className={`ml-4 font-medium transition-colors ${
                  activeView === item.id ? 'text-white' : 'text-gray-300 group-hover:text-white'
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Log Out Button */}
        <div>
          <button className="w-full flex items-center p-3 my-2 text-gray-400 hover:bg-red-500/50 hover:text-white rounded-lg transition-colors duration-200">
            <LogOut className="mr-4" size={20} />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}