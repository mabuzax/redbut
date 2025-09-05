"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Plus, Trash2 } from "lucide-react";

interface WaiterBurgerMenuProps {
  onCreateSession: () => void;
  onCloseSession: () => void;
}

export default function WaiterBurgerMenu({ onCreateSession, onCloseSession }: WaiterBurgerMenuProps) {
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
      {/* Burger menu button */}
      <button
        onClick={toggleMenu}
        className="inline-flex items-center justify-center p-3 text-white bg-red-600 rounded-full hover:bg-red-700 active:bg-red-800 transition-all shadow-lg"
        aria-label="Menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
              initial={{ opacity: 0, scale: 0.8, x: -20, y: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -20, y: 10 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[60]"
            >
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Table Management</h3>
              </div>
              
              {/* Create Session */}
              <button
                onClick={() => handleMenuItemClick(onCreateSession)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center transition-colors"
              >
                <Plus className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Create Session</div>
                  <div className="text-xs text-gray-500">Start a new table session</div>
                </div>
              </button>
              
              {/* Close Table */}
              <button
                onClick={() => handleMenuItemClick(onCloseSession)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center transition-colors"
              >
                <Trash2 className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Close Table</div>
                  <div className="text-xs text-gray-500">End an active session</div>
                </div>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
