"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SessionValidator from "./SessionValidator";
import { clearRedButLocalStorage } from "../../lib/redbut-localstorage";
import { authApi } from "../../lib/api";

interface TableSessionGuardProps {
  children: React.ReactNode;
}

// Generate a unique client ID for this browser/device
function generateClientId(): string {
  // Try to get existing client ID from localStorage
  let clientId = localStorage.getItem('redBut_client_id');
  
  if (!clientId) {
    // Generate new client ID based on browser fingerprint
    const userAgent = navigator.userAgent;
    const screenResolution = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    
    // Create a semi-unique identifier
    const fingerprint = btoa(`${userAgent}_${screenResolution}_${timezone}`).substring(0, 16);
    clientId = `browser_${fingerprint}_${timestamp}_${random}`;
    
    // Store it persistently
    localStorage.setItem('redBut_client_id', clientId);
  }
  
  return clientId;
}

function TableSessionGuardInner({ children }: TableSessionGuardProps) {
  const [hasTableSession, setHasTableSession] = useState<boolean | null>(null);
  const [sessionFromUrl, setSessionFromUrl] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const validateStoredSession = async () => {
      // Check for session parameter in URL first
      const sessionParam = searchParams.get('session');
      if (sessionParam) {
        setSessionFromUrl(sessionParam);
        return;
      }

      // Check if table_session exists in localStorage
      const tableSession = localStorage.getItem("redBut_table_session");
      if (tableSession) {
        // Always validate stored session against database
        try {
          const clientId = generateClientId();
          const response = await authApi.post('/api/v1/auth/validate-session', { 
            sessionId: tableSession,
            clientId 
          });

          if (response.ok) {
            // Session is valid in database
            setHasTableSession(true);
          } else {
            // Session is invalid or deleted from database
            console.error('Stored session validation failed - clearing localStorage');
            clearRedButLocalStorage();
            setHasTableSession(false);
          }
        } catch (error) {
          console.error('Error validating stored session:', error);
          // On error, assume session is invalid and clear it
          clearRedButLocalStorage();
          setHasTableSession(false);
        }
      } else {
        setHasTableSession(false);
      }
    };

    validateStoredSession();
  }, [searchParams]);

  const handleSessionValidated = (sessionData: any) => {
    // Session has been validated and stored, proceed to main app
    setHasTableSession(true);
    setSessionFromUrl(null);
    
    // Remove session parameter from URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.delete('session');
    window.history.replaceState({}, '', url.toString());
  };

  // Show session validator if we have a session parameter
  if (sessionFromUrl) {
    return (
      <SessionValidator 
        sessionId={sessionFromUrl}
        onSessionValidated={handleSessionValidated}
      />
    );
  }

  // Still checking localStorage
  if (hasTableSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // No table session found
  if (!hasTableSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              {/* QR Code Icon */}
              <svg 
                className="w-12 h-12 text-red-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M3 7V5a2 2 0 012-2h2M3 17v2a2 2 0 002 2h2m10-16h2a2 2 0 012 2v2m-4 12h2a2 2 0 002-2v-2M9 9h6v6H9V9z"
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Welcome to RedBut
            </h1>
            <p className="text-gray-600 text-lg">
              Use your phone's camera to scan QR Code from your Waiter
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Has table session, render children
  return <>{children}</>;
}

export default function TableSessionGuard({ children }: TableSessionGuardProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <TableSessionGuardInner>{children}</TableSessionGuardInner>
    </Suspense>
  );
}
