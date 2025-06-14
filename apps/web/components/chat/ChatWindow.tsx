import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Loader2, User, Bot } from 'lucide-react';

// Message types
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

// Chat window props
interface ChatWindowProps {
  onClose?: () => void;
  onWaiterRequested?: () => void;
  userId?: string;
  tableNumber?: number;
  token?: string;
  agentName?: string;
  className?: string;
  inputPlaceholder?: string;
  headerText?: string;
  showCloseButton?: boolean;
}

/**
 * A reusable, sleek and futuristic chat window component
 * Integrates with Socket.IO for real-time AI assistant communication
 */
const ChatWindow: React.FC<ChatWindowProps> = ({
  onClose,
  onWaiterRequested,
  userId,
  tableNumber,
  token,
  agentName = 'Waiter Assistant',
  className = '',
  inputPlaceholder = 'e.g Tell me about your specials',
  headerText = 'AI Assistant',
  showCloseButton = true,
}) => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // References
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Generate a unique ID for messages
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Connect to Socket.IO server on component mount
  useEffect(() => {
    // Get token from localStorage if not provided
    const authToken = token || localStorage.getItem('redbutToken');
    
    if (!authToken) {
      setError('Authentication failed. Please refresh the page.');
      setIsConnecting(false);
      return;
    }
    
    // Connect to Socket.IO server
    /**
     * Resolve Socket.IO endpoint
     * 1. If NEXT_PUBLIC_WS_URL is defined, use it as-is.
     * 2. Otherwise derive it from NEXT_PUBLIC_API_URL.
     * 3. Fallback to hard-coded local dev URL.
     *
     * NOTE: Socket.IO clients should use the *HTTP(S)* scheme. The library
     * will handle the WebSocket upgrade internally.
     */
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3001';

    /**
     * Connect to the `/chat` namespace by appending it to the base URL.
     * We no longer pass a custom `path` – the namespace in the URL is
     * sufficient and prevents the “Invalid namespace” error.
     */
    const socket = io(`${baseUrl}/chat`, {
      withCredentials: true,              // allow cookies / CORS creds
      transports: ['websocket'],
      auth: {
        token
      }
    });
        
    socketRef.current = socket;
    
    // Socket event handlers
    socket.on('connect', () => {
      setIsConnecting(false);
      setError(null);
    });
    
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Failed to connect to chat server. Please try again.');
      setIsConnecting(false);
    });
    
    socket.on('assistant-message', (data: { content: string; timestamp: string }) => {
      const newMessage: Message = {
        id: generateId(),
        content: data.content,
        role: 'assistant',
        timestamp: new Date(data.timestamp),
      };
      
      setMessages((prev) => [...prev, newMessage]);
      setIsSending(false);
    });
    
    socket.on('waiter-requested', () => {
      if (onWaiterRequested) {
        onWaiterRequested();
      }
    });
    
    socket.on('error', (data: { message: string }) => {
      setError(data.message);
      setIsSending(false);
    });
    
    socket.on('chat-history', (history: any[]) => {
      // Convert history to Message format
      const formattedHistory = history.map((msg) => ({
        id: generateId(),
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        timestamp: new Date(msg.createdAt),
      }));
      
      setMessages(formattedHistory);
    });
    
    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, onWaiterRequested]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Focus input field when component mounts
  useEffect(() => {
    if (inputRef.current && !isConnecting) {
      inputRef.current.focus();
    }
  }, [isConnecting]);
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!inputValue.trim() || isSending || isConnecting) return;
    
    const newMessage: Message = {
      id: generateId(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setIsSending(true);
    setInputValue('');
    
    // Send message to server
    if (socketRef.current) {
      socketRef.current.emit('client-message', { content: newMessage.content });
    }
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  return (
    <div className={`flex flex-col h-full max-h-screen bg-black bg-opacity-95 text-white rounded-lg overflow-hidden shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary-600 bg-gradient-to-r from-primary-700 to-primary-500">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <h2 className="font-bold text-lg">{headerText}</h2>
        </div>
        {showCloseButton && onClose && (
          <button 
            onClick={onClose}
            className="rounded-full p-1 hover:bg-primary-700 transition-colors"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600">
        {isConnecting ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500 mb-2" />
            <p className="text-gray-300">Connecting to assistant...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-400 text-center">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
            >
              Reconnect
            </button>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-none'
                      : 'bg-gray-800 text-gray-100 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {message.role === 'user' ? (
                      <>
                        <span className="font-medium text-sm">You</span>
                        <User className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        <Bot className="h-3 w-3" />
                        <span className="font-medium text-sm">{agentName}</span>
                      </>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <div className="text-right mt-1">
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-800 p-3 bg-gray-900">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={inputPlaceholder}
            disabled={isConnecting || isSending}
            className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400"
            aria-label="Type your message"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending || isConnecting}
            className={`rounded-full p-2 ${
              !inputValue.trim() || isSending || isConnecting
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            } transition-colors`}
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
