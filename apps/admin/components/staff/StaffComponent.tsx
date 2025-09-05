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
} from "lucide-react";
import {
  adminApi,
  StaffMember, 
  CreateStaffMemberDto, 
  UpdateStaffMemberDto, 
  STAFF_POSITIONS, 
  StaffPosition 
} from "../../lib/api"; 
import AiChatWindow from "./AiChatWindow"; 

export interface StaffComponentProps {
  onBack: () => void;
}

const StaffComponent = ({ onBack }: StaffComponentProps) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("redBut_token") || "" : "";
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<StaffMember | null>(null);
  
  const initialStaffFormData: CreateStaffMemberDto = {
    name: "",
    surname: "",
    email: "",
    tag_nickname: "",
    position: "Waiter" as StaffPosition, 
    password: "", 
  };
  const [formData, setFormData] = useState<CreateStaffMemberDto | UpdateStaffMemberDto>(initialStaffFormData);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  const fetchStaffMembers = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAllStaffMembers(token);
      setStaffMembers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStaffMembers();
  }, [fetchStaffMembers]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(initialStaffFormData);
    setEditingStaffMember(null);
  };

  const handleAddNew = () => {
    resetForm();
    setFormData(initialStaffFormData); 
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

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) {
      if (!token) { setError("Authentication token not found."); return; }
      try {
        await adminApi.deleteStaffMember(token, id);
        fetchStaffMembers(); 
      } catch (e: any) {
        setError(`Failed to delete staff member: ${e.message}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Authentication token not found.");
      return;
    }
    setError(null); // Clear previous errors
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
          <button onClick={handleAddNew} className="btn-primary flex items-center"
            style={{backgroundColor: '#8B5CF6', borderColor: '#8B5CF6'}} 
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Add Staff
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
      ) : error && !isModalOpen ? ( // Only show general error if modal is not open (modal has its own error display)
        <p className="text-red-500 text-center">{error}</p>
      ) : staffMembers.length === 0 ? (
        <div className="text-center py-10">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No staff members found. Add new staff to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Surname</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffMembers.map(staff => (
                <tr key={staff.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{staff.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.surname}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.tag_nickname}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.position || staff.accessAccount?.userType || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(staff)} className="text-primary-600 hover:text-primary-900"><Edit3 className="h-5 w-5" /></button>
                    <button onClick={() => handleDelete(staff.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-5 w-5" /></button>
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
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email (Username)</label>
                  <input type="email" name="email" id="email" value={(formData as CreateStaffMemberDto).email} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                </div>
              )}
              <div>
                <label htmlFor="tag_nickname" className="block text-sm font-medium text-gray-700">Tag Name</label>
                <input type="text" name="tag_nickname" id="tag_nickname" value={formData.tag_nickname} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">Position</label>
                <select name="position" id="position" value={formData.position} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                  {STAFF_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </div>
               {!editingStaffMember && ( 
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password (optional)</label>
                  <input type="password" name="password" id="password" value={(formData as CreateStaffMemberDto).password || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" placeholder="Defaults to system password"/>
                   <p className="text-xs text-gray-500 mt-1">Leave blank to use default. User will be prompted to change it on first login.</p>
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
      {isAiChatOpen && <AiChatWindow onClose={toggleAiChat} onStaffUpdate={fetchStaffMembers} />}
    </div>
  );
};

export default StaffComponent;