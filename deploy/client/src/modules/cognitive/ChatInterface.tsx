import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Loader2, Sparkles, RefreshCw, Bot, ChevronDown, Maximize2, Minimize2, FileText, Search, Activity, Zap } from "lucide-react";
import axios from "axios";
import { COGNITIVE_API_BASE_URL } from "../../config/runtime";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolUsed?: string;
  modelUsed?: string;
  llmEnhanced?: boolean;
  timestamp: Date;
}

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  installed?: boolean;
}

const COGNITIVE_API = COGNITIVE_API_BASE_URL;

// Global, cross-module actions
const GLOBAL_QUICK_ACTIONS = [
  { label: "📊 System Overview", query: "Give me a high-level summary of all modules (Procurement, Maintenance, Assets)" },
  { label: "🔍 Search All", query: "Search for recent critical updates across the entire system" },
  { label: "⚡ Anomalies", query: "Detect any anomalies or urgent issues in any department" },
  { label: "❓ Help", query: "What can you do?" },
];

export const ChatInterface: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState("llama3.3");
  const [useLLM, setUseLLM] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Context Awareness (for backend reference only)
  const location = useLocation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) fetchModels();
  }, [isOpen]);

  const fetchModels = async () => {
    try {
      const res = await axios.get(`${COGNITIVE_API}/models`);
      setModels(res.data.models);
      setOllamaAvailable(res.data.ollama_available);
      if (res.data.default) setSelectedModel(res.data.default);
    } catch (e) {
      console.error("Failed to fetch models");
    }
  };

  const sendMessage = async (query: string) => {
    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const endpoint = useLLM && ollamaAvailable ? "/chat/enhanced" : "/chat";
      const response = await axios.post(`${COGNITIVE_API}${endpoint}`, {
        query,
        model: selectedModel,
        use_llm: useLLM,
        current_path: location.pathname, // Provide context, but don't limit scope
        context: "global" 
      });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data.response,
        toolUsed: response.data.tool_used,
        modelUsed: response.data.model_used,
        llmEnhanced: response.data.llm_enhanced,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I couldn't process your request. Please ensure the cognitive service is running.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => setMessages([]);

  const renderMessage = (msg: Message) => {
    const isUser = msg.role === "user";
    
    return (
      <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
        <div className={`${isExpanded ? "max-w-[70%]" : "max-w-[85%]"} rounded-2xl px-4 py-2.5 ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
        }`}>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {msg.content.split("\n").map((line, i) => {
              const parts = line.split(/\*\*(.*?)\*\*/g);
              return <div key={i}>{parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}</div>;
            })}
          </div>
          {!isUser && (msg.toolUsed || msg.modelUsed) && (
            <div className="text-xs mt-2 text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
              {msg.toolUsed && <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" />{msg.toolUsed}</span>}
              {msg.llmEnhanced && msg.modelUsed && <span className="flex items-center gap-1"><Bot className="w-3 h-3 text-purple-500" />{msg.modelUsed}</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Expanded half-page dimensions
  const expandedWidth = "calc(50vw - 24px)";
  const expandedHeight = "calc(100vh - 48px)";
  const normalWidth = "24rem";  // 384px
  const normalHeight = "34rem"; // 544px

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 ${isOpen ? "hidden" : "flex"} items-center justify-center`}
      >
        <MessageCircle className="w-6 h-6" />
        <span className="ml-2 font-medium hidden sm:inline">KELVIN AI</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden transition-all duration-300"
          style={{
            width: isExpanded ? expandedWidth : normalWidth,
            height: isExpanded ? expandedHeight : normalHeight,
            right: "24px",
            bottom: "24px"
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">KELVIN AI</span>
                {isExpanded && <span className="text-xs opacity-70">| Global Oracle</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/20 rounded-lg" title={isExpanded ? "Minimize" : "Expand"}>
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button onClick={clearChat} className="p-1.5 hover:bg-white/20 rounded-lg" title="Clear chat"><RefreshCw className="w-4 h-4" /></button>
                <button onClick={() => { setIsOpen(false); setIsExpanded(false); }} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>
            
            {/* Model Selector */}
            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <button 
                  onClick={() => setShowModelSelect(!showModelSelect)}
                  className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-3 h-3" />
                    <span>{models.find(m => m.id === selectedModel)?.name || selectedModel}</span>
                  </div>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {showModelSelect && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden z-10">
                    {models.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModel(m.id); setShowModelSelect(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-700 ${selectedModel === m.id ? 'bg-blue-600' : ''}`}
                      >
                        <div className="font-medium">{m.name}</div>
                        <div className="text-gray-400 text-[10px]">{m.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={useLLM} 
                  onChange={(e) => setUseLLM(e.target.checked)}
                  className="rounded border-white/30"
                  disabled={!ollamaAvailable}
                />
                <span className={!ollamaAvailable ? "line-through opacity-50" : ""}>LLM</span>
              </label>
            </div>
            {!ollamaAvailable && <div className="text-[10px] text-yellow-200 mt-1">⚠️ Ollama not detected - using rule-based responses</div>}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-6">
                <Sparkles className={`${isExpanded ? "w-16 h-16" : "w-10 h-10"} mx-auto mb-2 text-purple-500`} />
                <p className={`font-medium mb-1 ${isExpanded ? "text-lg" : ""}`}>
                  Ask Kelvin Anything
                </p>
                <p className="text-xs mb-4">
                  I can answer questions spanning Procurement, Maintenance, Assets, and more.
                </p>
                <div className={`flex flex-wrap justify-center gap-2 ${isExpanded ? "max-w-2xl mx-auto" : ""}`}>
                  {GLOBAL_QUICK_ACTIONS.map((action) => (
                    <button key={action.label} onClick={() => sendMessage(action.query)} className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-full flex items-center gap-1">
                      {action.label.includes("Overview") && <Activity className="w-3 h-3" />}
                      {action.label.includes("Search") && <Search className="w-3 h-3" />}
                      {action.label.includes("Anomalies") && <Zap className="w-3 h-3" />}
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(renderMessage)}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question across any module..." className={`flex-1 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl px-4 py-2.5 ${isExpanded ? "text-base" : "text-sm"} text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none`} disabled={isLoading} />
              <button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-xl"><Send className="w-5 h-5" /></button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
