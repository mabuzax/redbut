"use client";

import { useState, useEffect } from "react";
import { Loader2, User } from "lucide-react";
import { authApi } from "../../lib/api";

interface SessionValidatorProps {
  sessionId: string;
  onSessionValidated: (sessionData: any) => void;
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

export default function SessionValidator({ sessionId, onSessionValidated }: SessionValidatorProps) {
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [existingSession, setExistingSession] = useState<any>(null);

  useEffect(() => {
    validateSession();
  }, [sessionId]);

  const validateSession = async () => {
    setLoading(true);
    setError(null);
    setExistingSession(null);
    
    try {
      const clientId = generateClientId();
      const response = await authApi.post('/api/v1/auth/validate-session', { 
        sessionId,
        clientId 
      });

      if (response.ok) {
        const data = await response.json();
        setSessionValid(true);
        
        // If user already has a name, automatically validate
        if (data.name) {
          localStorage.setItem('redBut_table_session', sessionId);
          onSessionValidated(data);
          return;
        }
      } else {
        const errorData = await response.json();
        
        // Check if this is a session prevention error
        if (errorData.existingSession) {
          setExistingSession(errorData.existingSession);
          setError('If you need to change tables or sessions, please ask your waiter for assistance');
        } else {
          setError(errorData.message || 'Table session not found. Ask Waiter to assist you.');
        }
      }
    } catch (error) {
      console.error('Session validation error:', error);
      setError('Failed to validate session');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    setValidating(true);
    setError(null);

    try {
      const clientId = generateClientId();
      const response = await authApi.post('/api/v1/auth/validate-session', { 
        sessionId, 
        name: name.trim() || undefined,
        clientId 
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store session in localStorage
        localStorage.setItem('redBut_table_session', sessionId);
        
        // Call the callback to proceed
        onSessionValidated(data);
      } else {
        const errorData = await response.json();
        
        // Check if this is a session prevention error
        if (errorData.existingSession) {
          setExistingSession(errorData.existingSession);
          setError('If you need to change tables or sessions, please ask your waiter for assistance');
        } else {
          setError(errorData.message || 'Failed to update session');
        }
      }
    } catch (error) {
      console.error('Session update error:', error);
      setError('Failed to update session');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg 
              className="w-8 h-8 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {existingSession ? "Session Already Active" : "Oops!"}
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            {error}
          </p>
          
          {existingSession && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 mb-2">
                <strong>Your current session:</strong>
              </p>
              <p className="text-sm text-yellow-700">
                Table {existingSession.tableNumber}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            {existingSession && (
              <button
                onClick={() => {
                  // Redirect to existing session
                  localStorage.setItem('redBut_table_session', existingSession.sessionId);
                  window.location.href = '/';
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 mb-2"
              >
                Continue with Table {existingSession.tableNumber}
              </button>
            )}
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (sessionValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to RedBut!
            </h1>
            <p className="text-gray-600">
              Your table is ready.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email or Phone (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=""
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <button
              onClick={handleContinue}
              disabled={validating}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {validating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Validating...
                </>
              ) : (
                'Continue'
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              You can leave this blank and continue without providing any information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
