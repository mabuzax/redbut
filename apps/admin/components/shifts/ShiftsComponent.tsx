/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useCallback, FormEvent, ChangeEvent } from "react";
import {
  ArrowLeft,
  Loader2,
  Edit3,
  Trash2,
  PlusCircle,
  Sparkles,
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import {
  adminApi,
  Shift,
  CreateShiftDto,
  UpdateShiftDto,
} from "../../lib/api";
import AiChatWindow from "./AiChatWindow";

export interface ShiftsComponentProps {
  onBack: () => void;
}

const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const ShiftsComponent = ({ onBack }: ShiftsComponentProps) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("redbutToken") || "" : "";

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [newShiftStartTime, setNewShiftStartTime] = useState("09:00");
  const [newShiftEndTime, setNewShiftEndTime] = useState("17:00");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editFormData, setEditFormData] = useState<{ startTime: string; endTime: string }>({ startTime: "", endTime: "" });

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

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handlePrevMonth = () => {
    setCurrentDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(currentDisplayMonth.getFullYear(), currentDisplayMonth.getMonth(), day));
  };

  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days: (Date | null)[] = [];
    const firstDayOfWeek = date.getDay();

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const calendarDays = getDaysInMonth(currentDisplayMonth.getFullYear(), currentDisplayMonth.getMonth());

  const combineDateAndTime = (date: Date, timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate.toISOString();
  };

  const handleCreateShift = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Authentication token not found.");
      return;
    }
    setError(null);
    try {
      const createDto: CreateShiftDto = {
        startTime: combineDateAndTime(selectedDate, newShiftStartTime),
        endTime: combineDateAndTime(selectedDate, newShiftEndTime),
      };
      await adminApi.createShift(token, createDto);
      fetchShifts();
    } catch (e: any) {
      setError(`Failed to create shift: ${e.message}`);
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setEditFormData({
      startTime: new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      endTime: new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    });
    setIsEditModalOpen(true);
  };
  
  const handleUpdateShift = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editingShift) {
      setError("Authentication token or shift data missing.");
      return;
    }
    setError(null);
    try {
      const originalShiftDate = new Date(editingShift.date); // Use the 'date' field of the shift
      const updateDto: UpdateShiftDto = {
        startTime: combineDateAndTime(originalShiftDate, editFormData.startTime),
        endTime: combineDateAndTime(originalShiftDate, editFormData.endTime),
      };
      await adminApi.updateShift(token, editingShift.id, updateDto);
      setIsEditModalOpen(false);
      setEditingShift(null);
      fetchShifts();
    } catch (e: any) {
      setError(`Failed to update shift: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this shift?")) {
      if (!token) { setError("Authentication token not found."); return; }
      try {
        await adminApi.deleteShift(token, id);
        fetchShifts();
      } catch (e: any) {
        setError(`Failed to delete shift: ${e.message}`);
      }
    }
  };

  const toggleAiChat = () => setIsAiChatOpen(prev => !prev);

  const formatDateForDisplay = (isoString: string) => new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const formatTimeForDisplay = (isoString: string) => new Date(isoString).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div>
      <button onClick={onBack} className="mb-6 inline-flex items-center text-primary-600 hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </button>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Shift</h2>
        <button
          onClick={toggleAiChat}
          className="btn-primary flex items-center"
          style={{ backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }}
        >
          <Sparkles className="h-4 w-4 mr-2" /> Use AI
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Calendar */}
          <div className="w-full md:w-1/2 lg:w-2/5 border border-gray-200 p-4 rounded-md">
            <div className="flex items-center justify-between mb-4">
              <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft className="h-5 w-5 text-gray-600" /></button>
              <h3 className="font-semibold text-gray-700">
                {currentDisplayMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight className="h-5 w-5 text-gray-600" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {daysOfWeek.map(day => <div key={day} className="font-medium text-gray-500">{day}</div>)}
              {calendarDays.map((date, index) => (
                <button
                  key={index}
                  onClick={() => date && handleDateClick(date.getDate())}
                  disabled={!date}
                  className={`p-2 rounded-full w-10 h-10 mx-auto flex items-center justify-center
                    ${!date ? 'cursor-default' : 'hover:bg-primary-100'}
                    ${date && selectedDate.toDateString() === date.toDateString() ? 'bg-primary-500 text-white hover:bg-primary-600' : ''}
                    ${date && new Date().toDateString() === date.toDateString() && selectedDate.toDateString() !== date.toDateString() ? 'text-primary-600 font-bold' : ''}
                  `}
                >
                  {date ? date.getDate() : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="w-full md:w-1/2 lg:w-3/5">
            <form onSubmit={handleCreateShift} className="space-y-4">
              <div>
                <label htmlFor="newShiftStartTime" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <div className="relative">
                  <input
                    type="time"
                    id="newShiftStartTime"
                    value={newShiftStartTime}
                    onChange={(e) => setNewShiftStartTime(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm pl-10"
                  />
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div>
                <label htmlFor="newShiftEndTime" className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                 <div className="relative">
                  <input
                    type="time"
                    id="newShiftEndTime"
                    value={newShiftEndTime}
                    onChange={(e) => setNewShiftEndTime(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm pl-10"
                  />
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                Create Shift
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {error && !isEditModalOpen && <p className="text-red-500 text-center mb-4">{error}</p>}

      {/* Shifts Table */}
      <h3 className="text-xl font-bold text-gray-900 mb-4">Scheduled Shifts</h3>
      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
      ) : shifts.length === 0 && !error ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <CalendarDays className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No shifts scheduled yet. Create one above!</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shifts.map(shift => (
                <tr key={shift.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateForDisplay(shift.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTimeForDisplay(shift.startTime)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTimeForDisplay(shift.endTime)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(shift)} className="text-primary-600 hover:text-primary-900 p-1"><Edit3 className="h-5 w-5" /></button>
                    <button onClick={() => handleDelete(shift.id)} className="text-red-600 hover:text-red-900 p-1"><Trash2 className="h-5 w-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingShift && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Edit Shift for {formatDateForDisplay(editingShift.date)}</h3>
              <button onClick={() => { setIsEditModalOpen(false); setError(null); }}><X className="h-6 w-6 text-gray-500 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={handleUpdateShift} className="space-y-4">
              <div>
                <label htmlFor="editShiftStartTime" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  id="editShiftStartTime"
                  value={editFormData.startTime}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="editShiftEndTime" className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  id="editShiftEndTime"
                  value={editFormData.endTime}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setIsEditModalOpen(false); setError(null); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
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
