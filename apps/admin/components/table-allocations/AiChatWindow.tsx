/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { 
  adminApi, 
  TableAllocationWithDetails,
  AiQueryRequest, 
  AiTableAllocationsQueryResponse 
} from "../../lib/api";
import { v4 as uuid } from 'uuid';

export interface AiChatMessage {
  role: 'user' | 'ai' | 'system' | 'error';
  content: string;
}

export interface AiChatWindowProps {
  onClose: () => void;
  onUpdate: () => void; 
  entityName: string; 
}

function usePersistentThreadId(keyPrefix = 'chatThreadId', entityName: string) {
  const key = `${keyPrefix}:${entityName.toLowerCase().replace(/\s+/g, '-')}`;
  const [threadId] = React.useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (stored) return stored;

    const newId = uuid();
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, newId);
    }
    return newId;
  });
  return threadId;
}

function usePersistentMessagesForEntity(threadId: string, entityName: string, initialMessageContent: string) {
  const storageKey = `chatMessages:${entityName.toLowerCase().replace(/\s+/g, '-')}:${threadId}`;

  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    if (typeof window === 'undefined') {
      return [{ role: "ai", content: initialMessageContent }];
    }
    const cached = localStorage.getItem(storageKey);
    return cached ? JSON.parse(cached) : [{ role: "ai", content: initialMessageContent }];
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


const AiChatWindow = ({ onClose, onUpdate, entityName }: AiChatWindowProps) => {
  const threadId = usePersistentThreadId(`chatThreadId`, entityName); 
  const initialAiMessage = `Hello! How can I help you manage ${entityName.toLowerCase()}s today?`;
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
      const aiResponse = await adminApi.processTableAllocationsAiQuery(token, { message: userMessage.content, threadId });
      let responseContent = "";
      let operationSuccess = false;
            
      if (typeof aiResponse === 'string') {
        responseContent = aiResponse;
      } else if (Array.isArray(aiResponse)) {
        if (aiResponse.length === 0) {
          responseContent = `No ${entityName.toLowerCase()}s found matching your criteria.`;
        } else if (typeof aiResponse[0] === 'string') { 
          responseContent = `Available options: ${aiResponse.join(', ')}`;
        } else { 
          responseContent = `Here are the ${entityName.toLowerCase()}s I found:\n` + 
            (aiResponse as TableAllocationWithDetails[]).map(alloc => 
              `- Tables: ${alloc.tableNumbers.join(', ')}, ` +
              `Waiter: ${alloc.waiter?.name || 'N/A'} ${alloc.waiter?.surname || ''} (${alloc.waiter?.tag_nickname || 'N/A'}), ` +
              `Shift: ${alloc.shift ? `${new Date(alloc.shift.date).toLocaleDateString()} (${new Date(alloc.shift.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(alloc.shift.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})` : 'N/A'}, ` +
              `ID: ${alloc.id.substring(0,8)}`
            ).join('\n');
          operationSuccess = true; 
        }
      } else if (typeof aiResponse === 'object' && aiResponse !== null) {
        if ('message' in aiResponse) { 
          responseContent = (aiResponse as { message: string }).message;
          if (responseContent.toLowerCase().includes('deleted') || responseContent.toLowerCase().includes('created') || responseContent.toLowerCase().includes('updated') || responseContent.toLowerCase().includes('allocated')) {
            operationSuccess = true;
          }
        } else { 
          const alloc = aiResponse as TableAllocationWithDetails;
          responseContent = `${entityName} details: ` +
            `Tables: ${alloc.tableNumbers.join(', ')}, ` +
            `Waiter: ${alloc.waiter?.name || 'N/A'} ${alloc.waiter?.surname || ''} (${alloc.waiter?.tag_nickname || 'N/A'}), ` +
            `Shift: ${alloc.shift ? `${new Date(alloc.shift.date).toLocaleDateString()} (${new Date(alloc.shift.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(alloc.shift.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})` : 'N/A'}.`;
          if (userMessage.content.toLowerCase().includes('create') || userMessage.content.toLowerCase().includes('update') || userMessage.content.toLowerCase().includes('allocate')) {
             responseContent = `Successfully processed ${entityName.toLowerCase()} for Waiter ${alloc.waiter?.tag_nickname || 'N/A'} on Shift ${alloc.shift ? new Date(alloc.shift.date).toLocaleDateString() : 'N/A'}.`;
          }
          operationSuccess = true;
        }
      } else {
        responseContent = "I received an unexpected response type.";
      }

      setMessages(prev => [...prev, { role: 'ai', content: responseContent }]);
      if (operationSuccess) {
        onUpdate(); 
      }
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
    <div className="fixed bottom-4 right-4 w-96 h-[70vh] bg-white border border-gray-300 rounded-lg shadow-xl flex flex-col z-50">
      <div className="p-3 border-b flex justify-between items-center bg-purple-600 text-white rounded-t-lg">
        <h3 className="font-semibold text-base">AI {entityName} Assistant</h3>
        <button onClick={onClose} className="text-white hover:text-gray-200">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-grow p-3 space-y-3 overflow-y-auto bg-gray-50">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-2.5 rounded-lg text-sm ${
              msg.role === 'user' ? 'bg-purple-500 text-white rounded-br-none' : 
              msg.role === 'ai' ? 'bg-gray-200 text-gray-800 rounded-bl-none' : 
              'bg-red-100 text-red-700 rounded-bl-none' 
            }`}>
              {msg.content.split('\n').map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </div>
        ))}
        {isAiTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 rounded-lg p-2.5 text-sm rounded-bl-none">
              <Loader2 className="h-4 w-4 animate-spin inline-block" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {chatError && <div className="p-2 text-xs text-red-600 border-t">{chatError}</div>}
      <form onSubmit={handleSendMessage} className="p-3 border-t bg-white rounded-b-lg">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`e.g. Allocate tables 1, 2 to waiter X for shift Y...`}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          disabled={isAiTyping}
        />
      </form>
    </div>
  );
};

export default AiChatWindow;
