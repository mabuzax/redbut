import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Building, Shield, Users, BarChart3 } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onRegisterClick }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center mb-6"
          >
            <Building className="h-12 w-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">RedBut Admin</h1>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Comprehensive restaurant management platform for multi-tenant operations
          </motion.p>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-3 gap-8 mb-12"
        >
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center mb-4">
              <Users className="h-8 w-8 text-primary-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Multi-Tenant</h3>
            </div>
            <p className="text-gray-600">
              Manage multiple restaurants under one platform with complete data isolation
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center mb-4">
              <Shield className="h-8 w-8 text-primary-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Secure Access</h3>
            </div>
            <p className="text-gray-600">
              Role-based access control with OTP authentication for enhanced security
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-8 w-8 text-primary-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
            </div>
            <p className="text-gray-600">
              Comprehensive reporting and analytics for data-driven decisions
            </p>
          </div>
        </motion.div>

        {/* Call to Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto"
        >
          <button
            onClick={onLoginClick}
            className="w-full sm:w-auto flex items-center justify-center px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <LogIn className="h-5 w-5 mr-2" />
            Login to Dashboard
          </button>

          <span className="text-gray-400 hidden sm:block">or</span>

          <button
            onClick={onRegisterClick}
            className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Register New Tenant
          </button>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-12 max-w-3xl mx-auto"
        >
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-900 mb-2">New to RedBut?</h4>
            <p className="text-blue-800 mb-4">
              Register as a new tenant to get started with our restaurant management platform. 
              You'll be able to set up your first restaurant and begin managing your operations immediately.
            </p>
            <div className="text-sm text-blue-700">
              <p><strong>What you get:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Complete tenant account setup</li>
                <li>First restaurant configuration</li>
                <li>Access to all platform features</li>
                <li>Multi-location support</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
