import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { waiterApi, ChangePasswordRequest } from '../../lib/api';

// Utility to merge Tailwind classes
function classNames(...inputs: (string | boolean | undefined | null | { [key: string]: boolean })[]) {
  return twMerge(clsx(inputs));
}

// Define the schema for form validation
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New password and confirm password do not match',
  path: ['confirmPassword'],
});

type ChangePasswordFormInputs = z.infer<typeof changePasswordSchema>;

interface ChangePasswordFormProps {
  userId: string;
  token: string;
  onPasswordChangeSuccess: () => void;
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ userId, token, onPasswordChangeSuccess }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<ChangePasswordFormInputs>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      oldPassword: '__new__pass', // Pre-fill with the default password
    },
  });

  const [apiError, setApiError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const onSubmit = async (data: ChangePasswordFormInputs) => {
    clearErrors();
    setApiError(null);

    try {
      const payload: ChangePasswordRequest = {
        userId,
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      };
      
      await waiterApi.changePassword(payload);
      setSubmitSuccess(true);
      setTimeout(() => {
        onPasswordChangeSuccess(); // Redirect to login screen
      }, 2000);
    } catch (err: any) {
      setApiError(err.message || 'An unexpected error occurred during password change.');
    }
  };

  if (submitSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-white rounded-lg shadow-xl max-w-sm w-full border border-gray-200 flex flex-col items-center justify-center text-center"
      >
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Changed!</h2>
        <p className="text-gray-700">Please log in with your new password.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 bg-white rounded-lg shadow-xl max-w-sm w-full border border-gray-200"
    >
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Change Password</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label htmlFor="oldPassword" className="block text-gray-700 text-sm font-bold mb-2">
            Old Password
          </label>
          <input
            type="password"
            id="oldPassword"
            {...register('oldPassword')}
            className={classNames(
              'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline',
              errors.oldPassword && 'border-red-500'
            )}
            readOnly // Pre-filled and not editable
          />
          {errors.oldPassword && <p className="text-red-500 text-xs italic mt-1">{errors.oldPassword.message}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="newPassword" className="block text-gray-700 text-sm font-bold mb-2">
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            {...register('newPassword')}
            className={classNames(
              'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline',
              errors.newPassword && 'border-red-500'
            )}
            placeholder="Enter new password"
            disabled={isSubmitting}
          />
          {errors.newPassword && <p className="text-red-500 text-xs italic mt-1">{errors.newPassword.message}</p>}
          <p className="text-gray-500 text-xs mt-1">
            Must be at least 8 characters, with uppercase, lowercase, number, and special character.
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-bold mb-2">
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            {...register('confirmPassword')}
            className={classNames(
              'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline',
              errors.confirmPassword && 'border-red-500'
            )}
            placeholder="Confirm new password"
            disabled={isSubmitting}
          />
          {errors.confirmPassword && <p className="text-red-500 text-xs italic mt-1">{errors.confirmPassword.message}</p>}
        </div>

        {apiError && (
          <p className="text-red-500 text-center text-sm mb-4">{apiError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={classNames(
            'w-full bg-primary-500 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2',
            isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'
          )}
        >
          {isSubmitting ? (
            <Loader2 className="inline-block w-5 h-5 animate-spin mr-2" />
          ) : (
            <span>Change Password</span>
          )}
        </button>
      </form>
    </motion.div>
  );
};

export default ChangePasswordForm;
