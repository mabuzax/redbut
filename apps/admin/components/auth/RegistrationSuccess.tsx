import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Building, Mail, AlertTriangle } from 'lucide-react';

interface RegistrationSuccessProps {
  tenantId: string;
  restaurantId: string;
  message: string;
  onContinueToLogin: () => void;
}

const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({
  tenantId,
  restaurantId,
  message,
  onContinueToLogin,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Registration Successful!
            </h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
          </motion.div>

          {/* Registration Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-50 rounded-lg p-4 mb-6 text-left"
          >
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Building className="h-4 w-4 mr-2" />
              Registration Details
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Tenant ID:</span>
                <span className="ml-2 font-mono text-gray-800">{tenantId.slice(0, 8)}...</span>
              </div>
              <div>
                <span className="text-gray-500">Restaurant ID:</span>
                <span className="ml-2 font-mono text-gray-800">{restaurantId.slice(0, 8)}...</span>
              </div>
            </div>
          </motion.div>

          {/* Important Notes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h4 className="font-semibold text-amber-800 mb-2">Important Notes:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Your tenant account is now active</li>
                  <li>• Restaurant status is set to "Inactive" by default</li>
                  <li>• You can activate your restaurant from the admin dashboard</li>
                  <li>• Use your registered email for login authentication</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h4 className="font-semibold text-blue-800 mb-2">Next Steps:</h4>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Login with your registered email</li>
                  <li>2. Complete OTP verification</li>
                  <li>3. Activate your restaurant</li>
                  <li>4. Set up menu items and staff</li>
                </ol>
              </div>
            </div>
          </motion.div>

          {/* Continue Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onClick={onContinueToLogin}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center"
          >
            Continue to Login
            <ArrowRight className="h-4 w-4 ml-2" />
          </motion.button>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xs text-gray-500 mt-4"
          >
            Welcome to the RedBut restaurant management platform!
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default RegistrationSuccess;
