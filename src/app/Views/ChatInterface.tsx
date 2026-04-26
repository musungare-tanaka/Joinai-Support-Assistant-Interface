'use client';
import React, { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Moon, Sun } from 'lucide-react';
import BASE_URL from '../apiBaseUrl';




interface ApiResponse {
  message: string;
  type: 'success' | 'warning' | 'error' | 'answer' | 'email_required' | 'support_ticket_created';
  sessionId?: string;
  pendingQuestion?: string;
  warning?: string;
}

const TypingIndicator = ({ isDarkMode }: { isDarkMode: boolean }) => {
  return (
    <div className="flex justify-start mb-4 px-6">
      <div className={`max-w-xs p-4 rounded-2xl text-sm shadow-sm ${
        isDarkMode 
          ? 'bg-gray-800/70 text-gray-300 border border-gray-700/50' 
          : 'bg-white text-gray-700 border border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1.5">
            <div className={`w-2 h-2 rounded-full animate-bounce ${
              isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
            }`}></div>
            <div className={`w-2 h-2 rounded-full animate-bounce ${
              isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
            }`} style={{ animationDelay: '0.15s' }}></div>
            <div className={`w-2 h-2 rounded-full animate-bounce ${
              isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
            }`} style={{ animationDelay: '0.3s' }}></div>
          </div>
          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Assistant is typing...
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string; type?: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isWaitingForEmail, setIsWaitingForEmail] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const extractEmail = (value: string): string | null => {
    const match = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/);
    return match ? match[0] : null;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: { sender: 'user' | 'bot'; text: string; type?: string } = { 
      sender: 'user', 
      text: input 
    };
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = input;
    setInput('');
    setIsTyping(true);
    
  
    
    
    try {
      const response = await fetch(`${BASE_URL}/simplify-question`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        // Keep the original ticket flow:
        // 1) backend returns `email_required`
        // 2) user provides email
        // 3) frontend sends it in `email` while still sending the raw message in `question`
        body: JSON.stringify({ 
          question: currentInput,
          email: isWaitingForEmail ? extractEmail(currentInput) : null
        }),
      });

      setIsTyping(false);

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        let botReply: ApiResponse | string;
        
        if (contentType && contentType.includes('application/json')) {
          botReply = await response.json() as ApiResponse;
          
          const messageText = botReply.message;
          let messageType = '';
          
          switch (botReply.type) {
            case 'email_required':
              setIsWaitingForEmail(true);
              messageType = 'email_required';
              break;
            case 'success':
              setIsWaitingForEmail(false);
              messageType = 'success';
              break;
            case 'warning':
              setIsWaitingForEmail(false);
              messageType = 'warning';
              console.warn('Session warning:', botReply.warning);
              break;
            case 'support_ticket_created':
              setIsWaitingForEmail(false);
              messageType = 'success';
              break;
            case 'error':
              setIsWaitingForEmail(false);
              messageType = 'error';
              break;
            default:
              setIsWaitingForEmail(false);
          }
          
          setMessages(prev => [...prev, { 
            sender: 'bot', 
            text: messageText,
            type: messageType
          }]);
          
        } else {
          botReply = await response.text();
          setMessages(prev => [...prev, { 
            sender: 'bot', 
            text: typeof botReply === 'string' ? botReply : botReply.message 
          }]);
        }
        
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
    } catch (error) {
      setIsTyping(false);
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        { 
          sender: 'bot', 
          text: '⚠️ Unable to reach the assistant. Please try again later.',
          type: 'error'
        },
      ]);
    }
    
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Helper function to get message styling based on type
  const getMessageStyling = (msg: { sender: 'user' | 'bot'; text: string; type?: string }) => {
    if (msg.sender === 'user') {
      return isDarkMode 
        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg border border-blue-500/20'
        : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg';
    }
    
    // Bot message styling based on type
    const baseClasses = 'shadow-sm border';
    
    if (isDarkMode) {
      switch (msg.type) {
        case 'success':
          return `bg-gray-800/70 text-gray-200 border-gray-700/50 ${baseClasses}`;
        case 'warning':
          return `bg-amber-900/30 text-amber-200 border-amber-700/50 ${baseClasses}`;
        case 'error':
          return `bg-red-900/30 text-red-200 border-red-700/50 ${baseClasses}`;
        case 'email_required':
          return `bg-blue-900/30 text-blue-200 border-blue-700/50 ${baseClasses}`;
        default:
          return `bg-gray-800/70 text-gray-200 border-gray-700/50 ${baseClasses}`;
      }
    } else {
      switch (msg.type) {
        case 'success':
          return `bg-white text-gray-800 border-gray-200 ${baseClasses}`;
        case 'warning':
          return `bg-amber-50 text-amber-800 border-amber-200 ${baseClasses}`;
        case 'error':
          return `bg-red-50 text-red-800 border-red-200 ${baseClasses}`;
        case 'email_required':
          return `bg-blue-50 text-blue-800 border-blue-200 ${baseClasses}`;
        default:
          return `bg-white text-gray-800 border-gray-200 ${baseClasses}`;
      }
    }
  };

  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-gray-50 to-gray-100'
    }`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 flex items-center justify-between backdrop-blur-sm ${
        isDarkMode 
          ? 'bg-gray-900/90 border-gray-700/50 shadow-lg' 
          : 'bg-white/90 border-gray-200 shadow-sm'
      }`}>
        <div className="w-10"></div>
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
            isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
          }`}>
            🤖
          </div>
          <h1 className={`text-xl font-semibold tracking-tight ${
            isDarkMode ? 'text-gray-100' : 'text-gray-800'
          }`}>
            JoinAI Support
          </h1>
        </div>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2.5 rounded-xl transition-all duration-200 ${
            isDarkMode 
              ? 'hover:bg-gray-800 text-gray-300 hover:text-gray-100 bg-gray-800/50' 
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800 bg-gray-50'
          }`}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
      
      {/* Messages Container */}
      <div className={`flex-1 overflow-y-auto ${
        isDarkMode ? 'bg-transparent' : 'bg-transparent'
      }`}>
        <div className="py-6">
          {messages.length === 0 && (
            <div className="text-center px-6 py-12">
              <div className={`rounded-2xl p-8 mx-4 max-w-md mx-auto shadow-sm border ${
                isDarkMode 
                  ? 'bg-gray-800/70 border-gray-700/50 text-gray-300' 
                  : 'bg-white border-gray-200 text-gray-700'
              }`}>
                <div className="text-4xl mb-4">👋</div>
                <h3 className={`text-lg font-medium mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  Welcome to JoinAI Support
                </h3>
                <p className="text-sm leading-relaxed">
                  I&apos;m here to help you with questions about JoinAI. How can I assist you today?
                </p>
              </div>
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex px-6 mb-4 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md p-4 text-sm leading-relaxed whitespace-pre-wrap rounded-2xl ${
                  msg.sender === 'user' 
                    ? 'rounded-br-lg' 
                    : 'rounded-bl-lg'
                } ${getMessageStyling(msg)}`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          
          {isTyping && <TypingIndicator isDarkMode={isDarkMode} />}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Area - Sticky at bottom */}
      <div className={`border-t px-6 py-4 backdrop-blur-sm ${
        isDarkMode 
          ? 'bg-gray-900/90 border-gray-700/50' 
          : 'bg-white/90 border-gray-200'
      }`}>
        {isWaitingForEmail && (
          <div className={`text-xs text-center p-3 rounded-xl mb-4 border ${
            isDarkMode 
              ? 'text-blue-300 bg-blue-900/30 border-blue-700/50' 
              : 'text-blue-700 bg-blue-50 border-blue-200'
          }`}>
            💡 <span className="font-medium">Tip:</span> Just type your email address (e.g., &quot;user@example.com&quot;) and send it
          </div>
        )}
        
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              className={`w-full px-5 py-4 rounded-2xl resize-none focus:outline-none focus:ring-2 transition-all duration-200 text-sm placeholder-opacity-70 min-h-[52px] max-h-32 ${
                isDarkMode 
                  ? 'bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:bg-gray-750 border border-gray-700' 
                  : 'bg-gray-100 text-gray-800 placeholder-gray-500 focus:ring-blue-400 focus:bg-white border border-gray-200 focus:border-blue-300'
              }`}
              placeholder={
                isWaitingForEmail 
                  ? "Please provide your email address..." 
                  : "Type your message..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isTyping}
              rows={1}
              style={{
                height: 'auto',
                minHeight: '52px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={isTyping || !input.trim()}
            className={`p-3.5 rounded-2xl transition-all duration-200 flex-shrink-0 shadow-sm ${
              isTyping || !input.trim()
                ? isDarkMode 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                : isDarkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg transform hover:scale-105'
            }`}
          >
            <SendHorizonal className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Footer */}
      <div className={`text-xs text-center py-3 ${
        isDarkMode 
          ? 'bg-gray-900/50 text-gray-500' 
          : 'bg-gray-50/80 text-gray-400'
      }`}>
        <span className="font-medium">Powered by JoinAI</span> • © {new Date().getFullYear()}
      </div>
    </div>
  );
}
