/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback, useRef, ChangeEvent } from "react";
import {
  User,
  BrainCircuit,
  BarChart2,
  MessageSquare,
  ShoppingCart,
  Star,
  UtensilsCrossed,
  Users,
  CalendarClock,
  Table2,
  Settings,
  ArrowLeft,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Filter as FilterIcon, // Renamed to avoid conflict with array.filter
  Eye,
  RefreshCw,
  X,
  Loader2,
  Edit3, 
  Trash2,
  PlusCircle,
  UploadCloud,
  type LucideIcon
} from "lucide-react";
import LoginForm from "../components/auth/LoginForm";
import TimeAgo from "react-timeago";
import {
  adminApi,
  AdminRequestSummary,
  RequestFilters,
  RequestSummary,
  ResolutionBucket, 
  BusiestTime,
  PeakTimeRequests,
  WaiterPerformance,
  MenuItem,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  MenuItemsResponse,
  MenuFilters
} from "../lib/api";
import * as XLSX from 'xlsx';

// Moved Section type definition here to be accessible by GridProps
type Section =
  | "AI Analysis"
  | "Analytics"
  | "Requests"
  | "Orders"
  | "Ratings"
  | "Food Menu"
  | "Staff"
  | "Shifts"
  | "Table Allocations"
  | "Owner Dashboard";

export default function AdminDashboard() {
  type Stage = "splash" | "login" | "dashboard";

  const [stage, setStage] = useState<Stage>("splash");
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage("login");
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkSession = () => {
      const existingSession = localStorage.getItem("redbutAdminSession");
      if (existingSession) {
        try {
          const data = JSON.parse(existingSession);
          setUserData(data);
          setStage("dashboard");
        } catch (e) {
          console.error("Failed to parse session data", e);
          localStorage.removeItem("redbutAdminSession");
          setStage("login");
        }
      } else {
        setStage("login"); 
      }
    };
    
    if (stage === "login" || stage === "splash") { 
      checkSession();
    }
  }, [stage]);

  const handleLoginSuccess = (data: any) => {
    localStorage.setItem("redbutAdminSession", JSON.stringify(data));
    localStorage.setItem("redbutToken", data.token);
    setUserData(data);
    setStage("dashboard");
  };

  if (stage === "splash") {
    return (
      <div className="splash-container">
        <div className="splash-text">RedBut Admin</div>
      </div>
    );
  }

  if (stage === "login") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">RedBut Admin</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">{userData?.name || "Admin User"}</span>
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
              <User className="h-5 w-5" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedSection === null ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>
            <DashboardGrid onSelect={setSelectedSection} />
          </>
        ) : selectedSection === "Requests" ? (
          <RequestsComponent onBack={() => setSelectedSection(null)} />
        ) : selectedSection === "Food Menu" ? (
          <FoodMenuComponent onBack={() => setSelectedSection(null)} />
        ) : (
          <SectionPlaceholder
            section={selectedSection}
            onBack={() => setSelectedSection(null)}
          />
        )}
      </main>
    </div>
  );
}

interface GridProps {
  onSelect: (s: Section) => void;
}

const DashboardGrid = ({ onSelect }: GridProps) => {
  const items: { key: Section; label: string; icon: LucideIcon }[] = [
    { key: "AI Analysis", label: "AI Analysis", icon: BrainCircuit },
    { key: "Analytics", label: "Analytics", icon: BarChart2 },
    { key: "Requests", label: "Requests", icon: MessageSquare },
    { key: "Orders", label: "Orders", icon: ShoppingCart },
    { key: "Ratings", label: "Ratings", icon: Star },
    { key: "Food Menu", label: "Food Menu", icon: UtensilsCrossed },
    { key: "Staff", label: "Staff", icon: Users },
    { key: "Shifts", label: "Shifts", icon: CalendarClock },
    { key: "Table Allocations", label: "Table Allocations", icon: Table2 },
    { key: "Owner Dashboard", label: "Owner Dashboard", icon: Settings },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className="bg-white border border-gray-200 rounded-lg py-8 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
        >
          <Icon className="h-8 w-8 text-primary-500 mb-2" />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </button>
      ))}
    </div>
  );
};

interface SectionProps {
  section: string;
  onBack: () => void;
}

const SectionPlaceholder = ({ section, onBack }: SectionProps) => (
  <div className="bg-white border border-gray-200 rounded-lg p-8">
    <button
      onClick={onBack}
      className="mb-6 inline-flex items-center text-primary-600 hover:underline"
    >
      <ArrowLeft className="h-4 w-4 mr-1" /> Back
    </button>
    <h3 className="text-xl font-semibold text-gray-900">{section}</h3>
    <p className="text-gray-500 mt-2">This section is under construction.</p>
  </div>
);

