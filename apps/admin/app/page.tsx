"use client";

import { useState, useEffect } from "react";
import {
  User,
  BrainCircuit,
  BarChart2,
  MessageSquare,
  ShoppingCart,
  Star,
  UtensilsCrossed,
  Users,
  CalendarClock,
  Table2,
  Settings,
  ArrowLeft,
  type LucideIcon
} from "lucide-react";
import LoginForm from "../components/auth/LoginForm";

export default function AdminDashboard() {
  type Stage = "splash" | "login" | "dashboard";
  type Section =
    | "AI Analysis"
    | "Analytics"
    | "Requests"
    | "Orders"
    | "Ratings"
    | "Food Menu"
    | "Staff"
    | "Shifts"
    | "Table Allocations"
    | "Owner Dashboard";

  const [stage, setStage] = useState<Stage>("splash");
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  
  // Hide splash screen after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage("login");
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Check for existing session
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
      }
    };
    
    if (stage === "login") {
      checkSession();
    }
  }, [stage]);

  const handleLoginSuccess = (data: any) => {
    localStorage.setItem("redbutAdminSession", JSON.stringify(data));
    localStorage.setItem("redbutToken", data.token);
    setUserData(data);
    setStage("dashboard");
  };

  // Render splash screen
  if (stage === "splash") {
    return (
      <div className="splash-container">
        <div className="splash-text">RedBut Admin</div>
      </div>
    );
  }

  // Render login screen
  if (stage === "login") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Render dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
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

/* ---------- Helper Components ---------- */

interface GridProps {
  onSelect: (s: Section) => void;
}

const DashboardGrid = ({ onSelect }: GridProps) => {
  const items: { key: Section; label: string; icon: LucideIcon }[] = [
    { key: "AI Analysis", label: "AI Analysis", icon: BrainCircuit },
    { key: "Analytics", label: "Analytics", icon: BarChart2 },
    { key: "Requests", label: "Requests", icon: MessageSquare },
    { key: "Orders", label: "Orders", icon: ShoppingCart },
    { key: "Ratings", label: "Ratings", icon: Star },
    { key: "Food Menu", label: "Food Menu", icon: UtensilsCrossed },
    { key: "Staff", label: "Staff", icon: Users },
    { key: "Shifts", label: "Shifts", icon: CalendarClock },
    { key: "Table Allocations", label: "Table Allocations", icon: Table2 },
    { key: "Owner Dashboard", label: "Owner Dashboard", icon: Settings },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className="bg-white border border-gray-200 rounded-lg py-8 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
        >
          <Icon className="h-8 w-8 text-primary-500 mb-2" />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </button>
      ))}
    </div>
  );
};

interface SectionProps {
  section: string;
  onBack: () => void;
}

const SectionPlaceholder = ({ section, onBack }: SectionProps) => (
  <div className="bg-white border border-gray-200 rounded-lg p-8">
    <button
      onClick={onBack}
      className="mb-6 inline-flex items-center text-primary-600 hover:underline"
    >
      <ArrowLeft className="h-4 w-4 mr-1" /> Back
    </button>
    <h3 className="text-xl font-semibold text-gray-900">{section}</h3>
    <p className="text-gray-500 mt-2">This section is under construction.</p>
  </div>
);
