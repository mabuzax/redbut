import { useState, useEffect } from "react";
import { AiChatMessage } from "../components/staff/AiChatWindow";

export function usePersistentMessages(threadId: string) {
  const storageKey = `staffChatMessages:${threadId}`;

  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    const cached = localStorage.getItem(storageKey);
    return cached ? JSON.parse(cached) : [
      { role: "ai", content:
        "Hello! How can I help you manage staff today?" }
    ];
  });

  // write-through on every change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  // optional helper for logout / clear chat
  const reset = () => {
    localStorage.removeItem(storageKey);
    setMessages([
      { role: "ai", content:
        "Hello! How can I help you manage staff today?" }
    ]);
  };

  return { messages, setMessages, reset };
}