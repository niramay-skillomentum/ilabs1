"use client";

import { useState, useRef, useEffect } from "react";
import { getDeskInstructions } from "./instructionsData";
import ReactMarkdown from "react-markdown";

export default function TutorialPanel({ desk, selectedTrade }) {
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const deskInfo = getDeskInstructions(desk);

  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi there! I'm your AI Tutor. Let me know if you need any help with the **${deskInfo.title}**.` },
    ...deskInfo.steps.map((step, idx) => ({
      role: 'assistant',
      text: `Step ${idx + 1}: **${step.title}** - ${step.desc}`
    })),
    { role: 'assistant', text: `💡 Pro Tip: ${deskInfo.tips}` }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isFloatingOpen) {
      scrollToBottom();
    }
  }, [messages, isFloatingOpen]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = { role: 'user', text: inputText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
      const response = await fetch(`${backendUrl}/api/chat/tutor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (sessionStorage.getItem("auth_token") || "")
        },
        body: JSON.stringify({
          message: userMessage.text,
          desk: desk,
          tradeContext: selectedTrade,
          history: messages.slice(-5) // Send last 5 messages for context
        })
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', text: "⚠️ Error connecting to Tutor AI. Please check server." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative z-50">
      {/* --- TUTORIAL PANEL BUTTON (Chatbot Style) --- */}
      <button 
        onClick={() => setIsFloatingOpen(!isFloatingOpen)}
        className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full shadow-[0_4px_15px_rgba(79,70,229,0.4)] transition-all duration-300 transform hover:scale-110 active:scale-95 border-0 cursor-pointer group"
      >
        <span className="text-2xl leading-none transition-transform duration-300 group-hover:rotate-12">
          {isFloatingOpen ? "✖" : "🤖"}
        </span>
        {/* Tooltip */}
        {!isFloatingOpen && (
          <span className="absolute right-14 bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            Tutorial Assistant
          </span>
        )}
      </button>

      {/* --- TUTORIAL PANEL POPUP --- */}
      <div 
        className={`absolute top-14 right-0 w-96 max-w-[90vw] flex flex-col transform transition-all duration-400 origin-top-right ${
          isFloatingOpen ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 pointer-events-none translate-y-4"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden text-slate-800 flex flex-col max-h-[60vh]">
          
          <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-4 border-b border-indigo-700/50 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shadow-inner">
                🤖
              </div>
              <div>
                <h3 className="text-md font-bold text-white m-0 tracking-wide">
                  Tutorial Assistant
                </h3>
                <p className="text-indigo-200 text-[11px] mt-0.5 mb-0 font-medium flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  <span>{deskInfo.title}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsFloatingOpen(false)}
              className="text-indigo-300 hover:text-white transition-colors cursor-pointer text-2xl px-2"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 p-4 bg-slate-50 text-left">
            <div className="flex flex-col space-y-4">
              {/* Chat History */}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-start space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${msg.role === 'user' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className={`p-3 rounded-2xl shadow-sm text-sm border ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none border-purple-700' : 'bg-white text-slate-700 rounded-tl-none border-slate-100'}`}>
                    <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert text-white' : 'prose-slate'} prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-a:text-indigo-600`}>
                      <ReactMarkdown>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold shadow-sm">🤖</div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-sm text-slate-500 italic flex space-x-1 items-center h-10">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="p-3 bg-white border-t border-slate-200">
            <div className="flex items-end space-x-2">
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask the AI Tutor..."
                className="flex-1 max-h-24 min-h-[40px] resize-none border border-slate-300 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 custom-scrollbar"
                rows="1"
              />
              <button 
                onClick={handleSend}
                disabled={isTyping || !inputText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors h-[40px]"
              >
                Send
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium m-0 mt-2 text-center">Powered by Nvidia Nemotron 3</p>
          </div>

        </div>
      </div>
    </div>
  );
}
