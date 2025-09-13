import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, ArrowRight, Building, MapPin, Mail, Phone, User, Globe } from 'lucide-react';
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

// Step 1: Tenant Details Schema
const tenantSchema = z.object({
  name: z.string().min(2, 'Tenant name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().or(z.literal('')),
  address: z.string().min(5, 'Address must be at least 5 characters').optional().or(z.literal('')),
});

// Step 2: Restaurant Details Schema
const restaurantSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().or(z.literal('')),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters').optional().or(z.literal('')),
});

type TenantFormData = z.infer<typeof tenantSchema>;
type RestaurantFormData = z.infer<typeof restaurantSchema>;

interface TenantRegistrationFormProps {
  onRegistrationSuccess: (data: { tenantId: string; restaurantId: string; message: string }) => void;
  onBack: () => void;
}

const TenantRegistrationForm: React.FC<TenantRegistrationFormProps> = ({ 
  onRegistrationSuccess, 
  onBack 
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [tenantData, setTenantData] = useState<TenantFormData | null>(null);

  // Step 1 form - Tenant Details
  const tenantForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
  });

  // Step 2 form - Restaurant Details  
  const restaurantForm = useForm<RestaurantFormData>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      location: '',
      address: '',
    },
  });

  const handleTenantSubmit = (data: TenantFormData) => {
    setTenantData(data);
    setStep(2);
    setApiError(null);
  };

  const handleRestaurantSubmit = async (restaurantData: RestaurantFormData) => {
    if (!tenantData) return;
    
    setIsSubmitting(true);
    setApiError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/admin/register-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant: {
            ...tenantData,
            status: 'Active', // Default status as requested
          },
          restaurant: {
            ...restaurantData,
            status: 'Inactive', // Default status as requested
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      onRegistrationSuccess({
        tenantId: result.tenant.id,
        restaurantId: result.restaurant.id,
        message: result.message || 'Registration successful!',
      });

    } catch (error: any) {
      setApiError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setApiError(null);
    } else {
      onBack();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building className="h-8 w-8 text-primary-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Register Tenant</h1>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className={classNames(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step >= 1 ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500"
            )}>
              1
            </div>
            <div className={classNames(
              "w-8 h-1",
              step >= 2 ? "bg-primary-600" : "bg-gray-200"
            )} />
            <div className={classNames(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              step >= 2 ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500"
            )}>
              2
            </div>
          </div>
          
          <p className="text-gray-600 text-sm">
            {step === 1 ? "Step 1: Tenant Information" : "Step 2: Restaurant Details"}
          </p>
        </div>

        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{apiError}</p>
          </div>
        )}

        {/* Step 1: Tenant Details Form */}
        {step === 1 && (
          <form onSubmit={tenantForm.handleSubmit(handleTenantSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="h-4 w-4 inline mr-1" />
                Tenant Name *
              </label>
              <input
                {...tenantForm.register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter tenant/company name"
              />
              {tenantForm.formState.errors.name && (
                <p className="text-red-500 text-xs mt-1">{tenantForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-1" />
                Email Address *
              </label>
              <input
                {...tenantForm.register('email')}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="admin@company.com"
              />
              {tenantForm.formState.errors.email && (
                <p className="text-red-500 text-xs mt-1">{tenantForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-1" />
                Phone Number
              </label>
              <input
                {...tenantForm.register('phone')}
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+1 (555) 123-4567"
              />
              {tenantForm.formState.errors.phone && (
                <p className="text-red-500 text-xs mt-1">{tenantForm.formState.errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="h-4 w-4 inline mr-1" />
                Address
              </label>
              <textarea
                {...tenantForm.register('address')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter tenant address"
              />
              {tenantForm.formState.errors.address && (
                <p className="text-red-500 text-xs mt-1">{tenantForm.formState.errors.address.message}</p>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Next
                <ArrowRight className="h-4 w-4 inline ml-1" />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Restaurant Details Form */}
        {step === 2 && (
          <form onSubmit={restaurantForm.handleSubmit(handleRestaurantSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building className="h-4 w-4 inline mr-1" />
                Restaurant Name *
              </label>
              <input
                {...restaurantForm.register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter restaurant name"
              />
              {restaurantForm.formState.errors.name && (
                <p className="text-red-500 text-xs mt-1">{restaurantForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="h-4 w-4 inline mr-1" />
                Location *
              </label>
              <input
                {...restaurantForm.register('location')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="City, State/Province"
              />
              {restaurantForm.formState.errors.location && (
                <p className="text-red-500 text-xs mt-1">{restaurantForm.formState.errors.location.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-1" />
                Restaurant Email
              </label>
              <input
                {...restaurantForm.register('email')}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="restaurant@company.com"
              />
              {restaurantForm.formState.errors.email && (
                <p className="text-red-500 text-xs mt-1">{restaurantForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-1" />
                Restaurant Phone
              </label>
              <input
                {...restaurantForm.register('phone')}
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+1 (555) 123-4567"
              />
              {restaurantForm.formState.errors.phone && (
                <p className="text-red-500 text-xs mt-1">{restaurantForm.formState.errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="h-4 w-4 inline mr-1" />
                Restaurant Address
              </label>
              <textarea
                {...restaurantForm.register('address')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter restaurant address"
              />
              {restaurantForm.formState.errors.address && (
                <p className="text-red-500 text-xs mt-1">{restaurantForm.formState.errors.address.message}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-blue-800 text-xs">
                <strong>Note:</strong> Restaurant will be created with "Inactive" status. 
                You can activate it after registration is complete.
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                    Registering...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default TenantRegistrationForm;
