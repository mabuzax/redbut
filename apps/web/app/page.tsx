"use client";

import { useState, useEffect, useCallback } from "react";
import { clearRedButLocalStorage } from "../lib/redbut-localstorage";
import { authApi, api } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ShoppingCart, ArrowLeft, CreditCard, QrCode } from "lucide-react";
import QRCode from "qrcode";
import ChatWindow from "../components/chat/ChatWindow";
import BurgerMenu from "../components/ui/BurgerMenu";
import MyRequests from "../components/requests/MyRequests";
import MyBill from "../components/bill/MyBill";
import FoodMenu from "../components/menu/FoodMenu";
import MyOrders from "../components/orders/MyOrders";
import TableSessionGuard from "../components/auth/TableSessionGuard";
import { useSSENotifications } from "../hooks/useSSENotifications";
import { useSSENotificationManager } from "../hooks/useSSENotificationManager";
import SSENotification from "../components/notifications/SSENotification";

// Define the OrderItem interface for cart items
interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedOptions?: string[];
}

export default function Home() {
  type Stage =
    | "splash"
    | "home"
    | "agentSplash"
    | "chat"
    | "waiterInformed"
    | "requests"
    | "bill"
    | "foodMenu"
    | "myOrders";

  const [stage, setStage] = useState<Stage>("splash");
  const [loadingSession, setLoadingSession] = useState(false);
  const [chatRefreshTrigger, setChatRefreshTrigger] = useState(0);
  const [isChatDisconnected, setIsChatDisconnected] = useState(false);
  
  // Navigation tracking - tracks where each view was opened from
  const [navigationOrigin, setNavigationOrigin] = useState<{
    requests?: Stage;
    orders?: Stage;
    menu?: Stage;
  }>({});
  
  const [userData, setUserData] = useState<{
    userId: string;
    tableNumber: number;
    token: string;
    sessionId: string;
    waiter?: {
      id: string;
      name: string;
      surname: string;
    } | null;
  } | null>(null);
  
  // Global cart state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [hasUnpaidOrders, setHasUnpaidOrders] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showWaiterImage, setShowWaiterImage] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [menuSearchTerm, setMenuSearchTerm] = useState<string>("");

  // Initialize custom notification manager
  const { showNotification, hideNotification, notifications } = useSSENotificationManager();

  // Initialize SSE notifications for real-time updates
  const handleSSENotification = useCallback((notification: any) => {
    console.log('🔍 SSE notification received in handler:', notification);
    const title = notification.data?.title;
    const message = notification.data?.message;
    console.log('🔍 Notification type:', notification.type);
    console.log('🔍 Notification title:', title);
    console.log('🔍 Notification message:', message);
    
    // Show custom notification for status updates
    if (notification.type === 'request_update' && message) {
      console.log('🎯 Triggering request update notification');
      showNotification({
        title: title || 'Request Update',
        message,
        type: 'request_update',
        duration: 5
      });
    } else if (notification.type === 'order_update' && message) {
      console.log('🎯 Triggering order update notification');
      showNotification({
        title: title || 'Order Update',
        message,
        type: 'order_update',
        duration: 5
      });
    } else {
      console.log('❌ No notification triggered. Type:', notification.type, 'Has message:', !!message);
    }
    
    // Handle cache refresh notifications
    if (notification.type === 'cache_refresh' && notification.data?.requiresRefresh) {
      console.log('SSE cache refresh triggered');
      // Could trigger data refreshes here if needed
    }
  }, [showNotification]);

  useSSENotifications({
    sessionId: userData?.userId || undefined,
    token: userData?.token || '',
    enabled: !!userData?.userId && !!userData?.token,
    onNotification: handleSSENotification,
  });

  // Generate QR code data URL when userData changes
  useEffect(() => {
    if (userData && userData.sessionId && userData.tableNumber) {
      const generateQRCode = async () => {
        try {
          // Create QR code data with session info and current URL
          const qrData = `${window.location.origin}?sessionId=${userData.sessionId}&tableNumber=${userData.tableNumber}`;
          const dataUrl = await QRCode.toDataURL(qrData, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeDataUrl(dataUrl);
        } catch (error) {
          console.error('Failed to generate QR code:', error);
        }
      };
      generateQRCode();
    }
  }, [userData]);

  // Track when user returns to chat to refresh history
  useEffect(() => {
    if (stage === "chat") {
      setChatRefreshTrigger(prev => prev + 1);
    }
  }, [stage]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("redBut_cart");
    if (savedCart) {
      try {
        setOrderItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse saved cart", e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("redBut_cart", JSON.stringify(orderItems));
  }, [orderItems]);

  // Hide splash screen after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage("home");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Ensure session exists from QR code or stored session
  useEffect(() => {
    const ensureSession = async () => {
      if (typeof window === "undefined") return;
      
      // Check if there's a table session (from QR code flow or stored)
  const tableSession = localStorage.getItem("redBut_table_session");
      if (tableSession) {
        setLoadingSession(true);
        try {
          const response = await authApi.post('/api/v1/auth/validate-session', { sessionId: tableSession });

          if (response.ok) {
            const data = await response.json();
            console.log('Session validation successful:', data);
            setUserData({
              userId: data.userId,
              tableNumber: data.tableNumber,
              token: data.token, // Use JWT token from API response
              sessionId: data.sessionId,
              waiter: data.waiter || null,
            });
            // Store the complete session data for future use
            localStorage.setItem("redBut_session", JSON.stringify({
              userId: data.userId,
              tableNumber: data.tableNumber,
              token: data.token,
              sessionId: data.sessionId,
              waiter: data.waiter || null,
            }));
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Session validation failed:', response.status, errorData);
            // Clear invalid session data
            clearRedButLocalStorage();
            setUserData(null);
          }
        } catch (error) {
          console.error('Error validating session:', error);
          // Clear session data on error
          clearRedButLocalStorage();
          setUserData(null);
        } finally {
          setLoadingSession(false);
        }
        return;
      }
      
      // Check for stored complete session data as fallback, but still validate it
  const existing = localStorage.getItem("redBut_session");
      if (existing) {
        try {
          const data = JSON.parse(existing);
          // Always validate stored session against database
          setLoadingSession(true);
          const response = await authApi.post('/api/v1/auth/validate-session', { sessionId: data.sessionId });

          if (response.ok) {
            const validatedData = await response.json();
            console.log('Stored session validation successful:', validatedData);
            setUserData({
              userId: validatedData.userId,
              tableNumber: validatedData.tableNumber,
              token: validatedData.token, // Use fresh JWT token from API response
              sessionId: validatedData.sessionId,
              waiter: validatedData.waiter || null,
            });
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Stored session validation failed:', response.status, errorData);
            clearRedButLocalStorage();
            setUserData(null);
          }
          setLoadingSession(false);
          return;
        } catch (e) {
          console.error("Failed to parse or validate session data", e);
          clearRedButLocalStorage();
        }
      }

      // No valid session found
      setUserData(null);
    };
    
    if (stage === "home" && !userData) {
        ensureSession();
    }
  }, [stage, userData]);

  // Check for unpaid orders, active requests, and active orders when userData changes
  useEffect(() => {
    if (userData) {
      checkUnpaidOrders();
      checkActiveRequests();
      checkActiveOrders();
    }
  }, [userData]);

  // Transition from agentSplash → chat after 3 seconds
  useEffect(() => {
    if (stage !== "agentSplash") return;
    const t = setTimeout(() => setStage("chat"), 3000);
    return () => clearTimeout(t);
  }, [stage]);

  // Transition from waiterInformed → home after 3 seconds
  useEffect(() => {
    if (stage !== "waiterInformed") return;
    const t = setTimeout(() => setStage("home"), 3000);
    return () => clearTimeout(t);
  }, [stage]);

  // Handle waiter request from AI
  const handleWaiterRequested = useCallback(() => {
    setStage("waiterInformed");
  }, []);

  // Handle menu search request from AI
  const handleMenuSearchRequested = useCallback((searchTerm: string) => {
    setMenuSearchTerm(searchTerm);
    // Track that menu was opened from chat
    setNavigationOrigin(prev => ({ ...prev, menu: "chat" }));
    // Add a small delay to allow assistant message to be received before stage change
    setTimeout(() => {
      setStage("foodMenu");
    }, 100);
  }, []);

  // Handle menu view request from AI (general menu browsing)
  const handleMenuViewRequested = useCallback(() => {
    console.log("🔔 handleMenuViewRequested called");
    setMenuSearchTerm(""); // Clear search term for general browsing
    // Track that menu was opened from chat
    setNavigationOrigin(prev => ({ ...prev, menu: "chat" }));
    console.log("🔔 Setting stage to foodMenu");
    // Add a small delay to allow assistant message to be received before stage change
    setTimeout(() => {
      setStage("foodMenu");
    }, 100);
  }, []);

  // Handle requests view request from AI
  const handleRequestsViewRequested = useCallback(() => {
    // Track that requests was opened from chat
    setNavigationOrigin(prev => ({ ...prev, requests: "chat" }));
    // Add a small delay to allow assistant message to be received before stage change
    setTimeout(() => {
      setStage("requests");
    }, 100);
  }, []);

  // Handle orders view request from AI
  const handleOrdersViewRequested = useCallback(() => {
    // Track that orders was opened from chat
    setNavigationOrigin(prev => ({ ...prev, orders: "chat" }));
    // Add a small delay to allow assistant message to be received before stage change
    setTimeout(() => {
      setStage("myOrders");
    }, 100);
  }, []);

  // Handle chat disconnect when user closes chat
  const handleChatDisconnect = useCallback(() => {
    setIsChatDisconnected(true);
  }, []);

  // Handle buzz waiter button - reconnect chat if disconnected
  const handleBuzzWaiter = useCallback(() => {
    if (isChatDisconnected) {
      setIsChatDisconnected(false); // Reconnect chat
    }
    setStage("agentSplash");
  }, [isChatDisconnected]);

  // Handle closing menu and returning to origin
  const handleCloseMenu = () => {
    setMenuSearchTerm(""); // Clear search term
    const origin = navigationOrigin.menu || "home";
    setNavigationOrigin(prev => ({ ...prev, menu: undefined })); // Clear the origin
    setStage(origin);
  };

  // Handle closing requests view and returning to origin
  const handleCloseRequests = () => {
    const origin = navigationOrigin.requests || "home";
    setNavigationOrigin(prev => ({ ...prev, requests: undefined })); // Clear the origin
    setStage(origin);
  };

  // Handle closing orders view and returning to origin
  const handleCloseOrders = () => {
    const origin = navigationOrigin.orders || "home";
    setNavigationOrigin(prev => ({ ...prev, orders: undefined })); // Clear the origin
    setStage(origin);
  };

  // Cart management functions
  const addToCart = (item: OrderItem) => {
    setOrderItems(prev => {
      const existingItem = prev.find(orderItem => 
        orderItem.menuItemId === item.menuItemId && 
        JSON.stringify(orderItem.selectedOptions || []) === JSON.stringify(item.selectedOptions || [])
      );
      
      if (existingItem) {
        return prev.map(orderItem => 
          orderItem.menuItemId === item.menuItemId && 
          JSON.stringify(orderItem.selectedOptions || []) === JSON.stringify(item.selectedOptions || [])
            ? { ...orderItem, quantity: orderItem.quantity + item.quantity }
            : orderItem
        );
      } else {
        return [...prev, item];
      }
    });
  };

  const removeFromCart = (itemId: string, selectedOptions?: string[]) => {
    setOrderItems(prev => {
      const existingItem = prev.find(item => 
        item.menuItemId === itemId && 
        JSON.stringify(item.selectedOptions || []) === JSON.stringify(selectedOptions || [])
      );
      
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(item => 
          item.menuItemId === itemId && 
          JSON.stringify(item.selectedOptions || []) === JSON.stringify(selectedOptions || [])
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        return prev.filter(item => 
          !(item.menuItemId === itemId && 
          JSON.stringify(item.selectedOptions || []) === JSON.stringify(selectedOptions || []))
        );
      }
    });
  };

  const clearCart = () => {
    setOrderItems([]);
  };

  // Calculate total items in cart
  const totalCartItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  /* ------------------------------------------------------------------
   *  Burger-menu navigation callbacks (opened from home)
   * ------------------------------------------------------------------ */
  const openRequests = () => {
    setNavigationOrigin(prev => ({ ...prev, requests: "home" }));
    setStage("requests");
  };
  
  const openBill = () => setStage("bill");
  
  const openFoodMenu = () => {
    setNavigationOrigin(prev => ({ ...prev, menu: "home" }));
    setStage("foodMenu");
  };
  
  const openMyOrders = () => {
    setNavigationOrigin(prev => ({ ...prev, orders: "home" }));
    setStage("myOrders");
  };
  
  // Check for unpaid orders
  const checkUnpaidOrders = async () => {
    if (!userData) return;
    
    try {
      const response = await api.get('/api/v1/orders');
      const data = await response.json();
      if (data?.items && data.items.length > 0) {
        // Check if there are any orders (we assume they're unpaid until payment is implemented)
        setHasUnpaidOrders(true);
      } else {
        setHasUnpaidOrders(false);
      }
    } catch (error) {
      console.error('Failed to check unpaid orders:', error);
      setHasUnpaidOrders(false);
    }
  };

  // Check for active requests
  const checkActiveRequests = async () => {
    if (!userData) return;
    
    try {
      const response = await api.get('/api/v1/requests');
      const data = await response.json();
      if (Array.isArray(data)) {
        // Count active requests (not completed, cancelled, or done)
        const activeRequests = data.filter((request: any) => 
          request.status === 'New' ||
          request.status === 'InProgress' || 
          request.status === 'OnHold'
        );
        setActiveRequestsCount(activeRequests.length);
      } else {
        setActiveRequestsCount(0);
      }
    } catch (error) {
      console.error('Failed to check active requests:', error);
      setActiveRequestsCount(0);
    }
  };

  // Check for active orders
  const checkActiveOrders = async () => {
    if (!userData) return;
    
    try {
      const response = await api.get('/api/v1/orders');
      const data = await response.json();
      if (data?.items && Array.isArray(data.items)) {
        // Count orders that are not delivered/completed
        const activeOrders = data.items.filter((order: any) => 
          order.status !== 'Delivered' && 
          order.status !== 'Completed' && 
          order.status !== 'Cancelled'
        );
        setActiveOrdersCount(activeOrders.length);
      } else {
        setActiveOrdersCount(0);
      }
    } catch (error) {
      console.error('Failed to check active orders:', error);
      setActiveOrdersCount(0);
    }
  };
  const openCart = () => {
    if (stage === "foodMenu") {
      setShowCart(true);
    } else {
      setStage("foodMenu");
      // Set a small delay to show cart after menu loads
      setTimeout(() => setShowCart(true), 100);
    }
  };

  // Check if we should show the cart icon (not on splash screens)
  const showCartIcon = !["splash", "agentSplash", "waiterInformed"].includes(stage) && totalCartItems > 0;

  return (
    <TableSessionGuard>
      {/* SSE Notifications */}
      {notifications.map(notification => (
        <SSENotification
          key={notification.id}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onClose={() => hideNotification(notification.id)}
        />
      ))}
      
      {/* Splash Screen */}
      {stage === "splash" ? (
        <div className="splash-container">
          <div className="splash-text">RedBut</div>
        </div>
      ) : stage === "agentSplash" ? (
        <div className="splash-container">
          <div className="splash-text">AI&nbsp;Agent</div>
        </div>
      ) : stage === "waiterInformed" ? (
        <div className="splash-container">
          <div className="splash-text">Waiter&nbsp;Informed</div>
        </div>
      ) : userData ? (
        <>
          {/* Chat Window - Always mounted but visibility controlled by stage and disconnect state */}
          {!isChatDisconnected && (
            <div className={`fixed inset-0 flex items-center justify-center bg-background z-40 ${stage === "chat" ? "" : "hidden"}`}>
              <ChatWindow
                onClose={() => setStage("home")}
                onWaiterRequested={handleWaiterRequested}
                onMenuSearchRequested={handleMenuSearchRequested}
                onMenuViewRequested={handleMenuViewRequested}
                onRequestsViewRequested={handleRequestsViewRequested}
                onOrdersViewRequested={handleOrdersViewRequested}
                onDisconnect={handleChatDisconnect}
                userId={userData.userId}
                tableNumber={userData.tableNumber}
                token={userData.token}
                inputPlaceholder="e.g Tell me about your specials"
                headerText="AI Waiter Assistant"
                showCloseButton={true}
                className="w-full h-full md:w-[500px] md:h-[600px] md:rounded-xl"
                refreshTrigger={chatRefreshTrigger}
              />
            </div>
          )}

          {/* Food Menu */}
          {stage === "foodMenu" && (
            <div className="fixed inset-0 bg-background z-50 p-0 md:p-4 overflow-y-auto">
              {(() => { console.log("🔔 Rendering FoodMenu component, stage:", stage, "userData:", !!userData); return null; })()}
              <FoodMenu
                userId={userData.userId}
                sessionId={userData.sessionId}
                tableNumber={userData.tableNumber}
                token={userData.token}
                onCloseMenu={handleCloseMenu}
                orderItems={orderItems}
                setOrderItems={setOrderItems}
                addToCart={addToCart}
                removeFromCart={removeFromCart}
                clearCart={clearCart}
                showCart={showCart}
                setShowCart={setShowCart}
                initialSearchTerm={menuSearchTerm}
              />
            </div>
          )}

          {/* My Orders */}
          {stage === "myOrders" && (
            <div className="fixed inset-0 bg-background z-40 p-0 md:p-4 overflow-y-auto">
              <div className="bg-white shadow-sm p-4 flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <button 
                    onClick={handleCloseOrders} 
                    className="mr-3 text-red-800 hover:text-red-900 transition-colors"
                  >
                    <ArrowLeft className="mr-3 text-red-800 hover:text-red-900 transition-colors" strokeWidth={4} />
                  </button>
                  <h1 className="text-xl font-semibold">Home</h1>
                </div>
              </div>
              <MyOrders
                userId={userData.userId}
                token={userData.token}
                tableNumber={userData.tableNumber}
              />
            </div>
          )}

          {/* My Requests */}
          {stage === "requests" && (
            <div className="fixed inset-0 bg-background z-40 p-0 md:p-4 overflow-y-auto">
              <div className="bg-white shadow-sm p-4 flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <button 
                    onClick={handleCloseRequests} 
                    className="mr-3 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft className="mr-3 text-red-800 hover:text-red-900 transition-colors" strokeWidth={4} />
                  </button>
                  <h1 className="text-xl font-semibold">Home</h1>
                </div>
              </div>
              <div className="px-4">
                <MyRequests userId={userData.userId} token={userData.token} />
              </div>
            </div>
          )}

          {/* Bill View */}
          {stage === "bill" && (
            <div className="fixed inset-0 bg-background z-40 p-0 md:p-4 overflow-y-auto">
              <div className="bg-white shadow-sm p-4 flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <button 
                    onClick={() => setStage("home")} 
                    className="mr-3 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft className="mr-3 text-red-800 hover:text-red-900 transition-colors" strokeWidth={4} />
                  </button>
                  <h1 className="text-xl font-semibold">Home</h1>
                </div>
              </div>
              <div className="px-4">
                <MyBill
                  userId={userData.userId}
                  tableNumber={userData.tableNumber}
                  sessionId={userData.sessionId} 
                  token={userData.token}
                  onWaiterRequested={handleWaiterRequested}
                />
              </div>
            </div>
          )}

          {/* Home Content - Default view when userData exists but stage is "home" */}
          {stage === "home" && (
        <div className="flex min-h-screen flex-col items-center justify-start p-4 pt-8">
          {/* Fixed Burger Menu in top left */}
          {userData && (
            <div className="fixed top-4 left-4 z-40">
              <div className="shadow-lg rounded-full bg-white">
                <BurgerMenu
                  onFoodMenuClick={openFoodMenu}
                  onMyOrdersClick={openMyOrders}
                  onMyRequestsClick={openRequests}
                  onMyBillClick={openBill}
                />
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mt-12"
          >
            
            {/* Status Badges */}
            {userData && (activeRequestsCount > 0 || activeOrdersCount > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex justify-center gap-3 mb-6"
              >
                {/* Active Requests Badge */}
                {activeRequestsCount > 0 && (
                  <motion.button
                    onClick={openRequests}
                    className="flex items-center gap-2   text-blue-700 shadow-lg px-4 py-2 rounded-full transition-all duration-300 hover:scale-105"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-xs font-medium">
                      Requests  
                    </span>
                  </motion.button>
                )}

                {/* Active Orders Badge */}
                {activeOrdersCount > 0 && (
                  <motion.button
                    onClick={openMyOrders}
                    className="flex items-center gap-2  text-orange-700 px-4 py-2 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-xs font-medium">
                      Orders
                    </span>
                  </motion.button>
                )}
              </motion.div>
            )}
            
            <motion.h1
              className="text-3xl md:text-5xl font-extrabold text-primary-500 mb-4"
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 60, damping: 15 }}
            >
              Welcome!
            </motion.h1>
            
            {/* Waiter Profile Picture */}
            {userData && userData.waiter && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-4 flex justify-center"
              >
                <button
                  onClick={() => setShowWaiterImage(true)}
                  className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-red-200 shadow-lg hover:border-red-300 transition-all duration-200 hover:scale-105 cursor-pointer"
                >
                  <img 
                    src="/waiter_propic.jpg" 
                    alt={`${userData.waiter.name} ${userData.waiter.surname}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              </motion.div>
            )}
            
            {/* Table and Waiter Information */}
            {userData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-4"
              >
                
                {userData.waiter && (
                  <p className="text-sm text-gray-600 mt-1">
                    Your waiter is{" "}
                    <span className="text-red-600 font-bold">
                      {userData.waiter.name} {userData.waiter.surname}
                    </span>
                  </p>
                )}
                <p className="text-lg font-semibold text-gray-800">
                  Table {userData.tableNumber}
                </p>
              </motion.div>
            )}

            <p className="mt-4 text-sm text-secondary-400">
                {loadingSession
                ? "Setting up your session..."
                : !userData ? (
                   <>
                  <span className="text-red-600 font-semibold">No active session found.</span>
                  <br/>
                  Please scan the QR code provided by your waiter to start your dining experience.
                  </>
                ) : (
                  <>
                  </>
                )}
            </p>
            
            {/* Icons above Buzz Waiter button */}
            {userData && (
              <div className="mt-4 flex justify-center">
                <div className="relative w-40 flex justify-between items-center">
                  {/* QR Code Icon on the left */}
                  <motion.button
                    onClick={() => setShowQRCode(true)}
                    className="bg-white hover:bg-gray-50 text-gray-700 rounded-full p-2 shadow-xl transition-all duration-300 flex items-center justify-center w-10 h-10 border border-gray-300"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <QrCode size={16} />
                  </motion.button>

                  {/* Conditional Your Bill icon on the right - shown when there are unpaid orders */}
                  {hasUnpaidOrders && (
                    <motion.button
                      onClick={openBill}
                      className="bg-white hover:bg-red-700 text-red-500 rounded-full p-2 shadow-xl transition-all duration-300 flex items-center justify-center w-10 h-10 border border-gray-300"
                      animate={{ scale: [1, 1.6, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <span className="text-xs font-bold text-green-500 p-10">Pay</span>
                    </motion.button>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-1 flex justify-center items-end relative">
              {/* Buzz Waiter Button */}
              <button
                className={`h-40 w-40 rounded-full overflow-hidden p-0 flex items-center justify-center shadow-xl transition-shadow duration-300 ${
                  userData ? 'hover:shadow-2xl cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
                disabled={!userData}
              >
                <img
                  src="/buzzwaiter_btn.png"
                  alt="Buzz Waiter"
                  className="h-full w-full object-contain"
                  onClick={userData ? handleBuzzWaiter : undefined}
                />
              </button>
            </div>
          </motion.div>
          <span className="text-xs text-gray-500 mt-4">Don't hesitate to BUZZ if you need assistance!</span>
        </div>
          )}
        </>
      ) : (
        // Default loading state when no userData
        <div className="splash-container">
          <div className="splash-text">RedBut</div>
        </div>
      )}

      {/* Floating Cart Icon - Shows on all screens except splash screens when cart has items */}
      {showCartIcon && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 p-3 bg-primary-500 text-white rounded-full shadow-lg z-50 flex items-center justify-center"
          onClick={openCart}
          aria-label="View cart"
        >
          <ShoppingCart className="h-6 w-6" />
          {totalCartItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {totalCartItems}
            </span>
          )}
        </motion.button>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRCode && userData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-sm w-full text-center"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-red-600">Table Join</h3>
                <button
                  onClick={() => setShowQRCode(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4 flex justify-center">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Scan to join table"
                    className="w-48 h-48 border border-gray-200 rounded-lg"
                  />
                ) : (
                  <div className="bg-gray-100 p-6 rounded-lg w-48 h-48 flex items-center justify-center">
                    <QrCode size={120} className="text-gray-600" />
                    <p className="text-sm text-gray-500 mt-2">Generating QR code...</p>
                  </div>
                )}
              </div>              
              
              <p className="text-xs text-gray-500 font-semibold mb-2">
                Share this QR code with friends to let them join your table
              </p>

              {userData.sessionId && (
                <p className="text-xs text-gray-400 font-mono break-all">
                  Session: {userData.sessionId.slice(0, 8)}...
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Waiter Image Modal */}
      <AnimatePresence>
        {showWaiterImage && userData && userData.waiter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-md w-full text-center"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-red-600">Your Waiter</h3>
                <button
                  onClick={() => setShowWaiterImage(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4 flex justify-center">
                <div className="w-64 h-64 rounded-lg overflow-hidden border-2 border-red-200 shadow-lg">
                  <img 
                    src="/waiter_propic.jpg" 
                    alt={`${userData.waiter.name} ${userData.waiter.surname}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              <div className="text-center">
                <h4 className="text-xl font-bold text-gray-800 mb-1">
                  {userData.waiter.name} {userData.waiter.surname}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Your waiter for Table {userData.tableNumber}
                </p>
                <p className="text-xs text-gray-500">
                  Don't hesitate to call if you need assistance!
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </TableSessionGuard>
  );
}
