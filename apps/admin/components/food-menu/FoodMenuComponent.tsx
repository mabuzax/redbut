/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback, useRef, ChangeEvent } from "react";
import {
  ArrowLeft,
  Loader2,
  Edit3, 
  Trash2,
  PlusCircle,
  UploadCloud,
  UtensilsCrossed, // For empty state
  X // For closing modal
} from "lucide-react";
import {
  adminApi,
  MenuItem,
  CreateMenuItemDto, // Using original names as no conflict in this file
  UpdateMenuItemDto, // Using original names as no conflict in this file
  MenuItemsResponse,
  MenuFilters
} from "../../lib/api"; // Adjusted import path
import * as XLSX from 'xlsx';

export interface FoodMenuComponentProps {
  onBack: () => void;
}

const FoodMenuComponent = ({ onBack }: FoodMenuComponentProps) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("redbutToken") || "" : "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  const initialFormData: CreateMenuItemDto = {
    name: "",
    category: "",
    description: "",
    price: 0,
    image: "",
    status: "Active",
    video: "",
    served_info: "",
    available_options: [],
    available_extras: [],
  };
  const [formData, setFormData] = useState<CreateMenuItemDto>(initialFormData);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const availableOptionsList = ["vegetarian", "vegan", "peri_peri", "gluten_free", "spicy"];

  const fetchData = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const filters: MenuFilters = {
        category: categoryFilter === "all" ? undefined : categoryFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchTerm || undefined,
      };
      const [itemsResponse, catsResponse] = await Promise.all([
        adminApi.getMenuItems(token, filters),
        adminApi.getMenuCategories(token),
      ]);
      setMenuItems(itemsResponse.items);
      setCategories(["all", ...catsResponse]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, categoryFilter, statusFilter, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) || 0 : value }));
  };

  const handleCheckboxChange = (option: string) => {
    setFormData(prev => {
      const currentOptions = Array.isArray(prev.available_options) ? prev.available_options : [];
      const newOptions = currentOptions.includes(option)
        ? currentOptions.filter(item => item !== option)
        : [...currentOptions, option];
      return { ...prev, available_options: newOptions };
    });
  };
  
  const handleExtrasChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    try {
      const extrasArray = JSON.parse(value);
      if (Array.isArray(extrasArray) && extrasArray.every(item => typeof item === 'string')) {
        setFormData(prev => ({ ...prev, available_extras: extrasArray }));
      } else {
        setFormData(prev => ({ ...prev, available_extras: value.split(',').map(s => s.trim()).filter(Boolean) }));
      }
    } catch (error) {
       setFormData(prev => ({ ...prev, available_extras: value.split(',').map(s => s.trim()).filter(Boolean) }));
    }
  };


  const resetForm = () => {
    setFormData(initialFormData);
    setEditingItem(null);
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || "",
      description: item.description || "",
      price: Number(item.price),
      image: item.image || "",
      status: item.status || "Active",
      video: item.video || "",
      served_info: item.served_info || "",
      available_options: Array.isArray(item.available_options) ? item.available_options : [],
      available_extras: Array.isArray(item.available_extras) ? item.available_extras : (typeof item.available_extras === 'string' ? item.available_extras.split(',').map(s => s.trim()) : []),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this menu item?")) {
      if (!token) { setError("Authentication token not found."); return; }
      try {
        await adminApi.deleteMenuItem(token, id);
        fetchData(); 
      } catch (e: any) {
        setError(`Failed to delete item: ${e.message}`);
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
    try {
      if (editingItem) {
        await adminApi.updateMenuItem(token, editingItem.id, formData as UpdateMenuItemDto);
      } else {
        await adminApi.createMenuItem(token, formData as CreateMenuItemDto);
      }
      setIsModalOpen(false);
      fetchData(); 
    } catch (e: any) {
      setError(`Failed to save menu item: ${e.message}`);
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Failed to read file");
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const processedItems = json.map(row => ({
          name: row.Name || row.name || row.ItemName,
          category: row.Category || row.category,
          description: row.Description || row.description,
          price: parseFloat(row.Price || row.price || '0'),
          image: row.Image || row.image || row.ImageURL,
          status: row.Status || row.status || 'Active',
          video: row.Video || row.video || row.VideoURL,
          served_info: row.ServedInfo || row.served_info || row.Served_Info,
          available_options: row.AvailableOptions || row.available_options || row.Available_Options,
          available_extras: row.AvailableExtras || row.available_extras || row.Available_Extras,
        })).filter(item => item.name && !isNaN(item.price));

        if (processedItems.length === 0) {
          throw new Error("No valid menu items found in the file. Ensure columns like 'Name' and 'Price' are present.");
        }
        
        const result = await adminApi.bulkUploadMenuItems(token, processedItems);
        alert(`Upload complete: ${result.created} items created, ${result.failed} failed.`);
        fetchData(); 
      } catch (err: any) {
        setUploadError(`Failed to process file: ${err.message}`);
        console.error(err);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; 
        }
      }
    };
    reader.readAsBinaryString(file);
  };
  
  return (
    <div>
      <button onClick={onBack} className="mb-6 inline-flex items-center text-primary-600 hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </button>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Food Menu Management</h2>
        <div className="flex space-x-2">
          <button onClick={handleAddNew} className="btn-primary">
            <PlusCircle className="h-4 w-4 mr-2" /> Add New Item
          </button>
          <label className="btn-primary cursor-pointer">
            <UploadCloud className="h-4 w-4 mr-2" /> Upload XLSX
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
          </label>
        </div>
      </div>

      {uploading && <div className="mb-4 p-2 bg-blue-100 text-blue-700 rounded-md">Uploading and processing file... <Loader2 className="inline h-4 w-4 animate-spin ml-2"/></div>}
      {uploadError && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md">Error: {uploadError}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-md p-2 w-full"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-md p-2 w-full"
        >
          {categories.map(cat => <option key={cat} value={cat}>{cat === "all" ? "All Categories" : cat}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md p-2 w-full"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
      ) : error && !isModalOpen ? (
        <p className="text-red-500 text-center">{error}</p>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-10">
          <UtensilsCrossed className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No menu items found. Try adjusting filters or add new items.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Options</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {menuItems.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className={`text-xs px-2 inline-flex leading-5 font-semibold rounded-full ${item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">{item.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Number(item.price).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Array.isArray(item.available_options) ? item.available_options.join(', ') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(item)} className="text-primary-600 hover:text-primary-900"><Edit3 className="h-5 w-5" /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-5 w-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
              <button onClick={() => { setIsModalOpen(false); setError(null); } }><X className="h-6 w-6 text-gray-500 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <input type="text" name="category" id="category" value={formData.category} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"></textarea>
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                <input type="number" name="price" id="price" value={formData.price} onChange={handleInputChange} required step="0.01" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700">Image URL</label>
                <input type="url" name="image" id="image" value={formData.image} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="video" className="block text-sm font-medium text-gray-700">Video URL</label>
                <input type="url" name="video" id="video" value={formData.video} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <select name="status" id="status" value={formData.status} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label htmlFor="served_info" className="block text-sm font-medium text-gray-700">Serving Info</label>
                <input type="text" name="served_info" id="served_info" value={formData.served_info} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Available Options</label>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableOptionsList.map(option => (
                    <label key={option} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                        checked={(Array.isArray(formData.available_options) ? formData.available_options : []).includes(option)}
                        onChange={() => handleCheckboxChange(option)}
                      />
                      <span className="ml-2 text-sm text-gray-600 capitalize">{option.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="available_extras" className="block text-sm font-medium text-gray-700">Available Extras (comma-separated or JSON array)</label>
                <textarea 
                  name="available_extras" 
                  id="available_extras" 
                  value={Array.isArray(formData.available_extras) ? formData.available_extras.join(', ') : (formData.available_extras || '')} 
                  onChange={handleExtrasChange} 
                  rows={2} 
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder='e.g., extra cheese, spicy sauce, no onions'
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setError(null); } } className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodMenuComponent;
