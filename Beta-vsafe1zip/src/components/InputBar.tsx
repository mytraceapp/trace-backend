import React, { useState } from 'react';
import { Mic, Send } from 'lucide-react';

export function InputBar() {
  const [message, setMessage] = useState('');

  return (
    <div 
      className="relative flex items-center gap-3 px-6 bg-white"
      style={{
        height: '54px',
        borderRadius: '26px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Input Field */}
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type anything… or tap the mic"
        className="flex-1 bg-transparent outline-none placeholder:opacity-50"
        style={{
          color: '#343434',
          fontSize: '15px',
          fontWeight: 300,
        }}
      />

      {/* Icons Container */}
      <div className="flex items-center gap-2">
        {/* Mic Icon */}
        <button 
          className="p-2 rounded-full hover:bg-gray-50 transition-colors"
          aria-label="Voice input"
        >
          <Mic 
            size={20} 
            strokeWidth={1.5}
            style={{ color: '#4A5F54' }}
          />
        </button>

        {/* Send Icon */}
        <button 
          className="p-2 rounded-full hover:bg-gray-50 transition-colors"
          aria-label="Send message"
        >
          <Send 
            size={20} 
            strokeWidth={1.5}
            style={{ color: '#4A5F54' }}
          />
        </button>
      </div>
    </div>
  );
}