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
  CalendarDays, 
} from "lucide-react";
import {
  adminApi,
  ShiftWithStaffInfo,
  CreateShiftDto,
  UpdateShiftDto,
  MinimalStaffInfo,
  SHIFT_TYPES,
  ShiftType,
  SHIFT_STATUSES,
  ShiftStatus,
} from "../../lib/api";
import AiChatWindow from "./AiChatWindow"; 

export interface ShiftsComponentProps {
  onBack: () => void;
}

const ShiftsComponent = ({ onBack }: ShiftsComponentProps) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("redbutToken") || "" : "";
  const [shifts, setShifts] = useState<ShiftWithStaffInfo[]>([]);
  const [staffListForDropdown, setStaffListForDropdown] = useState<MinimalStaffInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftWithStaffInfo | null>(null);

  const initialShiftFormData: CreateShiftDto = {
    staffId: "",
    startTime: "",
    endTime: "",
    type: SHIFT_TYPES[0],
    status: SHIFT_STATUSES[0],
    notes: "",
  };
  const [formData, setFormData] = useState<CreateShiftDto | UpdateShiftDto>(initialShiftFormData);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  const fetchShifts = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAllShifts(token);
      setShifts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStaffListForDropdown = useCallback(async () => {
    if (!token) return;
    try {
      const staffList = await adminApi.getAllStaffMembers(token);
      setStaffListForDropdown(staffList.map(s => ({ id: s.id, name: s.name, surname: s.surname, tag_nickname: s.tag_nickname, position: s.position })));
    } catch (e: any) {
      console.error("Failed to fetch staff list for dropdown:", e.message);
    }
  }, [token]);

  useEffect(() => {
    fetchShifts();
    fetchStaffListForDropdown();
  }, [fetchShifts, fetchStaffListForDropdown]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(initialShiftFormData);
    setEditingShift(null);
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const formatDateTimeForInput = (isoString: string | Date): string => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toISOString().slice(0, 16);
    } catch (e) {
      return "";
    }
  };

  const handleEdit = (shift: ShiftWithStaffInfo) => {
    setEditingShift(shift);
    setFormData({
      staffId: shift.staffId,
      startTime: formatDateTimeForInput(shift.startTime),
      endTime: formatDateTimeForInput(shift.endTime),
      type: shift.type,
      status: shift.status,
      notes: shift.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this shift? This action cannot be undone.")) {
      if (!token) { setError("Authentication token not found."); return; }
      try {
        await adminApi.deleteShift(token, id);
        fetchShifts();
      } catch (e: any) {
        setError(`Failed to delete shift: ${e.message}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Authentication token not found.");
      return;
    }
    setError(null); 
    
    const dataToSend = {
        ...formData,
        startTime: new Date((formData as CreateShiftDto | UpdateShiftDto).startTime).toISOString(),
        endTime: new Date((formData as CreateShiftDto | UpdateShiftDto).endTime).toISOString(),
    };

    try {
      if (editingShift) {
        await adminApi.updateShift(token, editingShift.id, dataToSend as UpdateShiftDto);
      } else {
        await adminApi.createShift(token, dataToSend as CreateShiftDto);
      }
      setIsModalOpen(false);
      fetchShifts();
    } catch (e: any) {
      setError(`Failed to save shift: ${e.message}`);
    }
  };

  const toggleAiChat = () => setIsAiChatOpen(prev => !prev);

  return (
    <div>
      <button onClick={onBack} className="mb-6 inline-flex items-center text-primary-600 hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </button>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Shifts Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={toggleAiChat}
            className="btn-primary bg-purple-600 hover:bg-purple-700 flex items-center"
            style={{ backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }}
          >
            <Sparkles className="h-4 w-4 mr-2" /> Use AI
          </button>
          <button onClick={handleAddNew} className="btn-primary flex items-center"
            style={{ backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Add Shift
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
      ) : error && !isModalOpen ? (
        <p className="text-red-500 text-center">{error}</p>
      ) : shifts.length === 0 ? (
        <div className="text-center py-10">
          <CalendarDays className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No shifts found. Add new shifts to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shifts.map(shift => (
                <tr key={shift.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {shift.staffMember ? `${shift.staffMember.name} ${shift.staffMember.surname}` : 'N/A'}
                    {shift.staffMember?.tag_nickname && <span className="text-xs text-gray-500 ml-1">({shift.staffMember.tag_nickname})</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shift.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(shift.startTime).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(shift.endTime).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shift.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(shift)} className="text-primary-600 hover:text-primary-900"><Edit3 className="h-5 w-5" /></button>
                    <button onClick={() => handleDelete(shift.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-5 w-5" /></button>
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
              <h3 className="text-xl font-semibold">{editingShift ? 'Edit Shift' : 'Add New Shift'}</h3>
              <button onClick={() => { setIsModalOpen(false); setError(null); }}><X className="h-6 w-6 text-gray-500 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="staffId" className="block text-sm font-medium text-gray-700">Staff Member</label>
                <select name="staffId" id="staffId" value={(formData as CreateShiftDto).staffId || (formData as UpdateShiftDto & {staffId: string}).staffId} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" disabled={!!editingShift}>
                  <option value="" disabled>Select Staff Member</option>
                  {staffListForDropdown.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name} {staff.surname} ({staff.tag_nickname})</option>
                  ))}
                </select>
                 {editingShift && <p className="text-xs text-gray-500 mt-1">Staff member cannot be changed for an existing shift.</p>}
              </div>
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                <input type="datetime-local" name="startTime" id="startTime" value={(formData as CreateShiftDto | UpdateShiftDto).startTime} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time</label>
                <input type="datetime-local" name="endTime" id="endTime" value={(formData as CreateShiftDto | UpdateShiftDto).endTime} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">Shift Type</label>
                <select name="type" id="type" value={formData.type} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                  {SHIFT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <select name="status" id="status" value={formData.status} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                  {SHIFT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea name="notes" id="notes" value={(formData as CreateShiftDto | UpdateShiftDto).notes || ""} onChange={handleInputChange} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"></textarea>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setError(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingShift ? 'Save Changes' : 'Add Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isAiChatOpen && <AiChatWindow onClose={toggleAiChat} onUpdate={fetchShifts} entityName="Shift" />}
    </div>
  );
};

export default ShiftsComponent;
