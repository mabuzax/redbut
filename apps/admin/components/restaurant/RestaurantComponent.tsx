"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import {
  ArrowLeft,
  Loader2,
  Edit3,
  X,
  Building2,
  Eye,
  CreditCard,
} from "lucide-react";
import {
  adminApi,
  Restaurant,
  RestaurantStatus,
  RestaurantSubscription,
} from "../../lib/api";

export interface RestaurantComponentProps {
  onBack: () => void;
}

interface PaymentPlan {
  months: number;
  title: string;
  description: string;
  amount: number;
  savings?: string;
}

const RestaurantComponent = ({ onBack }: RestaurantComponentProps) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("redBut_token") || "" : "";
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Restaurant>>({});
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activatingPlanId, setActivatingPlanId] = useState<number | null>(null);

  // Utility functions for subscription handling
  const isSubscriptionActive = (subscription?: RestaurantSubscription): boolean => {
    if (!subscription) return false;
    return new Date(subscription.activeUntil) > new Date();
  };

  const getEffectiveStatus = (restaurant: Restaurant): RestaurantStatus => {
    // If restaurant has an explicit status, check subscription validity
    if (restaurant.subscription) {
      return isSubscriptionActive(restaurant.subscription) 
        ? RestaurantStatus.Active 
        : RestaurantStatus.Inactive;
    }
    // Fallback to explicit status or default to Active for backward compatibility
    return (restaurant.status as RestaurantStatus) || RestaurantStatus.Active;
  };

  const formatSubscriptionDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusDisplay = (restaurant: Restaurant): string => {
    const effectiveStatus = getEffectiveStatus(restaurant);
    
    if (effectiveStatus === RestaurantStatus.Active && restaurant.subscription) {
      return `Active till ${formatSubscriptionDate(restaurant.subscription.activeUntil)}`;
    }
    
    return effectiveStatus;
  };

  const paymentPlans: PaymentPlan[] = [
    {
      months: 1,
      title: "Activate for a Month",
      description: "To activate the restaurant for 1 month only, you need to pay an amount of R12,500",
      amount: 12500,
    },
    {
      months: 3,
      title: "Activate for 3 Months",
      description: "To activate the restaurant for 3 months, you need to pay an amount of R35,625",
      amount: 35625,
      savings: "5%",
    },
    {
      months: 6,
      title: "Activate for 6 Months",
      description: "To activate the restaurant for 6 months, you need to pay an amount of R69,750",
      amount: 69750,
      savings: "7%",
    },
    {
      months: 12,
      title: "Activate for 12 Months",
      description: "To activate the restaurant for 12 months, you need to pay an amount of R135,000",
      amount: 135000,
      savings: "10%",
    },
  ];

  const fetchRestaurants = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await adminApi.getRestaurants(token);
      setRestaurants(data);
      setError(null);
    } catch (e: any) {
      setError(`Failed to fetch restaurants: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleViewDetails = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsDetailViewOpen(true);
    setIsEditing(false);
  };

  const handleCloseDetailView = () => {
    setIsDetailViewOpen(false);
    setSelectedRestaurant(null);
    setIsEditing(false);
  };

  const handleEditToggle = () => {
    if (!isEditing && selectedRestaurant) {
      setEditFormData({
        name: selectedRestaurant.name,
        location: selectedRestaurant.location,
        address: selectedRestaurant.address,
        status: selectedRestaurant.status,
      });
    }
    setIsEditing(!isEditing);
  };

  const handleEditFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!selectedRestaurant || !token) return;

    try {
      // For now, just update the local state since we don't have an update restaurant API
      const updatedRestaurant = { ...selectedRestaurant, ...editFormData };
      setSelectedRestaurant(updatedRestaurant);
      
      // Update the restaurant in the list
      setRestaurants(prev => 
        prev.map(r => r.id === selectedRestaurant.id ? updatedRestaurant : r)
      );
      
      setIsEditing(false);
      setError(null);
    } catch (e: any) {
      setError(`Failed to update restaurant: ${e.message}`);
    }
  };

  const handleActivateClick = () => {
    setIsPaymentModalOpen(true);
  };

  const handlePaymentPlanSelect = async (plan: PaymentPlan) => {
    if (!selectedRestaurant) return;
    
    try {
      setActivatingPlanId(plan.months);
      setError(null);
      
      // Call the activation API (simulating payment success)
      const subscription = await adminApi.activateRestaurant(token, selectedRestaurant.id, plan.months);
      
      // Update the restaurant in our local state
      const updatedRestaurant = await adminApi.getRestaurants(token);
      setRestaurants(updatedRestaurant);
      
      // Update the selected restaurant with new subscription data
      const refreshedRestaurant = updatedRestaurant.find(r => r.id === selectedRestaurant.id);
      if (refreshedRestaurant) {
        setSelectedRestaurant(refreshedRestaurant);
      }
      
      // Close the payment modal and show success
      setIsPaymentModalOpen(false);
      
      // Show success message
      setSuccessMessage(`Restaurant activated successfully for ${plan.months} month${plan.months > 1 ? 's' : ''}! New subscription expires on ${formatSubscriptionDate(subscription.activeUntil)}.`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
    } catch (e: any) {
      setError(`Failed to activate restaurant: ${e.message}`);
      console.error('Activation failed:', e);
    } finally {
      setActivatingPlanId(null);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="mb-6 inline-flex items-center text-primary-600 hover:underline">
        <ArrowLeft className="mr-3 text-red-800 hover:text-red-900 transition-colors" strokeWidth={4} /> Dashboard
      </button>
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Restaurant Management</h2>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-700 rounded-lg">
          <p className="text-center">{successMessage}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-center">{error}</p>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-10">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No restaurants found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {restaurants.map(restaurant => (
                <tr key={restaurant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{restaurant.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {restaurant.location || restaurant.address || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        getEffectiveStatus(restaurant) === RestaurantStatus.Active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {getStatusDisplay(restaurant)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleViewDetails(restaurant)} 
                      className="text-blue-600 hover:text-blue-900 p-1"
                      title="View Details"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Restaurant Detail View Modal */}
      {isDetailViewOpen && selectedRestaurant && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Restaurant Details</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={handleEditToggle}
                  className="text-blue-600 hover:text-blue-900 p-1"
                  title={isEditing ? "Cancel Edit" : "Edit Details"}
                >
                  <Edit3 className="h-6 w-6" />
                </button>
                <button onClick={handleCloseDetailView}>
                  <X className="h-6 w-6 text-gray-500 hover:text-gray-700" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                {isEditing ? (
                  <input 
                    type="text"
                    name="name"
                    value={editFormData.name || ''}
                    onChange={handleEditFormChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                ) : (
                  <p className="text-gray-900">{selectedRestaurant.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                {isEditing ? (
                  <input 
                    type="text"
                    name="location"
                    value={editFormData.location || ''}
                    onChange={handleEditFormChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                ) : (
                  <p className="text-gray-900">{selectedRestaurant.location || 'N/A'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                {isEditing ? (
                  <select 
                    name="status"
                    value={editFormData.status || selectedRestaurant.status || RestaurantStatus.Active}
                    onChange={handleEditFormChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value={RestaurantStatus.Active}>Active</option>
                    <option value={RestaurantStatus.Inactive}>Inactive</option>
                  </select>
                ) : (
                  <span 
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      getEffectiveStatus(selectedRestaurant) === RestaurantStatus.Active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {getStatusDisplay(selectedRestaurant)}
                  </span>
                )}
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                {isEditing ? (
                  <textarea 
                    name="address"
                    value={editFormData.address || ''}
                    onChange={handleEditFormChange}
                    rows={3}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                ) : (
                  <p className="text-gray-900">{selectedRestaurant.address || 'N/A'}</p>
                )}
              </div>
            </div>
            
            {/* Subscription Details */}
            {!isEditing && selectedRestaurant.subscription && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Subscription Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Active Until</label>
                    <p className="text-gray-900">{formatSubscriptionDate(selectedRestaurant.subscription.activeUntil)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Status</label>
                    <span 
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        isSubscriptionActive(selectedRestaurant.subscription)
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isSubscriptionActive(selectedRestaurant.subscription) ? 'Active' : 'Expired'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Activate Button for Inactive Restaurants */}
            {!isEditing && getEffectiveStatus(selectedRestaurant) === RestaurantStatus.Inactive && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={handleActivateClick}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Activate Restaurant
                </button>
              </div>
            )}
            
            {isEditing && (
              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
                <button 
                  onClick={handleEditToggle}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Activate Restaurant</h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={activatingPlanId !== null}
                className={activatingPlanId !== null ? 'cursor-not-allowed' : ''}
              >
                <X className={`h-6 w-6 ${activatingPlanId !== null ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paymentPlans.map((plan) => (
                <div key={plan.months} className="border border-gray-200 rounded-lg p-6 hover:border-primary-300 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">{plan.title}</h4>
                    {plan.savings && (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                        {plan.savings} save
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-gray-900">R{plan.amount.toLocaleString()}</span>
                  </div>
                  
                  <button 
                    onClick={() => handlePaymentPlanSelect(plan)}
                    disabled={activatingPlanId !== null}
                    className={`w-full py-2 px-4 rounded-md transition-colors flex items-center justify-center ${
                      activatingPlanId === plan.months
                        ? 'bg-gray-400 cursor-not-allowed'
                        : activatingPlanId !== null
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700'
                    } text-white`}
                  >
                    {activatingPlanId === plan.months ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Activating...
                      </>
                    ) : (
                      'Activate'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantComponent;
