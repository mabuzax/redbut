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
import FoodMenuComponent from "../components/food-menu/FoodMenuComponent";
import StaffComponent from "../components/staff/StaffComponent"; 
import ShiftsComponent from "../components/shifts/ShiftsComponent";
import TableAllocationsComponent from "../components/table-allocations/TableAllocationsComponent";
import OrdersComponent from "../components/orders/OrdersComponent";
import AnalyticsComponent from "../components/analytics/AnalyticsComponent"; // Fixed import path

export default function AdminDashboard() {
  type Stage = "splash" | "login" | "dashboard";

  const [stage, setStage] = useState<Stage>("splash");
  const [loading, setLoading] = useState<boolean>(true); 
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
      // Do nothing, wait for splash to finish
    } else if (!loading && !localStorage.getItem("redbutAdminSession")) {
      // If not loading and no session, ensure login stage
      setStage("login");
    }

  }, [stage, loading]);

  const handleLoginSuccess = (data: any) => {
    localStorage.setItem("redbutAdminSession", JSON.stringify(data));
    localStorage.setItem("redbutToken", data.token);
    setUserData(data);
    setStage("dashboard");
    setSelectedSection(null); // Reset section on login
  };

  const handleBackToDashboard = () => {
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
    // Main dashboard view
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            {/* Clicking the title/logo now also navigates back to the dashboard grid */}
            <button onClick={handleBackToDashboard} className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
              RedBut Admin
            </button>
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
            <RequestsComponent onBack={handleBackToDashboard} />
          ) : selectedSection === "Food Menu" ? (
            <FoodMenuComponent onBack={handleBackToDashboard} />
          ) : selectedSection === "Staff" ? (
            <StaffComponent onBack={handleBackToDashboard} />
          ) : selectedSection === "Shifts" ? (
            <ShiftsComponent onBack={handleBackToDashboard} />
          ) : selectedSection === "Table Allocations" ? (
            <TableAllocationsComponent onBack={handleBackToDashboard} />
          ) : selectedSection === "Orders" ? (
            <OrdersComponent onBack={handleBackToDashboard} />
          ) : selectedSection === "Analytics" ? (
            <AnalyticsComponent /> 
          ) : (
            <SectionPlaceholder
              section={selectedSection}
              onBack={handleBackToDashboard}
            />
          )}
        </main>
      </div>
    );
  }
  
  // Fallback loading state if not splash, not login, and not dashboard with user data
  return ( 
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
         <p className="ml-2">Loading dashboard...</p>
    </div>
  );
}
