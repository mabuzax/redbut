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
  Search,
  ChevronDown,
  CheckSquare,
  Square,
  LayoutGrid, // Icon for Table Allocations
} from "lucide-react";
import {
  adminApi,
  TableAllocationWithDetails,
  CreateTableAllocationDto,
  UpdateTableAllocationDto,
  ShiftForDropdown,
  WaiterForDropdown,
  Shift,
  StaffMember,
} from "../../lib/api";
import AiChatWindow from "./AiChatWindow"; // Assuming a generic AiChatWindow in this directory

export interface TableAllocationsComponentProps {
  onBack: () => void;
}

const TableAllocationsComponent = ({ onBack }: TableAllocationsComponentProps) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("redbutToken") || "" : "";

  const [allocations, setAllocations] = useState<TableAllocationWithDetails[]>([]);
  const [shiftsForDropdown, setShiftsForDropdown] = useState<ShiftForDropdown[]>([]);
  const [waitersForDropdown, setWaitersForDropdown] = useState<WaiterForDropdown[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [selectedTableNumbers, setSelectedTableNumbers] = useState<number[]>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<TableAllocationWithDetails | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateTableAllocationDto>({});
  
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isTablesDropdownOpen, setIsTablesDropdownOpen] = useState(false);

  const tableNumbersOptions = Array.from({ length: 50 }, (_, i) => i + 1);

  const formatShiftForDropdown = (shift: Shift): ShiftForDropdown => {
    const date = new Date(shift.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const startTime = new Date(shift.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    const endTime = new Date(shift.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return {
      id: shift.id,
      displayLabel: `${date} (${startTime} to ${endTime})`,
    };
  };

  const formatWaiterForDropdown = (waiter: StaffMember): WaiterForDropdown => {
    return {
      id: waiter.id,
      displayLabel: `${waiter.name} ${waiter.surname} (${waiter.tag_nickname})`,
    };
  };

  const fetchData = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [allocsData, shiftsData, waitersData] = await Promise.all([
        adminApi.getAllTableAllocations(token),
        adminApi.getAllShifts(token),
        adminApi.getAllStaffMembers(token),
      ]);
      setAllocations(allocsData);
      setShiftsForDropdown(shiftsData.map(formatShiftForDropdown));
      setWaitersForDropdown(waitersData.map(formatWaiterForDropdown));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTableNumberToggle = (tableNum: number) => {
    setSelectedTableNumbers(prev =>
      prev.includes(tableNum) ? prev.filter(n => n !== tableNum) : [...prev, tableNum]
    );
  };
  
  const handleEditTableNumberToggle = (tableNum: number) => {
    setEditFormData(prev => {
      const currentTables = prev.tableNumbers || editingAllocation?.tableNumbers || [];
      const newTables = currentTables.includes(tableNum)
        ? currentTables.filter(n => n !== tableNum)
        : [...currentTables, tableNum];
      return { ...prev, tableNumbers: newTables.sort((a,b) => a-b) };
    });
  };


  const handleCreateAllocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !selectedShiftId || selectedTableNumbers.length === 0 || !selectedWaiterId) {
      setError("Shift, at least one table, and waiter must be selected.");
      return;
    }
    setError(null);
    try {
      const createDto: CreateTableAllocationDto = {
        shiftId: selectedShiftId,
        tableNumbers: selectedTableNumbers,
        waiterId: selectedWaiterId,
      };
      await adminApi.createTableAllocation(token, createDto);
      setSelectedShiftId("");
      setSelectedTableNumbers([]);
      setSelectedWaiterId("");
      fetchData();
    } catch (e: any) {
      setError(`Failed to create allocation: ${e.message}`);
    }
  };

  const handleEdit = (allocation: TableAllocationWithDetails) => {
    setEditingAllocation(allocation);
    setEditFormData({
      shiftId: allocation.shiftId,
      tableNumbers: [...allocation.tableNumbers],
      waiterId: allocation.waiterId,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAllocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editingAllocation || !editFormData.shiftId || !editFormData.waiterId || !editFormData.tableNumbers || editFormData.tableNumbers.length === 0) {
      setError("Shift, waiter, and at least one table are required for update.");
      return;
    }
    setError(null);
    try {
      await adminApi.updateTableAllocation(token, editingAllocation.id, editFormData);
      setIsEditModalOpen(false);
      setEditingAllocation(null);
      fetchData();
    } catch (e: any) {
      setError(`Failed to update allocation: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this table allocation?")) {
      if (!token) { setError("Authentication token not found."); return; }
      try {
        await adminApi.deleteTableAllocation(token, id);
        fetchData();
      } catch (e: any) {
        setError(`Failed to delete allocation: ${e.message}`);
      }
    }
  };
  
  const toggleAiChat = () => setIsAiChatOpen(prev => !prev);

  const filteredAllocations = allocations.filter(alloc => {
    const shiftLabel = alloc.shift ? `${new Date(alloc.shift.date).toLocaleDateString()}` : '';
    const waiterLabel = alloc.waiter ? `${alloc.waiter.name} ${alloc.waiter.surname} (${alloc.waiter.tag_nickname})` : '';
    const tableNumbersString = alloc.tableNumbers.join(", ");
    
    return (
      shiftLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      waiterLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tableNumbersString.includes(searchTerm.toLowerCase())
    );
  });

  const displayAllocations = filteredAllocations.flatMap(alloc => 
    alloc.tableNumbers.map(tableNum => ({
      ...alloc,
      displayTableNumber: tableNum,
      uniqueRowKey: `${alloc.id}-${tableNum}`
    }))
  );

  return (
    <div>
      <button onClick={onBack} className="mb-6 inline-flex items-center text-primary-600 hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </button>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Table Allocations</h2>
        <button
          onClick={toggleAiChat}
          className="btn-primary flex items-center"
          style={{ backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }}
        >
          <Sparkles className="h-4 w-4 mr-2" /> Use AI
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Create Allocation</h3>
        <form onSubmit={handleCreateAllocation} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="shiftId" className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
            <select
              id="shiftId"
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="" disabled>Select shift</option>
              {shiftsForDropdown.map(shift => (
                <option key={shift.id} value={shift.id}>{shift.displayLabel}</option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <label htmlFor="tableNumbers" className="block text-sm font-medium text-gray-700 mb-1">Tables</label>
            <button 
              type="button"
              onClick={() => setIsTablesDropdownOpen(prev => !prev)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-left flex justify-between items-center"
            >
              <span className={selectedTableNumbers.length > 0 ? "text-gray-900" : "text-gray-500"}>
                {selectedTableNumbers.length > 0 ? `Selected (${selectedTableNumbers.length})` : "Select tables"}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isTablesDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isTablesDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {tableNumbersOptions.map(num => (
                  <label key={num} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTableNumbers.includes(num)}
                      onChange={() => handleTableNumberToggle(num)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Table {num}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="waiterId" className="block text-sm font-medium text-gray-700 mb-1">Waiter</label>
            <select
              id="waiterId"
              value={selectedWaiterId}
              onChange={(e) => setSelectedWaiterId(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="" disabled>Select waiter</option>
              {waitersForDropdown.map(waiter => (
                <option key={waiter.id} value={waiter.id}>{waiter.displayLabel}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <button type="submit" className="btn-primary w-full md:w-auto">
              Allocate Tables
            </button>
          </div>
        </form>
      </div>
      
      {error && !isEditModalOpen && <p className="text-red-500 text-center mb-4">{error}</p>}

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search allocations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
      ) : displayAllocations.length === 0 && !error ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <LayoutGrid className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No table allocations found. Create one above!</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table #</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waiter</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayAllocations.map(alloc => (
                <tr key={alloc.uniqueRowKey}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Table {alloc.displayTableNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {alloc.waiter ? `${alloc.waiter.name} ${alloc.waiter.surname} (${alloc.waiter.tag_nickname})` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {alloc.shift ? new Date(alloc.shift.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {alloc.shift ? `${new Date(alloc.shift.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })} - ${new Date(alloc.shift.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(allocations.find(a => a.id === alloc.id)!)} className="text-primary-600 hover:text-primary-900 p-1"><Edit3 className="h-5 w-5" /></button>
                    <button onClick={() => handleDelete(alloc.id)} className="text-red-600 hover:text-red-900 p-1"><Trash2 className="h-5 w-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isEditModalOpen && editingAllocation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Edit Table Allocation</h3>
              <button onClick={() => { setIsEditModalOpen(false); setError(null); }}><X className="h-6 w-6 text-gray-500 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={handleUpdateAllocation} className="space-y-4">
              <div>
                <label htmlFor="editShiftId" className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                <select
                  id="editShiftId"
                  value={editFormData.shiftId || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, shiftId: e.target.value }))}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="" disabled>Select shift</option>
                  {shiftsForDropdown.map(shift => (
                    <option key={shift.id} value={shift.id}>{shift.displayLabel}</option>
                  ))}
                </select>
              </div>
              
              <div className="relative">
                <label htmlFor="editTableNumbers" className="block text-sm font-medium text-gray-700 mb-1">Tables</label>
                <button 
                  type="button"
                  onClick={() => setIsTablesDropdownOpen(prev => !prev)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-left flex justify-between items-center"
                >
                   <span className={(editFormData.tableNumbers && editFormData.tableNumbers.length > 0) ? "text-gray-900" : "text-gray-500"}>
                    {(editFormData.tableNumbers && editFormData.tableNumbers.length > 0) ? `Selected (${editFormData.tableNumbers.length})` : "Select tables"}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isTablesDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isTablesDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {tableNumbersOptions.map(num => (
                      <label key={num} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(editFormData.tableNumbers || []).includes(num)}
                          onChange={() => handleEditTableNumberToggle(num)}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Table {num}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="editWaiterId" className="block text-sm font-medium text-gray-700 mb-1">Waiter</label>
                <select
                  id="editWaiterId"
                  value={editFormData.waiterId || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, waiterId: e.target.value }))}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="" disabled>Select waiter</option>
                  {waitersForDropdown.map(waiter => (
                    <option key={waiter.id} value={waiter.id}>{waiter.displayLabel}</option>
                  ))}
                </select>
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
      
      {isAiChatOpen && <AiChatWindow onClose={toggleAiChat} onUpdate={fetchData} entityName="Table Allocation" />}
    </div>
  );
};

export default TableAllocationsComponent;
