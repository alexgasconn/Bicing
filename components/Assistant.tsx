import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Loader2, Info, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { ChatMessage, MessageRole } from '../types';

interface AssistantProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const Assistant: React.FC<AssistantProps> = ({ 
    messages, 
    onSendMessage, 
    isLoading,
    isSidebarOpen,
    onToggleSidebar
}) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSidebarOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const suggestions = [
    "¿Dónde hay bicis eléctricas?",
    "Busca estaciones cerca de Sagrada Familia",
    "Estaciones con más de 10 huecos libres"
  ];

  // Minimized State
  if (!isSidebarOpen) {
      return (
          <div className="h-full w-12 bg-white border-l border-slate-200 flex flex-col items-center py-4 shadow-xl z-50 relative">
              <button 
                onClick={onToggleSidebar}
                className="p-2 mb-4 bg-red-50 text-red-600 rounded-full hover:bg-red-100"
                title="Expandir Asistente"
              >
                  <ChevronLeft size={20} />
              </button>
              <div className="flex-1 flex flex-col items-center gap-4">
                  <div className="relative">
                     <MessageSquare className="text-slate-400" />
                     {messages.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>}
                  </div>
                  <span className="vertical-text text-xs font-bold text-slate-300 tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Asistente AI
                  </span>
              </div>
          </div>
      )
  }

  return (
    <div className="flex flex-col h-full bg-white shadow-xl rounded-l-2xl overflow-hidden border-l border-slate-100 w-full md:w-[400px]">
      <div className="p-4 bg-red-600 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white/20 rounded-full">
            <Info size={20} />
          </div>
          <div>
            <h2 className="font-bold">Asistente Bicing</h2>
            <p className="text-xs text-red-100">Powered by Gemini 2.5 Flash</p>
          </div>
        </div>
        <button 
            onClick={onToggleSidebar}
            className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
        >
            <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="text-center mt-10 space-y-4">
            <div className="inline-block p-4 bg-red-100 rounded-full text-red-600 mb-2">
               <MapPin size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">¡Hola! ¿En qué te ayudo?</h3>
            <p className="text-slate-500 text-sm px-6">
              Pregúntame sobre disponibilidad de bicicletas, estaciones cercanas a monumentos o filtra por tipo de bici.
            </p>
            <div className="flex flex-col gap-2 px-4 mt-6">
              {suggestions.map((s, i) => (
                <button 
                  key={i}
                  onClick={() => onSendMessage(s)}
                  className="p-3 text-sm bg-white border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors text-left shadow-sm text-slate-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm leading-relaxed ${
                msg.role === MessageRole.USER 
                  ? 'bg-red-600 text-white rounded-br-none' 
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
           <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-200">
               <div className="flex gap-1">
                 <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></span>
                 <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></span>
                 <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></span>
               </div>
             </div>
           </div>
        )}
      </div>

      <div className="p-3 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta..."
            className="flex-1 px-4 py-2 bg-slate-100 border-none rounded-full focus:ring-2 focus:ring-red-500 focus:outline-none text-slate-800 placeholder-slate-400"
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors shadow-md"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Assistant;