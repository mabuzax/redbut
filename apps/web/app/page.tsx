"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, ShoppingCart } from "lucide-react";
import ChatWindow from "../components/chat/ChatWindow";
import BurgerMenu from "../components/ui/BurgerMenu";
import RateYourWaiter from "../components/rating/RateYourWaiter";
import MyRequests from "../components/requests/MyRequests";
import MyBill from "../components/bill/MyBill";
import FoodMenu from "../components/menu/FoodMenu";

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
    | "rateWaiter"
    | "foodMenu";

  const [stage, setStage] = useState<Stage>("splash");
  const [loadingSession, setLoadingSession] = useState(false);
  const [userData, setUserData] = useState<{
    userId: string;
    tableNumber: number;
    token: string;
    sessionId: string;
  } | null>(null);
  
  // Global cart state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("redbutCart");
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
    localStorage.setItem("redbutCart", JSON.stringify(orderItems));
  }, [orderItems]);

  // Hide splash screen after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage("home");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Ensure anonymous session exists
  useEffect(() => {
    const ensureSession = async () => {
      if (typeof window === "undefined") return;
      const existing = localStorage.getItem("redbutSession");
      
      if (existing) {
        try {
          const data = JSON.parse(existing);
          setUserData({
            userId: data.userId,
            tableNumber: data.tableNumber,
            token: data.token,
            sessionId: data.sessionId,
          });
          return;
        } catch (e) {
          console.error("Failed to parse session data", e);
          localStorage.removeItem("redbutSession");
        }
      }

      // Ask user for table number – very simple prompt for MVP
      const tableNumberStr =
        prompt("Welcome to RedBut! 📱\nPlease enter your table number:") ?? "";
      const tableNumber = parseInt(tableNumberStr, 10);
      if (!tableNumber || Number.isNaN(tableNumber) || tableNumber < 1) {
        // Handle invalid table number, perhaps show an error or retry
        alert("Invalid table number. Please refresh and try again.");
        return;
      }

      setLoadingSession(true);
      try {
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
        const res = await fetch(`${apiBase}/api/v1/auth/anon`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tableNumber }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("redbutSession", JSON.stringify(data));
          // For convenience store token separately
          localStorage.setItem("redbutToken", data.token);
          setUserData({
            userId: data.userId,
            tableNumber: data.tableNumber,
            token: data.token,
            sessionId: data.sessionId,
          });
        } else {
          console.error("Failed to create session", data);
          alert(`Error creating session: ${data.message || 'Unknown error'}. Please refresh.`);
        }
      } catch (e) {
        console.error(e);
        alert("Could not connect to the server to create a session. Please check your connection and refresh.");
      } finally {
        setLoadingSession(false);
      }
    };
    if (stage === "home" && !userData) {
        ensureSession();
    }
  }, [stage, userData]);

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

  // Handle waiter request
  const handleWaiterRequested = async () => {
    // Show the waiter informed splash screen
    setStage("waiterInformed");
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
   *  Burger-menu navigation callbacks
   * ------------------------------------------------------------------ */
  const openRequests = () => setStage("requests");
  const openBill = () => setStage("bill");
  const openRateWaiter = () => setStage("rateWaiter");
  const openFoodMenu = () => setStage("foodMenu");
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
    <>
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
      ) : stage === "chat" && userData ? (
        <div className="fixed inset-0 flex items-center justify-center bg-background z-40">
          <ChatWindow
            onClose={() => setStage("home")}
            onWaiterRequested={handleWaiterRequested}
            userId={userData.userId}
            tableNumber={userData.tableNumber}
            token={userData.token}
            inputPlaceholder="e.g Tell me about your specials"
            headerText="Waiter Assistant"
            showCloseButton={true}
            className="w-full h-full md:w-[500px] md:h-[600px] md:rounded-xl"
          />
        </div>
      ) : stage === "foodMenu" && userData ? (
        <div className="fixed inset-0 bg-background z-40 p-0 md:p-4 overflow-y-auto">
          <FoodMenu
            userId={userData.userId}
            sessionId={userData.sessionId}
            tableNumber={userData.tableNumber}
            token={userData.token}
            onCloseMenu={() => setStage("home")}
            orderItems={orderItems}
            setOrderItems={setOrderItems}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
            showCart={showCart}
            setShowCart={setShowCart}
          />
        </div>
      ) : stage === "requests" && userData ? (
         <div className="fixed inset-0 bg-background z-40 p-4 overflow-y-auto">
          <MyRequests userId={userData.userId} token={userData.token} />
          <div className="text-center mt-4">
            <button
              onClick={() => setStage("home")}
              className="px-4 py-2 bg-primary-500 text-white rounded-md"
            >
              Back
            </button>
          </div>
        </div>
      ) : stage === "rateWaiter" && userData ? (
        <div className="fixed inset-0 bg-background z-40 p-4 overflow-y-auto flex flex-col">
          <RateYourWaiter
            userId={userData.userId}
            token={userData.token}
            waiterId= '3c4d8be2-85bd-4c72-9b6e-748d6e1abf42' // Placeholder, adjust as needed
            onRatingSubmitted={() => setStage("home")}
          />
          <div className="text-center mt-4">
            <button
              onClick={() => setStage("home")}
              className="px-4 py-2 bg-primary-500 text-white rounded-md"
            >
              Back
            </button>
          </div>
        </div>
      ) : stage === "bill" && userData ? (
        <div className="fixed inset-0 bg-background z-40 p-4 overflow-y-auto">
          <MyBill
            userId={userData.userId}
            tableNumber={userData.tableNumber}
            sessionId={userData.sessionId} 
            token={userData.token}
            onWaiterRequested={handleWaiterRequested}
          />
          <div className="text-center mt-4">
            <button
              onClick={() => setStage("home")}
              className="px-4 py-2 bg-primary-500 text-white rounded-md"
            >
              Back
            </button>
          </div>
        </div>
      ) : ( // Default to home screen or loading if session is being fetched
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-primary-500 mb-6">
              Hello RedBut
            </h1>
            <p className="text-lg md:text-xl text-secondary-600 max-w-md mx-auto">
              Restaurant Waiter Assistant Application
            </p>
            <div className="mt-8">
              <button
                className="red-button text-lg md:text-xl h-24 w-24 md:h-32 md:w-32 rounded-full"
                onClick={() => setStage("agentSplash")}
                disabled={loadingSession || !userData}
              >
                Buzz Waiter
              </button>
            </div>
            {/* ───────────────────────── Burger Menu ───────────────────────── */}
            <div className="mt-6 flex justify-center">
              <BurgerMenu
                onFoodMenuClick={openFoodMenu}
                onMyRequestsClick={openRequests}
                onMyBillClick={openBill}
                onRateWaiterClick={openRateWaiter}
              />
            </div>
            <p className="mt-8 text-sm text-secondary-400">
              {loadingSession
                ? "Setting up your session..."
                : userData ? "Phase 4 – AI Chat Integration" : "Please enter table number to start."}
            </p>
            {/* top-left star button */}
            <button
              onClick={openRateWaiter}
              className="absolute top-4 left-4 text-primary-500 hover:text-primary-700 focus:outline-none"
              aria-label="Rate your waiter"
            >
              <Star className="h-8 w-8" />
            </button>
          </motion.div>
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
    </>
  );
}
