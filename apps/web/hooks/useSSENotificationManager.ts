"use client";

import { useState, useCallback } from 'react';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'request_update' | 'order_update' | 'session_transfer';
  duration?: number;
}

export function useSSENotificationManager() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    console.log('📢 showNotification called with:', notification);
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification = { ...notification, id };
    
    console.log('📢 Adding notification to state:', newNotification);
    setNotifications(prev => {
      console.log('📢 Previous notifications:', prev);
      const updated = [...prev, newNotification];
      console.log('📢 Updated notifications:', updated);
      return updated;
    });
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    showNotification,
    hideNotification,
    notifications
  };
}