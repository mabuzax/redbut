import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { adminApi } from '../../lib/api';

// Utility to merge Tailwind classes
function classNames(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ClassValue = string | boolean | undefined | null | { [key: string]: boolean };

// Step 1: Email/Phone only (no userType needed for tenants)
const stepOneSchema = z.object({
  emailOrPhone: z.string().min(1, 'Email or phone number is required'),
});

// Step 2: OTP Verification
const stepTwoSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
});

type StepOneInputs = z.infer<typeof stepOneSchema>;
type StepTwoInputs = z.infer<typeof stepTwoSchema>;

interface OTPLoginFormProps {
  onLoginSuccess: (userData: { id: string; name: string; token: string; restaurants?: any[] }) => void;
  onBack?: () => void;
}

const OTPLoginForm: React.FC<OTPLoginFormProps> = ({ onLoginSuccess, onBack }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);

  // Step 1 form
  const stepOneForm = useForm<StepOneInputs>({
    resolver: zodResolver(stepOneSchema),
  });

  // Step 2 form
  const stepTwoForm = useForm<StepTwoInputs>({
    resolver: zodResolver(stepTwoSchema),
  });

  const onStepOneSubmit = async (data: StepOneInputs) => {
    setApiError(null);
    
    try {
      console.log('Submitting tenant OTP generation request:', { emailOrPhone: data.emailOrPhone });
      const response = await adminApi.generateTenantOTP(data.emailOrPhone);
      console.log('Tenant OTP generation successful:', response);
      setUsername(data.emailOrPhone);
      setStep(2);
    } catch (err: any) {
      console.error('Tenant OTP generation failed:', err);
      setApiError(err.message || 'Failed to send OTP. Please check your email/phone.');
    }
  };

  const onStepTwoSubmit = async (data: StepTwoInputs) => {
    setApiError(null);

    try {
      const response = await adminApi.verifyTenantOTP(username, data.otp);
      onLoginSuccess({
        id: response.tenant.id,
        name: response.tenant.name,
        token: response.token,
        restaurants: response.tenant.restaurants,
      });
    } catch (err: any) {
      setApiError(err.message || 'Invalid OTP. Please try again.');
    }
  };

  const goBackToStepOne = () => {
    setStep(1);
    setApiError(null);
    stepTwoForm.reset();
  };

  if (step === 1) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-white rounded-lg shadow-xl max-w-sm w-full border border-gray-200"
      >
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Admin Login</h2>
        <form onSubmit={stepOneForm.handleSubmit(onStepOneSubmit)}>
          <div className="mb-6">
            <label htmlFor="emailOrPhone" className="block text-gray-700 text-sm font-bold mb-2">
              Email or Phone Number
            </label>
            <input
              type="text"
              id="emailOrPhone"
              {...stepOneForm.register('emailOrPhone')}
              className={classNames(
                'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline',
                stepOneForm.formState.errors.emailOrPhone && 'border-red-500'
              )}
              placeholder="admin@redbut.ai or +27-82-123-4567"
              disabled={stepOneForm.formState.isSubmitting}
            />
            {stepOneForm.formState.errors.emailOrPhone && (
              <p className="text-red-500 text-xs italic mt-1">
                {stepOneForm.formState.errors.emailOrPhone.message}
              </p>
            )}
          </div>

          {apiError && (
            <p className="text-red-500 text-center text-sm mb-4">{apiError}</p>
          )}

          <div className="space-y-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors hover:bg-gray-600"
                disabled={stepOneForm.formState.isSubmitting}
              >
                Back to Main
              </button>
            )}
            
            <button
              type="submit"
              disabled={stepOneForm.formState.isSubmitting}
              className={classNames(
                'w-full bg-primary-500 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2',
                stepOneForm.formState.isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'
              )}
            >
              {stepOneForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <span>Send OTP</span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

  // Step 2: OTP Verification
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 bg-white rounded-lg shadow-xl max-w-sm w-full border border-gray-200"
    >
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Enter OTP</h2>
      <p className="text-center text-gray-600 mb-6 text-sm">
        We've sent a 6-digit code to your registered email/phone
      </p>
      
      <form onSubmit={stepTwoForm.handleSubmit(onStepTwoSubmit)}>
        <div className="mb-6">
          <label htmlFor="otp" className="block text-gray-700 text-sm font-bold mb-2">
            OTP Code
          </label>
          <input
            type="text"
            id="otp"
            {...stepTwoForm.register('otp')}
            className={classNames(
              'shadow appearance-none border rounded w-full py-3 px-3 text-gray-700 text-center text-2xl tracking-widest leading-tight focus:outline-none focus:shadow-outline',
              stepTwoForm.formState.errors.otp && 'border-red-500'
            )}
            placeholder="123456"
            maxLength={6}
            disabled={stepTwoForm.formState.isSubmitting}
          />
          {stepTwoForm.formState.errors.otp && (
            <p className="text-red-500 text-xs italic mt-1">
              {stepTwoForm.formState.errors.otp.message}
            </p>
          )}
        </div>

        {apiError && (
          <p className="text-red-500 text-center text-sm mb-4">{apiError}</p>
        )}

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={goBackToStepOne}
            className="flex-1 bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors hover:bg-gray-600"
            disabled={stepTwoForm.formState.isSubmitting}
          >
            Back
          </button>
          
          <button
            type="submit"
            disabled={stepTwoForm.formState.isSubmitting}
            className={classNames(
              'flex-1 bg-primary-500 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2',
              stepTwoForm.formState.isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'
            )}
          >
            {stepTwoForm.formState.isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify</span>
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={goBackToStepOne}
          className="text-primary-500 text-sm hover:text-primary-600 transition-colors"
        >
          Use different email/phone?
        </button>
      </div>
    </motion.div>
  );
};

export default OTPLoginForm;
