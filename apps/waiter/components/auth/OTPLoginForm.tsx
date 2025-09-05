import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { waiterApi } from '../../lib/api';

// Utility to merge Tailwind classes
function classNames(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ClassValue = string | boolean | undefined | null | { [key: string]: boolean };

// Step 1: Email/Phone and User Type
const stepOneSchema = z.object({
  emailOrPhone: z.string().min(1, 'Email or phone number is required'),
  userType: z.enum(['admin', 'waiter', 'manager'], {
    required_error: 'Please select a user type',
  }),
});

// Step 2: OTP Verification
const stepTwoSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
});

type StepOneInputs = z.infer<typeof stepOneSchema>;
type StepTwoInputs = z.infer<typeof stepTwoSchema>;

interface OTPLoginFormProps {
  onLoginSuccess: (userData: { id: string; name: string; token: string }) => void;
}

const OTPLoginForm: React.FC<OTPLoginFormProps> = ({ onLoginSuccess }) => {
  // Form management
  const [step, setStep] = useState(1);
  const [apiError, setApiError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [userType, setUserType] = useState<'admin' | 'waiter' | 'manager'>('waiter');
  const [otpValue, setOtpValue] = useState(''); // Independent OTP state
  
  // OTP input refs for auto-focus
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1 form
  const stepOneForm = useForm<StepOneInputs>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      userType: 'waiter' // Default to waiter for waiter app
    }
  });

  // Step 2 form
  const stepTwoForm = useForm<StepTwoInputs>({
    resolver: zodResolver(stepTwoSchema),
    defaultValues: {
      otp: ''
    }
  });

  const onStepOneSubmit = async (data: StepOneInputs) => {
    setApiError(null);
    
    try {
      const response = await waiterApi.generateOTP(data.emailOrPhone, data.userType);
      setUsername(response.username);
      setUserType(data.userType);
      setStep(2);
    } catch (err: any) {
      setApiError(err.message || 'Failed to send OTP. Please check your email/phone and user type.');
    }
  };

  const onStepTwoSubmit = async (data: StepTwoInputs) => {
    setApiError(null);

    try {
      const response = await waiterApi.verifyOTP(username, data.otp, userType);
      onLoginSuccess({
        id: response.waiter!.id,
        name: `${response.waiter!.name}`,
        token: response.token!,
      });
    } catch (err: any) {
      setApiError(err.message || 'Invalid OTP. Please try again.');
      setOtpValue(''); // Reset OTP state
      stepTwoForm.reset();
      // Focus first OTP input
      if (otpInputRefs.current[0]) {
        otpInputRefs.current[0].focus();
      }
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;
    
    // Update OTP value with safe array handling - Fixed cache issue
    const currentValues = Array.from({ length: 6 }, (_, i) => otpValue[i] || '');
    currentValues[index] = value;
    const newOTP = currentValues.join('');
    setOtpValue(newOTP);
    
    // Update form value
    stepTwoForm.setValue('otp', newOTP);
    
    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      const currentValues = Array.from({ length: 6 }, (_, i) => otpValue[i] || '');
      if (!currentValues[index] && index > 0) {
        // If current field is empty, move to previous and clear it
        otpInputRefs.current[index - 1]?.focus();
        currentValues[index - 1] = '';
        const newOTP = currentValues.join('');
        setOtpValue(newOTP);
        stepTwoForm.setValue('otp', newOTP);
      } else {
        // Clear current field
        currentValues[index] = '';
        const newOTP = currentValues.join('');
        setOtpValue(newOTP);
        stepTwoForm.setValue('otp', newOTP);
      }
    }
  };

  // Focus first OTP input when step 2 is reached
  useEffect(() => {
    if (step === 2 && otpInputRefs.current[0]) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const goBackToStepOne = () => {
    setStep(1);
    setApiError(null);
    setOtpValue(''); // Reset OTP state
    stepTwoForm.reset();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Waiter Login</h1>
        <p className="text-gray-600 mt-2">
          {step === 1 ? 'Enter your credentials to get started' : 'Enter the 6-digit code we sent you'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className={classNames(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
        )}>
          1
        </div>
        <div className={classNames(
          "w-16 h-1 mx-2",
          step >= 2 ? "bg-blue-600" : "bg-gray-200"
        )} />
        <div className={classNames(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
        )}>
          2
        </div>
      </div>

      {/* Error Message */}
      {apiError && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md"
        >
          <p className="text-sm text-red-600">{apiError}</p>
        </motion.div>
      )}

      {/* Step 1: Email/Phone + User Type */}
      {step === 1 && (
        <motion.form
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={stepOneForm.handleSubmit(onStepOneSubmit)}
          className="space-y-6"
        >
          <div>
            <label htmlFor="emailOrPhone" className="block text-sm font-medium text-gray-700 mb-2">
              Email or Phone
            </label>
            <input
              {...stepOneForm.register('emailOrPhone')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="maria.santos@example.com or +1234567890"
            />
            {stepOneForm.formState.errors.emailOrPhone && (
              <p className="mt-1 text-sm text-red-600">
                {stepOneForm.formState.errors.emailOrPhone.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
              User Type
            </label>
            <select
              {...stepOneForm.register('userType')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="waiter">Waiter</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
            </select>
            {stepOneForm.formState.errors.userType && (
              <p className="mt-1 text-sm text-red-600">
                {stepOneForm.formState.errors.userType.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={stepOneForm.formState.isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stepOneForm.formState.isSubmitting ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Sending OTP...
              </>
            ) : (
              'Send OTP'
            )}
          </button>
        </motion.form>
      )}

      {/* Step 2: OTP Verification */}
      {step === 2 && (
        <motion.form
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={stepTwoForm.handleSubmit(onStepTwoSubmit)}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Enter 6-digit code
            </label>
            <div className="flex space-x-2 justify-center">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  ref={(el) => { otpInputRefs.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  className="w-12 h-12 text-center text-lg font-medium border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => handleOTPChange(index, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(index, e)}
                  value={otpValue[index] || ''}
                />
              ))}
            </div>
            {stepTwoForm.formState.errors.otp && (
              <p className="mt-2 text-sm text-red-600 text-center">
                {stepTwoForm.formState.errors.otp.message}
              </p>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={goBackToStepOne}
              className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="mr-3 text-red-800 hover:text-red-900 transition-colors" strokeWidth={4} />
              Back
            </button>
            <button
              type="submit"
              disabled={stepTwoForm.formState.isSubmitting}
              className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stepTwoForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Verifying...
                </>
              ) : (
                'Verify & Login'
              )}
            </button>
          </div>
        </motion.form>
      )}
    </motion.div>
  );
};

export default OTPLoginForm;
