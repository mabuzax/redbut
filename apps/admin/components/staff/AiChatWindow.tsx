/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { adminApi, StaffMember, AiQueryRequest, AiQueryResponse } from "../../lib/api";
import { v4 as uuid } from 'uuid';
import { usePersistentMessages } from "../../hooks/usePersistentMessages";

export interface AiChatMessage {
  role: 'user' | 'ai' | 'system' | 'error';
  content: string;
}

export interface AiChatWindowProps {
  onClose: () => void;
  onStaffUpdate: () => void;
}

function usePersistentThreadId(key = 'redBut_staffChatThreadId') {
  const [threadId] = React.useState(() => {
    // ① Try to read an existing value
    const stored = localStorage.getItem(key);
    if (stored) return stored;

    // ② Generate a fresh UUID and save it
    const newId = uuid();
    localStorage.setItem(key, newId);
    return newId;
  });
  return threadId;
}

const AiChatWindow = ({ onClose, onStaffUpdate }: AiChatWindowProps) => {

  const threadId = usePersistentThreadId(); 
  const { messages, setMessages, reset } =
        usePersistentMessages(threadId);

  const token = typeof window !== 'undefined' ? localStorage.getItem("redBut_token") || "" : "";

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
      const aiResponse = await adminApi.processStaffAiQuery(token, { message: userMessage.content, threadId  });
      let responseContent = "";
      let operationSuccess = false;
            
      if (typeof aiResponse === 'string') {
        responseContent = aiResponse;
      } else if (Array.isArray(aiResponse)) {
        if (aiResponse.length === 0) {
          responseContent = "No staff members found matching your criteria.";
        } else if (typeof aiResponse[0] === 'string') { 
          responseContent = `Available positions: ${aiResponse.join(', ')}`;
        } else { 
          responseContent = "Here are the staff members I found:\n" + 
            (aiResponse as StaffMember[]).map(s => `- ${s.name} ${s.surname} (${s.position || s.accessAccount?.userType || 'N/A'}), ID: ${s.id.substring(0,8)}`).join('\n');
          operationSuccess = true; 
        }
      } else if (typeof aiResponse === 'object' && aiResponse !== null) {
        if ('message' in aiResponse) { 
          responseContent = (aiResponse as { message: string }).message;
          if (responseContent.toLowerCase().includes('deleted') || responseContent.toLowerCase().includes('created') || responseContent.toLowerCase().includes('updated')) {
            operationSuccess = true;
          }
        } else { 
          const staff = aiResponse as StaffMember;
          responseContent = `Staff member details: ${staff.name} ${staff.surname}, Position: ${staff.position || staff.accessAccount?.userType || 'N/A'}, Email: ${staff.email}, Tag: ${staff.tag_nickname}.`;
          if (userMessage.content.toLowerCase().includes('create') || userMessage.content.toLowerCase().includes('update')) {
             responseContent = `Successfully processed: ${staff.name} ${staff.surname}.`;
          }
          operationSuccess = true;
        }
      } else {
        responseContent = "I received an unexpected response type.";
      }

      setMessages(prev => [...prev, { role: 'ai', content: responseContent }]);
      if (operationSuccess) {
        onStaffUpdate(); 
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
      <div className="p-3 border-b flex justify-between items-center bg-primary-600 text-white rounded-t-lg">
        <h3 className="font-semibold text-base">AI Staff Assistant</h3>
        <button onClick={onClose} className="text-white hover:text-gray-200">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-grow p-3 space-y-3 overflow-y-auto bg-gray-50">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-2.5 rounded-lg text-sm ${
              msg.role === 'user' ? 'bg-primary-500 text-white rounded-br-none' : 
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
          placeholder="e.g Create a waiter named Jo Blogg, with email..."
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          disabled={isAiTyping}
        />
      </form>
    </div>
  );
};

export default AiChatWindow;
