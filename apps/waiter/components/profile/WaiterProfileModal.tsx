"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Mail, Phone, MapPin, Calendar, Building, Tag } from "lucide-react";
import { waiterApi } from "../../lib/api";

interface WaiterProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

interface WaiterProfile {
  id: string;
  name: string;
  surname: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tag_nickname: string;
  restaurant: {
    id: string;
    name: string;
    address: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export default function WaiterProfileModal({ isOpen, onClose, token }: WaiterProfileModalProps) {
  const [profile, setProfile] = useState<WaiterProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !profile) {
      fetchProfile();
    }
  }, [isOpen, profile, token]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await waiterApi.getProfile(token);
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                )}

                {error && (
                  <div className="text-red-600 text-center py-4">
                    {error}
                  </div>
                )}

                {profile && (
                  <div className="space-y-6">
                    {/* Profile Avatar and Name */}
                    <div className="text-center">
                      <div className="w-20 h-20 bg-red-600 rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold mb-3">
                        {profile.name?.charAt(0).toUpperCase()}{profile.surname?.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {profile.name} {profile.surname}
                      </h3>
                      {profile.tag_nickname && (
                        <p className="text-gray-500 flex items-center justify-center gap-1 mt-1">
                          <Tag className="h-4 w-4" />
                          {profile.tag_nickname}
                        </p>
                      )}
                    </div>

                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 border-b pb-2">Personal Information</h4>
                      
                      {profile.username && (
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Username</p>
                            <p className="text-gray-900">{profile.username}</p>
                          </div>
                        </div>
                      )}

                      {profile.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="text-gray-900">{profile.email}</p>
                          </div>
                        </div>
                      )}

                      {profile.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="text-gray-900">{profile.phone}</p>
                          </div>
                        </div>
                      )}

                      {profile.address && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Address</p>
                            <p className="text-gray-900">{profile.address}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Restaurant Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 border-b pb-2">Restaurant</h4>
                      
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Restaurant Name</p>
                          <p className="text-gray-900">{profile.restaurant.name}</p>
                        </div>
                      </div>

                      {profile.restaurant.address && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Restaurant Address</p>
                            <p className="text-gray-900">{profile.restaurant.address}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Account Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 border-b pb-2">Account</h4>
                      
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Member Since</p>
                          <p className="text-gray-900">{formatDate(profile.createdAt)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Last Updated</p>
                          <p className="text-gray-900">{formatDate(profile.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end p-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}