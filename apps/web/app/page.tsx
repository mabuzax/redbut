"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ChatWindow from "../components/chat/ChatWindow";
import BurgerMenu from "../components/ui/BurgerMenu";
import MyRequests from "../components/requests/MyRequests";
import MyBill from "../components/bill/MyBill";

export default function Home() {
  type Stage =
    | "splash"
    | "home"
    | "agentSplash"
    | "chat"
    | "waiterInformed"
    | "requests"
    | "bill";

  const [stage, setStage] = useState<Stage>("splash");
  const [loadingSession, setLoadingSession] = useState(false);
  const [userData, setUserData] = useState<{
    userId: string;
    tableNumber: number;
    token: string;
  } | null>(null);

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
      if (!tableNumber || Number.isNaN(tableNumber) || tableNumber < 1) return;

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
          });
        } else {
          console.error("Failed to create session", data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSession(false);
      }
    };
    ensureSession();
  }, []);

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
    
    // No need to make a request here as the ChatGateway already
    // creates the request in the database when it detects a waiter request
  };

  /* ------------------------------------------------------------------
   *  Burger-menu navigation callbacks
   * ------------------------------------------------------------------ */
  const openRequests = () => setStage("requests");
  const openBill = () => setStage("bill");

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
      ) : stage === "chat" ? (
        <div className="fixed inset-0 flex items-center justify-center bg-background z-40">
          <ChatWindow
            onClose={() => setStage("home")}
            onWaiterRequested={handleWaiterRequested}
            userId={userData?.userId}
            tableNumber={userData?.tableNumber}
            token={userData?.token}
            inputPlaceholder="e.g Tell me about your specials"
            headerText="Waiter Assistant"
            showCloseButton={true}
            className="w-full h-full md:w-[500px] md:h-[600px] md:rounded-xl"
          />
        </div>
      ) : (
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
              <BurgerMenu onMyRequestsClick={openRequests} onMyBillClick={openBill} />
            </div>
            <p className="mt-8 text-sm text-secondary-400">
              {loadingSession
                ? "Setting up your session..."
                : "Phase 4 – AI Chat Integration"}
            </p>
          </motion.div>
        </div>
      )}

      {/* ───────────────────────── Requests View ───────────────────────── */}
      {stage === "requests" && userData && (
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
      )}

      {/* ───────────────────────── Bill View ──────────────────────────── */}
      {stage === "bill" && userData && (
        <div className="fixed inset-0 bg-background z-40 p-4 overflow-y-auto">
          <MyBill
            userId={userData.userId}
            tableNumber={userData.tableNumber}
            sessionId={userData.userId /* placeholder, adjust if needed */}
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
      )}
    </>
  );
}
