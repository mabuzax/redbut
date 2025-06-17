/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { User, Loader2 } from "lucide-react";
import LoginForm from "../components/auth/LoginForm";
import { adminApi } from "../lib/api";

// Import extracted components
import DashboardGrid, { Section } from "../components/dashboard/DashboardGrid";
import SectionPlaceholder from "../components/dashboard/SectionPlaceholder";
import RequestsComponent from "../components/requests/RequestsComponent";
import FoodMenuComponent from "../components/food-menu/FoodMenuComponent"; // Added import for FoodMenuComponent
import StaffComponent from "../components/staff/StaffComponent"; 
// AiChatWindowComponent is part of StaffComponent or will be a separate import if needed there

export default function AdminDashboard() {
  type Stage = "splash" | "login" | "dashboard";

  const [stage, setStage] = useState<Stage>("splash");
  const [loading, setLoading] = useState(true); // Keep loading state for splash/initial load
  const [userData, setUserData] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage("login");
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkSession = () => {
      const existingSession = localStorage.getItem("redbutAdminSession");
      if (existingSession) {
        try {
          const data = JSON.parse(existingSession);
          setUserData(data);
          setStage("dashboard");
        } catch (e) {
          console.error("Failed to parse session data", e);
          localStorage.removeItem("redbutAdminSession");
          setStage("login");
        }
      } else {
        setStage("login"); 
      }
    };
    
    if (stage !== "dashboard" && !loading) { 
      checkSession();
    } else if (loading && stage === "splash") {
    } else if (!loading && !localStorage.getItem("redbutAdminSession")) {
      setStage("login");
    }

  }, [stage, loading]);

  const handleLoginSuccess = (data: any) => {
    localStorage.setItem("redbutAdminSession", JSON.stringify(data));
    localStorage.setItem("redbutToken", data.token);
    setUserData(data);
    setStage("dashboard");
    setSelectedSection(null); 
  };

  if (loading && stage === "splash") { 
    return (
      <div className="splash-container">
        <div className="splash-text">RedBut Admin</div>
      </div>
    );
  }

  if (stage === "login") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  if (stage === "dashboard" && userData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-600">RedBut Admin</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{userData?.name || "Admin User"}</span>
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                <User className="h-5 w-5" />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {selectedSection === null ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>
              <DashboardGrid onSelect={setSelectedSection} />
            </>
          ) : selectedSection === "Requests" ? (
            <RequestsComponent onBack={() => setSelectedSection(null)} />
          ) : selectedSection === "Food Menu" ? (
            <FoodMenuComponent onBack={() => setSelectedSection(null)} />
          ) : selectedSection === "Staff" ? (
            <StaffComponent onBack={() => setSelectedSection(null)} />
          ) : (
            <SectionPlaceholder
              section={selectedSection}
              onBack={() => setSelectedSection(null)}
            />
          )}
        </main>
      </div>
    );
  }
  
  return ( 
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
         <p className="ml-2">Loading dashboard...</p>
    </div>
  );
}
