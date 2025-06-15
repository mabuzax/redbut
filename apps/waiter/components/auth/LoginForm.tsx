import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { waiterApi } from '../../lib/api';
import ChangePasswordForm from './ChangePasswordForm';

// Utility to merge Tailwind classes
function classNames(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ClassValue = string | boolean | undefined | null | { [key: string]: boolean };

// Define the schema for form validation
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLoginSuccess: (userData: { id: string; name: string; token: string }) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  /* ------------------------------------------------------------------ */
  /* local state                                                        */
  /* ------------------------------------------------------------------ */
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const [apiError, setApiError] = useState<string | null>(null);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [loginMeta, setLoginMeta] = useState<{ userId: string; token: string } | null>(null);

  const onSubmit = async (data: LoginFormInputs) => {
    clearErrors();
    setApiError(null);

    try {
      const resp = await waiterApi.login(data.email, data.password);

      // If backend signals password change is required
      if (resp.requiresPasswordChange) {
        setLoginMeta({ userId: resp.userId, token: resp.token });
        setShowChangePwd(true);
        return;
      }

      // success – propagate to parent
      onLoginSuccess({ id: resp.userId, name: resp.name, token: resp.token });
    } catch (err: any) {
      setApiError(err.message || 'An unexpected error occurred during login.');
    }
  };

  /* -------------------------------------------------------------- */
  /* Render password-change form when required                       */
  /* -------------------------------------------------------------- */
  if (showChangePwd && loginMeta) {
    return (
      <ChangePasswordForm
        userId={loginMeta.userId}
        token={loginMeta.token}
        onPasswordChangeSuccess={() => {
          // after change, return to login view
          setShowChangePwd(false);
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 bg-white rounded-lg shadow-xl max-w-sm w-full border border-gray-200"
    >
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Waiter Login</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            {...register('email')}
            className={classNames(
              'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline',
              errors.email && 'border-red-500'
            )}
            placeholder="waiter@redbut.ai"
            disabled={isSubmitting}
          />
          {errors.email && <p className="text-red-500 text-xs italic mt-1">{errors.email.message}</p>}
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            {...register('password')}
            className={classNames(
              'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline',
              errors.password && 'border-red-500'
            )}
            placeholder="********"
            disabled={isSubmitting}
          />
          {errors.password && <p className="text-red-500 text-xs italic mt-1">{errors.password.message}</p>}
        </div>

        <div className="mb-6 flex items-center">
          <input
            type="checkbox"
            id="rememberMe"
            {...register('rememberMe')}
            className="mr-2 leading-tight"
            disabled={isSubmitting}
          />
          <label htmlFor="rememberMe" className="text-sm text-gray-700">
            Remember me
          </label>
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
            <span>Login</span>
          )}
        </button>
      </form>
    </motion.div>
  );
};

export default LoginForm;
