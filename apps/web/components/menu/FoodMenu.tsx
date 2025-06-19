"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Eye,
  Video,
  ArrowLeftCircle,
  ShoppingBag,
  ImageIcon,
  Loader,
  Check
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  status: string;
  video?: string;
  served_info?: string;
  available_options: string[];
  available_extras: string[];
}

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedOptions?: string[];
}

interface FoodMenuProps {
  userId: string;
  sessionId: string;
  tableNumber: number;
  token: string;
  onCloseMenu: () => void;
  // New props for cart management
  orderItems: OrderItem[];
  setOrderItems?: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  addToCart: (item: OrderItem) => void;
  removeFromCart: (itemId: string, selectedOptions?: string[]) => void;
  clearCart: () => void;
  showCart: boolean;
  setShowCart: (show: boolean) => void;
}

const ImagePlaceholder = ({ name }: { name: string }) => (
  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
    <div className="flex flex-col items-center justify-center p-4 text-center">
      <ImageIcon className="h-8 w-8 mb-2" />
      <span className="text-xs">{name || "No Image"}</span>
    </div>
  </div>
);

const FoodMenu = ({ 
  userId, 
  sessionId, 
  tableNumber, 
  token, 
  onCloseMenu,
  orderItems,
  addToCart,
  removeFromCart,
  clearCart,
  showCart,
  setShowCart
}: FoodMenuProps) => {
  // Menu state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Image loading state
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  // Infinite scroll state
  const [displayedItemsCount, setDisplayedItemsCount] = useState(15);
  const [loadingMore, setLoadingMore] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Modal state
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Selected options state
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  // Order submission state
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const fetchMenuItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiBase}/api/v1/menu?status=Active`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch menu items: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter only active items
      const activeItems = data.items.filter((item: MenuItem) => item.status === "Active");
      setMenuItems(activeItems);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(activeItems.map((item: MenuItem) => item.category))
      ).filter((cat): cat is string => typeof cat === "string");
      
      // Add "Extras" category if it doesn't exist
      const categoriesWithExtras = ["all", ...uniqueCategories];
      if (!categoriesWithExtras.includes("Extras")) {
        categoriesWithExtras.push("Extras");
      }
      
      setCategories(categoriesWithExtras);
      setDisplayedItemsCount(15); // Reset displayed count when items change
    } catch (e: any) {
      setError(e.message || "Failed to load menu items");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const handleImageError = (imageUrl: string) => {
    setFailedImages(prev => new Set(prev).add(imageUrl));
  };

  const handleAddToOrder = (item: MenuItem, options: string[] = []) => {
    addToCart({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image,
      selectedOptions: options.length > 0 ? options : undefined
    });
    
    toast.success(`Added ${item.name} to your cart`, {
      position: "bottom-center",
      duration: 2000,
      icon: '🛒'
    });
  };

  const handleRemoveFromOrder = (itemId: string, selectedOptions?: string[]) => {
    removeFromCart(itemId, selectedOptions);
  };

  const submitOrder = async () => {
    if (orderItems.length === 0) {
      return;
    }
    
    setSubmittingOrder(true);
    
    try {
      const response = await fetch(`${apiBase}/api/v1/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          sessionId,
          tableNumber,
          items: orderItems.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            selectedOptions: item.selectedOptions
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit order: ${response.status}`);
      }
      
      // Clear cart after successful order
      clearCart();
      setShowCart(false);
      toast.success("Order placed successfully!", {
        position: "bottom-center",
        duration: 3000,
        icon: '✅'
      });
      
      // Show waiter notification popup
      setTimeout(() => {
        if (confirm("Once everyone is ready at your table, use the Buzz Waiter button to call waiter to the table.")) {
          onCloseMenu();
        }
      }, 500);
    } catch (e: any) {
      toast.error(`Error placing order: ${e.message || "Unknown error"}`, {
        position: "bottom-center",
        duration: 3000
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch = searchTerm === "" || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Infinite scroll detection
  useEffect(() => {
    if (categoryFilter !== "all") return;
    
    const handleScroll = () => {
      if (!contentRef.current || loadingMore) return;
      
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      
      // If scrolled to bottom (with 100px threshold)
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMoreItems();
      }
    };
    
    const currentRef = contentRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
    }
    
    return () => {
      if (currentRef) {
        currentRef.removeEventListener("scroll", handleScroll);
      }
    };
  }, [categoryFilter, loadingMore, filteredMenuItems.length]);

  const loadMoreItems = () => {
    if (loadingMore || categoryFilter !== "all" || displayedItemsCount >= filteredMenuItems.length) return;
    
    setLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayedItemsCount(prev => prev + 10);
      setLoadingMore(false);
    }, 500);
  };

  // Get items to display based on category and infinite scroll
  const displayedItems = categoryFilter === "all" 
    ? filteredMenuItems.slice(0, displayedItemsCount)
    : filteredMenuItems;

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const viewItemDetails = (item: MenuItem) => {
    setSelectedItem(item);
    // Initialize selected options with empty array
    setSelectedOptions([]);
    setShowModal(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCategoryFilter("all"); // Switch to ALL category when searching
    setDisplayedItemsCount(15); // Reset to first 15 items
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    if (category === "all") {
      setDisplayedItemsCount(15); // Reset to first 15 items for ALL category
    }
  };

  const toggleOption = (option: string) => {
    setSelectedOptions(prev => 
      prev.includes(option) 
        ? prev.filter(o => o !== option) 
        : [...prev, option]
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toast Container */}
      <Toaster />
      
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center">
          <button 
            onClick={onCloseMenu} 
            className="mr-3 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold">Food Menu</h1>
        </div>
        <button 
          onClick={() => setShowCart(true)}
          className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Shopping cart"
        >
          <ShoppingCart className="h-6 w-6" />
          {totalItems > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
            >
              {totalItems}
            </motion.span>
          )}
        </button>
      </div>

      {/* Search and Filter */}
      <div className="p-4 bg-white shadow-sm">
        <div className="flex items-center mb-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>
        <div className="flex overflow-x-auto pb-2 hide-scrollbar">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-4 py-2 mr-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                categoryFilter === category
                  ? "bg-primary-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {category === "all" ? "All" : category}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div 
        ref={contentRef}
        className="flex-1 p-4 overflow-y-auto"
      >
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10 flex-1">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={fetchMenuItems}
              className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <div className="text-center py-10 flex-1">
            <p className="text-gray-500">No menu items found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {/* Menu Items - List View */}
            <div className="space-y-4">
              {displayedItems.map(item => (
                <div 
                  key={item.id} 
                  className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col md:flex-row"
                >
                  {/* Image (Left on desktop, Top on mobile) */}
                  <div className="h-48 md:h-auto md:w-1/3 md:max-w-xs overflow-hidden">
                    {(!item.image || failedImages.has(item.image)) ? (
                      <ImagePlaceholder name={item.name} />
                    ) : (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(item.image)}
                      />
                    )}
                  </div>
                  
                  {/* Content (Right on desktop, Bottom on mobile) */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                        <span className="text-lg font-semibold text-primary-600">
                          ${Number(item.price).toFixed(2)}
                        </span>
                      </div>
                      
                      {item.category && (
                        <p className="text-sm text-gray-500 mb-2">{item.category}</p>
                      )}
                      
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {item.description || "No description available"}
                      </p>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => viewItemDetails(item)}
                        className="flex-1 py-2 border border-primary-500 text-primary-500 rounded-md hover:bg-primary-50 transition-colors flex items-center justify-center"
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </button>
                      <button
                        onClick={() => handleAddToOrder(item)}
                        className="flex-1 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add to Order
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Load more indicator for ALL category */}
              {categoryFilter === "all" && displayedItems.length < filteredMenuItems.length && (
                <div className="flex justify-center py-4">
                  {loadingMore ? (
                    <div className="flex items-center">
                      <Loader className="h-5 w-5 animate-spin mr-2 text-primary-500" />
                      <span className="text-gray-600">Loading more...</span>
                    </div>
                  ) : (
                    <button 
                      onClick={loadMoreItems}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Load More
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Item Details Modal */}
      <AnimatePresence>
        {showModal && selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image Header */}
              <div className="relative h-56 w-full">
                {(!selectedItem.image || failedImages.has(selectedItem.image)) ? (
                  <ImagePlaceholder name={selectedItem.name} />
                ) : (
                  <img 
                    src={selectedItem.image} 
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(selectedItem.image)}
                  />
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-2 right-2 bg-white bg-opacity-70 p-1 rounded-full text-gray-700 hover:text-gray-900"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">{selectedItem.name}</h2>
                  <span className="text-xl font-bold text-primary-600">
                    ${Number(selectedItem.price).toFixed(2)}
                  </span>
                </div>
                
                {selectedItem.category && (
                  <p className="text-sm text-gray-500 mb-3">{selectedItem.category}</p>
                )}
                
                <p className="text-gray-600 mb-4">
                  {selectedItem.description || "No description available"}
                </p>
                
                {selectedItem.served_info && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Serving Information</h3>
                    <p className="text-sm text-gray-600">{selectedItem.served_info}</p>
                  </div>
                )}
                
                {selectedItem.available_options && selectedItem.available_options.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Available Options</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedItem.available_options.map((option, index) => (
                        <button 
                          key={index} 
                          className={`flex items-center p-2 rounded-md border ${
                            selectedOptions.includes(option) 
                              ? 'bg-primary-50 border-primary-500 text-primary-700' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => toggleOption(option)}
                        >
                          <div className={`w-5 h-5 rounded-md mr-2 flex items-center justify-center ${
                            selectedOptions.includes(option) 
                              ? 'bg-primary-500' 
                              : 'border border-gray-300'
                          }`}>
                            {selectedOptions.includes(option) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm">{option.replace('_', ' ')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedItem.video && (
                  <a 
                    href={selectedItem.video} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center mb-4 text-primary-500 hover:text-primary-700"
                  >
                    <Video className="h-4 w-4 mr-1" /> How it's made
                  </a>
                )}
              </div>
              
              {/* Footer Buttons */}
              <div className="p-4 border-t border-gray-200 flex space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <ArrowLeftCircle className="h-4 w-4 mr-2" /> Back
                </button>
                <button
                  onClick={() => {
                    handleAddToOrder(selectedItem, selectedOptions);
                    setShowModal(false);
                  }}
                  className="flex-1 py-3 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors flex items-center justify-center"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" /> Add to Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shopping Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCart(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Your Order</h2>
                <button 
                  onClick={() => setShowCart(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {orderItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Your order is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderItems.map((item, index) => (
                      <div key={`${item.menuItemId}-${index}`} className="flex items-center">
                        <div className="w-16 h-16 mr-3 rounded overflow-hidden flex-shrink-0">
                          {(!item.image || failedImages.has(item.image)) ? (
                            <ImagePlaceholder name={item.name} />
                          ) : (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={() => handleImageError(item.image || "")}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">${Number(item.price).toFixed(2)} each</p>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <p className="text-xs text-gray-500">
                              Options: {item.selectedOptions.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center">
                          <button 
                            onClick={() => handleRemoveFromOrder(item.menuItemId, item.selectedOptions)}
                            className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="mx-3 min-w-[20px] text-center">{item.quantity}</span>
                          <button 
                            onClick={() => {
                              const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                              if (menuItem) {
                                handleAddToOrder(menuItem, item.selectedOptions);
                              }
                            }}
                            className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t">
                <div className="flex justify-between mb-4">
                  <span className="font-semibold">Total:</span>
                  <span className="font-semibold">${totalPrice.toFixed(2)}</span>
                </div>
                <button
                  onClick={submitOrder}
                  disabled={orderItems.length === 0 || submittingOrder}
                  className={`w-full py-3 rounded-md text-white flex items-center justify-center ${
                    orderItems.length === 0 || submittingOrder
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-primary-500 hover:bg-primary-600 transition-colors"
                  }`}
                >
                  {submittingOrder ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FoodMenu;
