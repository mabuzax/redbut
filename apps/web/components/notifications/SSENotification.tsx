"use client";

import { useState } from 'react';
import { X } from 'lucide-react';

interface SSENotificationProps {
  title: string;
  message: string;
  type: 'request_update' | 'order_update' | 'session_transfer';
  onClose: () => void;
}

export default function SSENotification({ 
  title, 
  message, 
  type, 
  onClose
}: SSENotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 150); // Small delay for animation
  };

  const getTypeColor = () => {
    switch (type) {
      case 'request_update':
        return 'border-blue-500 bg-blue-50';
      case 'order_update':
        return 'border-green-500 bg-green-50';
      case 'session_transfer':
        return 'border-purple-500 bg-purple-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'request_update':
        return '🔔';
      case 'order_update':
        return '🍽️';
      case 'session_transfer':
        return '👤';
      default:
        return '📢';
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-150"
        onClick={handleClose}
      />
      
      {/* Notification */}
      <div className={`
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
        max-w-md w-full mx-4 p-6 rounded-lg shadow-2xl border-2
        ${getTypeColor()}
        transition-all duration-150 ease-out
        ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getIcon()}</span>
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          </div>
          
          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Message */}
        <p className="text-gray-700 mb-4 leading-relaxed">
          {message}
        </p>

      </div>
    </>
  );
}