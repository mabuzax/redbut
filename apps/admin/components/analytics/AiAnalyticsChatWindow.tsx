/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { X, Loader2, MessageSquare, Send } from "lucide-react";
import { 
  adminApi, 
  AiQueryRequest, 
  AiAnalyticsQueryResponse,
  DateRange // For initialDateRange prop
} from "../../lib/api";
import { v4 as uuid } from 'uuid';

export interface AiChatMessage {
  role: 'user' | 'ai' | 'system' | 'error';
  content: string;
  isJson?: boolean; // To indicate if content should be rendered as JSON
}

export interface AiAnalyticsChatWindowProps {
  onClose: () => void;
  initialDateRange?: DateRange; // To potentially pass context to AI
}

function usePersistentThreadId(keyPrefix = 'chatThreadId', entityName: string) {
  const key = `${keyPrefix}:${entityName.toLowerCase().replace(/\s+/g, '-')}`;
  const [threadId] = React.useState(() => {
    if (typeof window === 'undefined') return uuid(); // Fallback for SSR or non-browser env
    const stored = localStorage.getItem(key);
    if (stored) return stored;

    const newId = uuid();
    localStorage.setItem(key, newId);
    return newId;
  });
  return threadId;
}

function usePersistentMessagesForEntity(threadId: string, entityName: string, initialMessageContent: string) {
  const storageKey = `chatMessages:${entityName.toLowerCase().replace(/\s+/g, '-')}:${threadId}`;

  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    const initialMessage: AiChatMessage = { role: "ai", content: initialMessageContent };
    if (typeof window === 'undefined') {
      return [initialMessage];
    }
    const cached = localStorage.getItem(storageKey);
    try {
      return cached ? JSON.parse(cached) : [initialMessage];
    } catch (e) {
      console.error("Failed to parse cached messages:", e);
      return [initialMessage];
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  const reset = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
    setMessages([{ role: "ai", content: initialMessageContent }]);
  };

  return { messages, setMessages, reset };
}


const AiAnalyticsChatWindow = ({ onClose, initialDateRange }: AiAnalyticsChatWindowProps) => {
  const entityName = "Analytics";
  const threadId = usePersistentThreadId(`chatThreadId`, entityName); 
  
  const exampleQueries = [
    "What were our total sales last week?",
    "Which waiter had the highest average rating last month?",
    "Show me the trend of hourly orders for yesterday.",
    "Compare sales performance of morning shifts vs evening shifts for the last 7 days.",
    "What are our top 5 most popular menu items by revenue?",
  ];
  const initialAiMessage = `Hello! I'm 'Insight', your AI Data Analyst. How can I help you understand your restaurant's performance today?\n\nYou can ask things like:\n- "${exampleQueries[0]}"\n- "${exampleQueries[1]}"\n- "${exampleQueries[2]}"`;

  const { messages, setMessages } = usePersistentMessagesForEntity(threadId, entityName, initialAiMessage);

  const token = typeof window !== 'undefined' ? localStorage.getItem("redbutToken") || "" : "";

  const [input, setInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !token) return;

    const userMessage: AiChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsAiTyping(true);
    setChatError(null);

    try {
      // Include dateRange in the initial message if provided
      let messageToSend = userMessage.content;
      if (initialDateRange && messages.length === 1) { // Assuming this is the first user message after initial AI greeting
        messageToSend += ` (for date range: ${initialDateRange.startDate} to ${initialDateRange.endDate})`;
      }

      const aiResponse = await adminApi.processAnalyticsAiQuery(token, { message: messageToSend, threadId });
      
      let responseContent: string;
      let isJsonResponse = false;
            
      if (typeof aiResponse === 'string') {
        responseContent = aiResponse;
      } else if (typeof aiResponse === 'object' && aiResponse !== null) {
        responseContent = JSON.stringify(aiResponse, null, 2);
        isJsonResponse = true;
      } else {
        responseContent = "I received an unexpected response type.";
      }

      setMessages(prev => [...prev, { role: 'ai', content: responseContent, isJson: isJsonResponse }]);
      
    } catch (err: any) {
      console.error("AI processing error:", err);
      const errMsg = `AI Error: ${err.message || 'Failed to process your request.'}`;
      setMessages(prev => [...prev, { role: 'error', content: errMsg }]);
      setChatError(errMsg);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg h-[80vh] max-h-[700px] bg-white border border-gray-300 rounded-lg shadow-xl flex flex-col">
        <div className="p-3 border-b flex justify-between items-center bg-primary-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <h3 className="font-semibold text-base">Talk to Your Data (AI Analyst)</h3>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 p-1 rounded-full hover:bg-primary-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-grow p-3 space-y-3 overflow-y-auto bg-gray-50 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-2.5 rounded-lg text-sm shadow ${
                msg.role === 'user' ? 'bg-primary-500 text-white rounded-br-none' : 
                msg.role === 'ai' ? 'bg-gray-200 text-gray-800 rounded-bl-none' : 
                'bg-red-100 text-red-700 rounded-bl-none border border-red-300' 
              }`}>
                {msg.isJson ? (
                  <pre className="whitespace-pre-wrap break-all text-xs bg-gray-100 p-2 rounded border border-gray-300 max-h-60 overflow-auto">
                    {msg.content}
                  </pre>
                ) : (
                  msg.content.split('\n').map((line, i) => <div key={i}>{line || '\u00A0'}</div>) // Render empty line too
                )}
              </div>
            </div>
          ))}
          {isAiTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 rounded-lg p-2.5 text-sm rounded-bl-none shadow">
                <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" /> Insight is thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {chatError && <div className="p-2 text-xs text-red-600 border-t bg-red-50">{chatError}</div>}
        <form onSubmit={handleSendMessage} className="p-3 border-t bg-white rounded-b-lg">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your restaurant data..."
              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
              disabled={isAiTyping}
              aria-label="Chat input for analytics AI"
            />
            <button 
              type="submit" 
              className="btn-primary p-2"
              disabled={!input.trim() || isAiTyping}
              aria-label="Send message"
            >
              {isAiTyping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AiAnalyticsChatWindow;