interface FoodMenuComponentProps {
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
      // Attempt to parse as JSON array of strings, otherwise store as comma-separated string
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
      try {
        await adminApi.deleteMenuItem(token, id);
        fetchData(); // Refresh list
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
    try {
      if (editingItem) {
        await adminApi.updateMenuItem(token, editingItem.id, formData);
      } else {
        await adminApi.createMenuItem(token, formData);
      }
      setIsModalOpen(false);
      fetchData(); // Refresh list
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
        fetchData(); // Refresh list
      } catch (err: any) {
        setUploadError(`Failed to process file: ${err.message}`);
        console.error(err);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
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

      {/* Filters */}
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

      {/* Menu Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
      ) : error ? (
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="h-6 w-6 text-gray-500 hover:text-gray-700" /></button>
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
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
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

interface RequestsComponentProps {
  onBack: () => void;
}

const RequestsComponent = ({ onBack }: RequestsComponentProps) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("redbutToken") || "" : "";
  const todayISO = new Date().toISOString().split("T")[0];

  const [viewMode, setViewMode] = useState<"dashboard" | "wall">("dashboard");

  const [summary, setSummary] = useState<{ open: number; closed: number; avgResolutionTime: number } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);

  const [selectedDateLineChart, setSelectedDateLineChart] = useState<string>(todayISO);
  const [hourlyData, setHourlyData] = useState<AdminRequestSummary | null>(null);
  const [loadingHourly, setLoadingHourly] = useState(false);
  const [errorHourly, setErrorHourly] = useState<string | null>(null);

  const [resolutionDateFilter, setResolutionDateFilter] = useState<string>(todayISO);
  const [resolutionData, setResolutionData] = useState<ResolutionBucket[] | null>(null);
  const [loadingResolution, setLoadingResolution] = useState(false);
  const [errorResolution, setErrorResolution] = useState<string | null>(null);
  
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"createdAt" | "status" | "tableNumber">("createdAt");

  const [insightsDateFilter, setInsightsDateFilter] = useState<string>(todayISO);
  const [performanceDateFilter, setPerformanceDateFilter] = useState<string>(todayISO);

  // New states for Busiest Time, Peak Time Requests, and Waiter Performance
  const [busiestTimeData, setBusiestTimeData] = useState<BusiestTime | null>(null);
  const [loadingBusiestTime, setLoadingBusiestTime] = useState(false);
  const [errorBusiestTime, setErrorBusiestTime] = useState<string | null>(null);

  const [peakTimeRequestsData, setPeakTimeRequestsData] = useState<PeakTimeRequests | null>(null);
  const [loadingPeakTimeRequests, setLoadingPeakTimeRequests] = useState(false);
  const [errorPeakTimeRequests, setErrorPeakTimeRequests] = useState<string | null>(null);
  
  const [waiterPerformanceData, setWaiterPerformanceData] = useState<WaiterPerformance[] | null>(null);
  const [loadingWaiterPerformance, setLoadingWaiterPerformance] = useState(false);
  const [errorWaiterPerformance, setErrorWaiterPerformance] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadingSummary(false);
      setErrorSummary("Authentication token not found.");
      return;
    }
    let isMounted = true;
    setLoadingSummary(true);
    setErrorSummary(null);
    adminApi.getRequestsSummary(token)
      .then((data) => { if (isMounted) setSummary(data); })
      .catch((e) => { if (isMounted) setErrorSummary(e.message); console.error("Error fetching summary:", e); })
      .finally(() => { if (isMounted) setLoadingSummary(false); });
    return () => { isMounted = false; };
  }, [token]);

  useEffect(() => {
    if (!token || !selectedDateLineChart) {
      setLoadingHourly(false);
      setErrorHourly(!token ? "Authentication token not found." : "No date selected for hourly chart.");
      return;
    }
    setLoadingHourly(true);
    setErrorHourly(null);
    adminApi
      .getHourlyRequestAnalytics(token, selectedDateLineChart)
      .then((d) => setHourlyData(d))
      .catch((e) => setErrorHourly(e.message))
      .finally(() => setLoadingHourly(false));
  }, [token, selectedDateLineChart]);

  useEffect(() => {
    if (!token || !resolutionDateFilter) {
      setLoadingResolution(false);
      setErrorResolution(!token ? "Authentication token not found." : "No date selected for resolution chart.");
      return;
    }
    setLoadingResolution(true);
    setErrorResolution(null);
    adminApi
      .getRequestsResolutionAnalytics(token, resolutionDateFilter)
      .then((data) => setResolutionData(data))
      .catch((e) => setErrorResolution(e.message))
      .finally(() => setLoadingResolution(false));
  }, [token, resolutionDateFilter]);

  // Fetch Busiest Time and Peak Time Requests data
  useEffect(() => {
    if (!token || !insightsDateFilter) {
      setErrorBusiestTime(!token ? "Authentication token not found." : "No date selected.");
      setErrorPeakTimeRequests(!token ? "Authentication token not found." : "No date selected.");
      return;
    }
    setLoadingBusiestTime(true);
    setErrorBusiestTime(null);
    adminApi.getBusiestTime(token, insightsDateFilter)
      .then(setBusiestTimeData)
      .catch(e => setErrorBusiestTime(e.message))
      .finally(() => setLoadingBusiestTime(false));

    setLoadingPeakTimeRequests(true);
    setErrorPeakTimeRequests(null);
    adminApi.getPeakTimeRequests(token, insightsDateFilter)
      .then(setPeakTimeRequestsData)
      .catch(e => setErrorPeakTimeRequests(e.message))
      .finally(() => setLoadingPeakTimeRequests(false));
  }, [token, insightsDateFilter]);

  // Fetch Waiter Performance data
  useEffect(() => {
    if (!token || !performanceDateFilter) {
      setErrorWaiterPerformance(!token ? "Authentication token not found." : "No date selected.");
      return;
    }
    setLoadingWaiterPerformance(true);
    setErrorWaiterPerformance(null);
    adminApi.getWaiterPerformanceAnalytics(token, performanceDateFilter)
      .then(setWaiterPerformanceData)
      .catch(e => setErrorWaiterPerformance(e.message))
      .finally(() => setLoadingWaiterPerformance(false));
  }, [token, performanceDateFilter]);

  const fetchList = useCallback(async () => {
    if (!token) {
      setLoadingList(false);
      setErrorList("Authentication token not found.");
      return;
    }
    setLoadingList(true);
    setErrorList(null);
    const filters: RequestFilters = {
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchTerm || undefined,
      sort: sortOrder,
    };
    try {
      const data = await adminApi.getAllRequests(token, filters);
      setRequests(data);
    } catch (e: any) {
      setErrorList(e.message);
    } finally {
      setLoadingList(false);
    }
  }, [token, statusFilter, searchTerm, sortOrder]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-200 text-blue-600';
      case 'Acknowledged': return 'bg-yellow-200 text-yellow-600';
      case 'InProgress': return 'bg-purple-200 text-purple-600';
      case 'Completed': return 'bg-green-200 text-green-600';
      case 'Done': return 'bg-green-200 text-green-600';
      case 'Cancelled': return 'bg-red-200 text-red-600';
      case 'OnHold': return 'bg-orange-200 text-orange-600';
      default: return 'bg-gray-200 text-gray-600';
    }
  };

  const dateOptions = Array.from({ length: 31 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const iso = date.toISOString().split("T")[0];
    const label =
      i === 0
        ? "Today"
        : i === 1
        ? "Yesterday"
        : `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    return { value: iso, label: `${label} (${iso.substring(5)})` }; 
  });

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center text-primary-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </button>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Requests Management</h2>
      
      {viewMode === "dashboard" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-gray-900">Requests Summary</h3>
                <Eye className="h-5 w-5 text-primary-500" />
              </div>
              {loadingSummary ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : errorSummary ? (
                <p className="text-red-500 text-center">{errorSummary}</p>
              ) : summary ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-500 mr-3"><MessageSquare className="h-5 w-5" /></div>
                    <div><p className="text-sm text-gray-500">Open Requests</p><p className="text-xl font-bold text-gray-900">{summary.open}</p></div>
                  </div>
                  <div className="flex items-center">
                    <div className="p-2 bg-green-50 rounded-lg text-green-500 mr-3"><CheckCircle className="h-5 w-5" /></div>
                    <div><p className="text-sm text-gray-500">Closed Requests</p><p className="text-xl font-bold text-gray-900">{summary.closed}</p></div>
                  </div>
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-500 mr-3"><Clock className="h-5 w-5" /></div>
                    <div><p className="text-sm text-gray-500">Avg Resolution Time</p><p className="text-xl font-bold text-gray-900">{summary.avgResolutionTime} mins</p></div>
                  </div>
                </div>
              ) : <p className="text-gray-500 text-center">No summary data.</p>}
              <button onClick={() => setViewMode("wall")} className="mt-4 w-full py-2 bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition">
                View All Requests
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 col-span-1 md:col-span-2 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Open vs Closed Requests (Hourly)</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <select
                    value={selectedDateLineChart}
                    onChange={(e) => setSelectedDateLineChart(e.target.value)}
                    className="border-none text-sm text-gray-500 focus:ring-0 cursor-pointer bg-gray-50 rounded-md px-2 py-1"
                  >
                    {dateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="h-64 relative flex items-center justify-center">
                {loadingHourly ? (
                  <div className="flex items-center"><Loader2 className="h-5 w-5 animate-spin mr-2" /> <p>Loading chart…</p></div>
                ) : errorHourly ? (
                  <p className="text-red-600">{errorHourly}</p>
                ) : hourlyData && hourlyData.hourly.length > 0 ? (
                  <div className="w-full h-full relative">
                    <svg viewBox="0 0 620 200" className="w-full h-full">
                      <line x1="0" y1="180" x2="620" y2="180" stroke="#e5e7eb" />
                      {Array.from({length: 19}, (_,i) => 7+i).map(hour => {
                        const x = ((hour-7)/18)*600 + 10; 
                        return <text key={hour} x={x} y="195" className="text-xs fill-gray-500 text-center" dominantBaseline="middle" textAnchor="middle">{(hour % 24).toString().padStart(2,'0')}</text>
                      })}
                      {["open", "closed"].map((key) => {
                        const points = hourlyData.hourly
                          .filter(h => (h.hour >= 7 && h.hour <=23) || (h.hour >=0 && h.hour < 2)) 
                          .sort((a,b) => (a.hour < 7 ? a.hour + 24 : a.hour) - (b.hour < 7 ? b.hour + 24 : b.hour))
                          .map((h) => {
                            const hourAdjusted = h.hour < 7 ? h.hour + 24 : h.hour; 
                            const x = ((hourAdjusted - 7) / 18) * 600 + 10; 
                            const maxVal = Math.max(1, ...hourlyData.hourly.map(d => Math.max(d.open, d.closed)));
                            const y = 180 - ((h[key as "open" | "closed"] || 0) / maxVal) * 150;
                            return `${x},${y}`;
                          })
                          .join(" ");
                        return (
                          <polyline key={key} fill="none" stroke={key === "open" ? "#ef4444" : "#22c55e"} strokeWidth="2" points={points} />
                        );
                      })}
                    </svg>
                    <div className="absolute top-0 right-0 flex items-center space-x-4 bg-white p-1 rounded-md shadow">
                      <div className="flex items-center"><div className="w-3 h-3 bg-red-500 rounded-sm mr-1"></div><span className="text-xs text-gray-500">Open</span></div>
                      <div className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded-sm mr-1"></div><span className="text-xs text-gray-500">Closed</span></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No data available for selected date.</p>
                )}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Requests Resolution</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <select
                    value={resolutionDateFilter}
                    onChange={(e) => setResolutionDateFilter(e.target.value)}
                    className="border-none text-sm text-gray-500 focus:ring-0 cursor-pointer bg-gray-50 rounded-md px-2 py-1"
                  >
                    {dateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="h-48 flex items-end justify-around">
                {loadingResolution ? (
                  <div className="flex items-center justify-center w-full h-full"><Loader2 className="h-6 w-6 animate-spin" /> <p className="ml-2">Loading data...</p></div>
                ) : errorResolution ? (
                  <p className="text-red-500 text-center w-full">{errorResolution}</p>
                ) : resolutionData && resolutionData.length > 0 ? (
                  resolutionData.map((item, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-16 bg-primary-500 rounded-t-sm" style={{ height: `${Math.max(5, item.count * 8)}px` }} title={`Count: ${item.count}`}></div>
                      <p className="text-xs text-gray-500 mt-2">{item.range}</p>
                      <p className="text-sm font-medium">{item.count}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center w-full">No resolution data for selected date.</p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center"><div className="w-3 h-3 bg-primary-500 rounded-sm mr-1"></div><span className="text-xs text-gray-500">Number of requests</span></div>
              </div>
              {resolutionData && resolutionData.find(r => r.range === '>15mins' && r.count > 0) && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  <AlertTriangle className="h-4 w-4 inline-block mr-1 text-yellow-500" />
                  <span>{resolutionData.find(r => r.range === '>15mins')?.count} requests resolved in &gt;15 mins</span>
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Request Insights</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <select
                    value={insightsDateFilter}
                    onChange={(e) => setInsightsDateFilter(e.target.value)}
                    className="border-none text-sm text-gray-500 focus:ring-0 cursor-pointer bg-gray-50 rounded-md px-2 py-1"
                  >
                    {dateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center"> <TrendingUp className="h-5 w-5 text-green-500 mr-2" /> <span className="text-sm">Completion Rate</span></div>
                  <span className="font-medium">{summary ? Math.round((summary.closed / (summary.open + summary.closed || 1)) * 100) : 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center"> <Clock className="h-5 w-5 text-blue-500 mr-2" /> <span className="text-sm">Peak Request Time</span></div>
                  {loadingBusiestTime ? <Loader2 className="h-4 w-4 animate-spin" /> : errorBusiestTime ? <span className="text-xs text-red-500">Error</span> : <span className="font-medium">{busiestTimeData?.label || 'N/A'}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center"> <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" /> <span className="text-sm">Peak Time Total Requests</span></div>
                  {loadingPeakTimeRequests ? <Loader2 className="h-4 w-4 animate-spin" /> : errorPeakTimeRequests ? <span className="text-xs text-red-500">Error</span> : <span className="font-medium text-yellow-600">{peakTimeRequestsData?.totalRequests ?? 'N/A'}</span>}
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
               <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Waiter Performance</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <select
                    value={performanceDateFilter}
                    onChange={(e) => setPerformanceDateFilter(e.target.value)}
                    className="border-none text-sm text-gray-500 focus:ring-0 cursor-pointer bg-gray-50 rounded-md px-2 py-1"
                  >
                    {dateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              {loadingWaiterPerformance ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : errorWaiterPerformance ? (
                <p className="text-red-500 text-center">{errorWaiterPerformance}</p>
              ) : waiterPerformanceData && waiterPerformanceData.length > 0 ? (
                <div className="space-y-3">
                  {waiterPerformanceData.map((waiter, i) => (
                    <div key={waiter.waiterId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                          {waiter.waiterName.split(' ')[0][0]}{waiter.waiterName.split(' ')[1]?.[0] || ''}
                        </div>
                        <span>{waiter.waiterName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{waiter.requestsHandled} reqs</div>
                        <div className="text-xs text-gray-500">~{waiter.avgResolutionTime} mins avg</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center">No waiter performance data for selected date.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">All Requests</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setViewMode("dashboard")}
                className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard View
              </button>
              <button 
                onClick={fetchList}
                disabled={loadingList}
                className="inline-flex items-center justify-center px-4 py-2 font-medium text-gray-900 bg-gray-100 rounded-full hover:bg-gray-200 active:bg-gray-300 transition-all disabled:opacity-50"
              >
                {loadingList ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />} Refresh
              </button>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 mb-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 pl-8"
              />
              <FilterIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md p-2"
            >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Done">Done</option>
              <option value="Cancelled">Cancelled</option>
              <option value="OnHold">On Hold</option>
            </select>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "createdAt" | "status" | "tableNumber")}
              className="border border-gray-300 rounded-md p-2"
            >
              <option value="createdAt">Sort by Time</option>
              <option value="status">Sort by Status</option>
              <option value="tableNumber">Sort by Table</option>
            </select>
          </div>
          
          <div className="space-y-3 mt-4">
            {loadingList ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary-500 mr-2" /> <p>Loading requests...</p></div>
            ) : errorList ? (
              <div className="text-center py-8"><p className="text-red-500 mb-2">{errorList}</p><button onClick={fetchList} className="btn-subtle"><RefreshCw className="h-4 w-4 mr-1" /> Try Again</button></div>
            ) : (requests && requests.length > 0) ? (
              requests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center mb-2">
                        <span className="font-medium mr-2">Table {request.tableNumber}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(request.status)}`}>{request.status}</span>
                      </div>
                      <p className="text-gray-900">{request.content}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-xs text-gray-500"><TimeAgo date={request.createdAt} /></p>
                      {request.waiterName && (<p className="text-xs text-gray-500 mt-1">Assigned to: {request.waiterName}</p>)}
                    </div>
                  </div>
                  {request.responseTime !== undefined && (<div className="mt-2 text-xs text-gray-500">Response time: {request.responseTime} mins</div>)}
                </div>
              ))
            ) : (
              <div className="text-center py-8"><p className="text-gray-500">No requests found matching your filters.</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
