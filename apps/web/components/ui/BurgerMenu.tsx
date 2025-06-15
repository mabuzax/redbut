import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

interface BurgerMenuProps {
  onMyRequestsClick: () => void;
  onMyBillClick: () => void;
  onRateWaiterClick: () => void;
}

const BurgerMenu: React.FC<BurgerMenuProps> = ({
  onMyRequestsClick,
  onMyBillClick,
  onRateWaiterClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Animation variants for the slide-out menu
  const menuVariants = {
    hidden: { x: '100%' },
    visible: { x: '0%' },
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMenuItemClick = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-secondary-500 hover:text-secondary-700 transition-colors p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-300"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={menuVariants}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50 flex flex-col p-4 md:w-80"
          >
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1">
              <ul>
                <li className="mb-2">
                  <button
                    onClick={() => handleMenuItemClick(onMyRequestsClick)}
                    className="block w-full text-left p-3 rounded-md text-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    My Requests
                  </button>
                </li>
                <li className="mb-2">
                  <button
                    onClick={() => handleMenuItemClick(onRateWaiterClick)}
                    className="block w-full text-left p-3 rounded-md text-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    Rate&nbsp;Your&nbsp;Waiter
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleMenuItemClick(onMyBillClick)}
                    className="block w-full text-left p-3 rounded-md text-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    My Bill
                  </button>
                </li>
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BurgerMenu;