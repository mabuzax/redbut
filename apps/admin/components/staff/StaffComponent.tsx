/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback, useRef, ChangeEvent } from "react";
import {
  ArrowLeft,
  Loader2,
  Edit3, 
  Trash2,
  PlusCircle,
  Sparkles, 
  X,
  Users, // For empty state
  Eye, // For view details
} from "lucide-react";
import {
  adminApi,
  StaffMember, 
  CreateStaffMemberDto, 
  UpdateStaffMemberDto, 
  STAFF_POSITIONS, 
  StaffPosition,
  WaiterStatus,
  Restaurant
} from "../../lib/api"; 
import AiChatWindow from "./AiChatWindow"; 

export interface StaffComponentProps {
  onBack: () => void;
}

const StaffComponent = ({ onBack }: StaffComponentProps) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("redBut_token") || "" : "";
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [selectedStaffMember, setSelectedStaffMember] = useState<StaffMember | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateStaffMemberDto>({});
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<StaffMember | null>(null);
  
  // Only allow Waiter and Admin positions
  const ALLOWED_POSITIONS = ['Waiter', 'Admin'] as const;
  
  const initialStaffFormData: CreateStaffMemberDto = {
    name: "",
    surname: "",
    email: "",
    tag_nickname: "",
    position: "Waiter" as StaffPosition,
    phone: "",
    address: "",
    restaurantId: "",
  };
  const [formData, setFormData] = useState<CreateStaffMemberDto | UpdateStaffMemberDto>(initialStaffFormData);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  const fetchStaffMembers = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }
    
    // Only fetch staff if a restaurant is selected
    if (!selectedRestaurant) {
      setStaffMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await adminApi.getAllStaffMembers(token, selectedRestaurant);
      setStaffMembers(data);
      setError(null);
    } catch (e: any) {
      setError(`Failed to fetch staff members: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [token, selectedRestaurant]);

  const fetchRestaurants = useCallback(async () => {
    if (!token) return;
    try {
      const data = await adminApi.getRestaurants(token);
      setRestaurants(data);
    } catch (e: any) {
      console.error('Failed to fetch restaurants:', e.message);
      // Set empty array as fallback
      setRestaurants([]);
    }
  }, [token]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    fetchStaffMembers();
  }, [fetchStaffMembers]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRestaurantChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedRestaurant(e.target.value);
    setStaffMembers([]); // Clear current staff list
  };

  const handleViewDetails = (staff: StaffMember) => {
    setSelectedStaffMember(staff);
    setIsDetailViewOpen(true);
    setIsEditing(false);
  };

  const handleCloseDetailView = () => {
    setIsDetailViewOpen(false);
    setSelectedStaffMember(null);
    setIsEditing(false);
  };

  const handleEditToggle = () => {
    if (!isEditing && selectedStaffMember) {
      // Entering edit mode - initialize edit form data
      setEditFormData({
        name: selectedStaffMember.name,
        surname: selectedStaffMember.surname,
        phone: selectedStaffMember.phone || undefined,
        address: selectedStaffMember.address || undefined,
        tag_nickname: selectedStaffMember.tag_nickname,
        position: selectedStaffMember.position || 'Waiter' as StaffPosition,
        status: selectedStaffMember.status || WaiterStatus.Active,
      });
    }
    setIsEditing(!isEditing);
  };

  const handleEditFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!selectedStaffMember || !token) return;
    
    try {
      const updatedStaff = await adminApi.updateStaffMember(token, selectedStaffMember.id, editFormData);
      // Update the selected staff member with the new data
      setSelectedStaffMember(updatedStaff);
      // Refresh the staff list
      await fetchStaffMembers();
      // Exit edit mode
      setIsEditing(false);
      setError(null);
    } catch (e: any) {
      setError(`Failed to update staff member: ${e.message}`);
    }
  };

  const resetForm = () => {
    setFormData(initialStaffFormData);
    setEditingStaffMember(null);
  };

  const handleAddNew = () => {
    resetForm();
    const initialData = {
      ...initialStaffFormData,
      restaurantId: selectedRestaurant, // Pre-select the current restaurant
    };
    setFormData(initialData); 
    setIsModalOpen(true);
  };

  const handleEdit = (staff: StaffMember) => {
    setEditingStaffMember(staff);
    setFormData({ 
      name: staff.name,
      surname: staff.surname,
      tag_nickname: staff.tag_nickname,
      position: staff.position || 'Waiter',
      address: staff.address || undefined,
      phone: staff.phone || undefined,
      propic: staff.propic || undefined,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Authentication token not found.");
      return;
    }
    setError(null); // Clear previous errors
    
    // Client-side validation for new staff members
    if (!editingStaffMember) {
      const createData = formData as CreateStaffMemberDto;
      if (!createData.email && !createData.phone) {
        setError("Either email or phone number must be provided.");
        return;
      }
      if (!createData.restaurantId) {
        setError("Please select a restaurant.");
        return;
      }
    }
    
    try {
      if (editingStaffMember) {
        await adminApi.updateStaffMember(token, editingStaffMember.id, formData as UpdateStaffMemberDto);
      } else {
        await adminApi.createStaffMember(token, formData as CreateStaffMemberDto);
      }
      setIsModalOpen(false);
      fetchStaffMembers(); 
    } catch (e: any) {
      setError(`Failed to save staff member: ${e.message}`);
    }
  };

  const toggleAiChat = () => setIsAiChatOpen(prev => !prev);

  return (
    <div>
      <button onClick={onBack} className="mb-6 inline-flex items-center text-primary-600 hover:underline">
        <ArrowLeft className="mr-3 text-red-800 hover:text-red-900 transition-colors" strokeWidth={4} /> Dashboard
      </button>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
        <div className="flex space-x-2">
           <button 
            onClick={toggleAiChat} 
            className="btn-primary bg-purple-600 hover:bg-purple-700 flex items-center"
            style={{backgroundColor: '#8B5CF6', borderColor: '#8B5CF6'}} 
          >
            <Sparkles className="h-4 w-4 mr-2" /> Use AI
          </button>
          <button 
            onClick={handleAddNew} 
            className="btn-primary flex items-center"
            style={{backgroundColor: '#8B5CF6', borderColor: '#8B5CF6'}}
            disabled={!selectedRestaurant}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Add Staff
          </button>
        </div>
      </div>

      {/* Restaurant Selection */}
      <div className="mb-6">
        <label htmlFor="restaurant-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Restaurant
        </label>
        <select
          id="restaurant-select"
          value={selectedRestaurant}
          onChange={handleRestaurantChange}
          className="block w-full max-w-md border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        >
          <option value="">Choose a restaurant...</option>
          {restaurants.map(restaurant => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name} - {restaurant.location || restaurant.address}
            </option>
          ))}
        </select>
      </div>

      {!selectedRestaurant ? (
        <div className="text-center py-10">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Please select a restaurant to view staff members.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
      ) : error && !isModalOpen ? ( // Only show general error if modal is not open (modal has its own error display)
        <p className="text-red-500 text-center">{error}</p>
      ) : staffMembers.length === 0 ? (
        <div className="text-center py-10">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No staff members found for this restaurant. Add new staff to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffMembers.map(staff => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{staff.name} {staff.surname}</div>
                        <div className="text-sm text-gray-500">{staff.tag_nickname}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {staff.position || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        staff.status === WaiterStatus.Active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {staff.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {staff.phone || staff.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleViewDetails(staff)} 
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">{editingStaffMember ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
              <button onClick={() => { setIsModalOpen(false); setError(null); } }><X className="h-6 w-6 text-gray-500 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" name="name" id="name" value={(formData as any).name} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="surname" className="block text-sm font-medium text-gray-700">Surname</label>
                <input type="text" name="surname" id="surname" value={(formData as any).surname} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              {!editingStaffMember && ( 
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                  <input type="email" name="email" id="email" value={(formData as CreateStaffMemberDto).email || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                </div>
              )}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number {!editingStaffMember ? '(Required if no email)' : ''}</label>
                <input type="tel" name="phone" id="phone" value={formData.phone || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" placeholder="e.g. +1234567890" />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                <input type="text" name="address" id="address" value={formData.address || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" placeholder="e.g. 123 Main Street, City" />
              </div>
              <div>
                <label htmlFor="tag_nickname" className="block text-sm font-medium text-gray-700">Tag Name</label>
                <input type="text" name="tag_nickname" id="tag_nickname" value={formData.tag_nickname} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">Position</label>
                <select name="position" id="position" value={formData.position} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                  {ALLOWED_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </div>
              {!editingStaffMember && (
                <div>
                  <label htmlFor="restaurantId" className="block text-sm font-medium text-gray-700">Restaurant</label>
                  <select name="restaurantId" id="restaurantId" value={(formData as CreateStaffMemberDto).restaurantId} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                    <option value="">Select a restaurant...</option>
                    {restaurants.map(restaurant => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name} - {restaurant.location || restaurant.address}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setError(null); } } className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingStaffMember ? 'Save Changes' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Staff Detail View Modal */}
      {isDetailViewOpen && selectedStaffMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Staff Details</h3>
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
                  <p className="text-gray-900">{selectedStaffMember.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Surname</label>
                {isEditing ? (
                  <input 
                    type="text"
                    name="surname"
                    value={editFormData.surname || ''}
                    onChange={handleEditFormChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                ) : (
                  <p className="text-gray-900">{selectedStaffMember.surname}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name</label>
                {isEditing ? (
                  <input 
                    type="text"
                    name="tag_nickname"
                    value={editFormData.tag_nickname || ''}
                    onChange={handleEditFormChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                ) : (
                  <p className="text-gray-900">{selectedStaffMember.tag_nickname}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                {isEditing ? (
                  <select 
                    name="position"
                    value={editFormData.position || ''}
                    onChange={handleEditFormChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    {ALLOWED_POSITIONS.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{selectedStaffMember.position || 'N/A'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                {isEditing ? (
                  <select 
                    name="status"
                    value={editFormData.status || selectedStaffMember.status || WaiterStatus.Active}
                    onChange={handleEditFormChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value={WaiterStatus.Active}>Active</option>
                    <option value={WaiterStatus.Inactive}>Inactive</option>
                  </select>
                ) : (
                  <span 
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedStaffMember.status === WaiterStatus.Active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedStaffMember.status || 'Active'}
                  </span>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                {isEditing ? (
                  <input 
                    type="tel"
                    name="phone"
                    value={editFormData.phone || ''}
                    onChange={handleEditFormChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                ) : (
                  <p className="text-gray-900">{selectedStaffMember.phone || 'N/A'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{selectedStaffMember.email || 'N/A'}</p>
                {isEditing && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
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
                  <p className="text-gray-900">{selectedStaffMember.address || 'N/A'}</p>
                )}
              </div>
            </div>
            
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
      
      {isAiChatOpen && <AiChatWindow onClose={toggleAiChat} onStaffUpdate={fetchStaffMembers} />}
    </div>
  );
};

export default StaffComponent;