/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { User, Loader2 } from "lucide-react";
import OTPLoginForm from "../components/auth/OTPLoginForm";
import LandingPage from "../components/auth/LandingPage";
import TenantRegistrationForm from "../components/auth/TenantRegistrationForm";
import RegistrationSuccess from "../components/auth/RegistrationSuccess";
import { adminApi } from "../lib/api";
import { clearRedButLocalStorage } from "../lib/redbut-localstorage";
import { isTokenExpired } from "../lib/jwt-utils";

// Import extracted components
import DashboardGrid, { Section } from "../components/dashboard/DashboardGrid";
import SectionPlaceholder from "../components/dashboard/SectionPlaceholder";
import FoodMenuComponent from "../components/food-menu/FoodMenuComponent";
import StaffComponent from "../components/staff/StaffComponent"; 
import RestaurantComponent from "../components/restaurant/RestaurantComponent";
import AnalyticsComponent from "../components/analytics/AnalyticsComponent";
import OwnerDashboardComponent from "../components/owner/OwnerDashboardComponent";

export default function AdminDashboard() {
  type Stage = "splash" | "landing" | "login" | "register" | "registration-success" | "dashboard";

  const [stage, setStage] = useState<Stage>("splash");
  const [loading, setLoading] = useState<boolean>(true); 
  const [userData, setUserData] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [registrationData, setRegistrationData] = useState<{
    tenantId: string;
    restaurantId: string;
    message: string;
  } | null>(null);
  
  useEffect(() => {
    // Check for existing authentication on initial load
    const checkExistingAuth = async () => {
      console.log("🔍 Checking for existing authentication...");
      
      try {
        const existingSession = localStorage.getItem("redBut_adminSession");
        const existingToken = localStorage.getItem("redBut_token");
        
        if (existingSession && existingToken) {
          console.log("📦 Found stored session and token");
          const sessionData = JSON.parse(existingSession);
          
          // Quick check: if token is obviously expired, don't bother with API call
          const tokenExpired = isTokenExpired(existingToken);
          if (tokenExpired === true) {
            console.log("⏰ Token is expired, clearing session");
            clearRedButLocalStorage();
          } else {
            console.log("🔐 Token appears valid, validating with server...");
            // Token appears valid or we can't determine expiry - validate with API
            try {
              await adminApi.getRestaurants(existingToken);
              
              // Token is valid, restore session immediately
              console.log("✅ Valid session found, restoring authentication state");
              setUserData(sessionData);
              setStage("dashboard");
              setLoading(false);
              return;
            } catch (error: any) {
              // Check if it's an authentication error (401/403) vs network error
              if (error.response?.status === 401 || error.response?.status === 403) {
                console.log("❌ Server rejected token, clearing session");
                clearRedButLocalStorage();
              } else if (error.code === 'NETWORK_ERROR' || !error.response) {
                // Network error - assume token is still valid and proceed
                // This prevents logout due to temporary network issues
                console.log("🌐 Network error during validation, proceeding with stored session");
                setUserData(sessionData);
                setStage("dashboard");
                setLoading(false);
                return;
              } else {
                console.log("❓ Unknown error validating token, clearing session");
                clearRedButLocalStorage();
              }
            }
          }
        } else {
          console.log("🚫 No stored session found");
        }
      } catch (error) {
        console.error("💥 Error parsing stored session data:", error);
        clearRedButLocalStorage();
      }
      
      // No valid session found, show splash then landing
      console.log("🚀 Showing splash screen before landing page");
      const timer = setTimeout(() => {
        setStage("landing");
        setLoading(false);
      }, 3000);

      return () => clearTimeout(timer);
    };

    checkExistingAuth();
  }, []); // Only run on initial mount

  const handleLoginSuccess = (data: any) => {
    localStorage.setItem("redBut_adminSession", JSON.stringify(data));
    localStorage.setItem("redBut_token", data.token);
    
    // Store restaurants data for tenant admin
    if (data.restaurants) {
      localStorage.setItem("redBut_restaurants", JSON.stringify(data.restaurants));
    }
    
    setUserData(data);
    setStage("dashboard");
    setSelectedSection(null); // Reset section on login
  };

  const handleRegistrationSuccess = (data: { tenantId: string; restaurantId: string; message: string }) => {
    setRegistrationData(data);
    setStage("registration-success");
  };

  const handleBackToDashboard = () => {
    setSelectedSection(null);
  };

  const handleShowLogin = () => {
    setStage("login");
  };

  const handleShowRegister = () => {
    setStage("register");
  };

  const handleBackToLanding = () => {
    setStage("landing");
  };

  const handleContinueToLogin = () => {
    setRegistrationData(null);
    setStage("login");
  };

  const handleLogout = () => {
    // Clear all authentication data
    clearRedButLocalStorage();
    setUserData(null);
    setSelectedSection(null);
    setStage("landing");
  };

  if (loading) { 
    return (
      <div className="splash-container">
        <div className="splash-text">RedBut Admin</div>
        {stage === "splash" && (
          <div className="mt-4 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        )}
      </div>
    );
  }

  if (stage === "landing") {
    return (
      <LandingPage 
        onLoginClick={handleShowLogin}
        onRegisterClick={handleShowRegister}
      />
    );
  }

  if (stage === "login") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <OTPLoginForm 
          onLoginSuccess={handleLoginSuccess}
          onBack={handleBackToLanding}
        />
      </div>
    );
  }

  if (stage === "register") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <TenantRegistrationForm 
          onRegistrationSuccess={handleRegistrationSuccess}
          onBack={handleBackToLanding}
        />
      </div>
    );
  }

  if (stage === "registration-success" && registrationData) {
    return (
      <RegistrationSuccess
        tenantId={registrationData.tenantId}
        restaurantId={registrationData.restaurantId}
        message={registrationData.message}
        onContinueToLogin={handleContinueToLogin}
      />
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
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {selectedSection === null ? (
            <>
              <DashboardGrid onSelect={setSelectedSection} />
            </>
          ) : selectedSection === "Food Menu" ? (
            <FoodMenuComponent onBack={handleBackToDashboard} />
          ) : selectedSection === "Staff" ? (
            <StaffComponent onBack={handleBackToDashboard} />
          ) : selectedSection === "Restaurants" ? (
            <RestaurantComponent onBack={handleBackToDashboard} />
          ) : selectedSection === "Analytics" ? (
            <AnalyticsComponent /> 
          ) : selectedSection === "Owner Dashboard" ? (
            <OwnerDashboardComponent onBack={handleBackToDashboard} />
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
