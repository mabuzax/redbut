"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, ChevronDown, Settings } from "lucide-react";

interface WaiterProfileMenuProps {
  userData: {
    userId: string;
    username: string;
    waiterId: string;
    name: string;
    token: string;
  };
  onMyProfile: () => void;
  onSignOut: () => void;
}

export default function WaiterProfileMenu({ userData, onMyProfile, onSignOut }: WaiterProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleMenuItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative z-50">
      {/* Profile button */}
      <button
        onClick={toggleMenu}
        className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 bg-white rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all shadow-md border border-gray-200"
        aria-label="Profile menu"
      >
        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
          {userData.name?.charAt(0).toUpperCase() || 'W'}
        </div>
        <span className="hidden sm:block text-sm font-medium truncate max-w-24">
          {userData.name || 'Waiter'}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Menu overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-25 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
            >
              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-medium">
                    {userData.name?.charAt(0).toUpperCase() || 'W'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userData.name || 'Waiter'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      @{userData.username}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => handleMenuItemClick(onMyProfile)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <User className="h-4 w-4" />
                  My Profile
                </button>
                
                <button
                  onClick={() => handleMenuItemClick(onSignOut)}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}