import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  fieldUpdates?: { field: string; value: string }[];
}

interface AICompanionProps {
  mode: 'voice' | 'text';
  onFieldUpdate: (field: string, value: string) => void;
  onModeChange: (mode: 'voice' | 'text') => void;
  context: 'application' | 'admin';
}

export function AICompanion({ mode, onFieldUpdate, onModeChange, context }: AICompanionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isAIConfigured, setIsAIConfigured] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const onFieldUpdateRef = useRef(onFieldUpdate);
  const hasReceivedWelcome = useRef(false);
  const modeRef = useRef(mode);

  const contextRef = useRef(context);

  // Keep refs updated
  onFieldUpdateRef.current = onFieldUpdate;
  modeRef.current = mode;
  contextRef.current = context;

  // Check AI configuration status
  // The AI assistant shows "Connected" only when both WebSocket is connected AND AI is configured
  // AI is configured when the backend has OPENAI_API_KEY environment variable set
  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const response = await fetch('/api/budget/status');
        // If we can reach the API, assume AI is configured (backend checks this)
        if (response.ok) {
          setIsAIConfigured(true);
        }
      } catch (error) {
        console.error('Failed to check AI status:', error);
        setIsAIConfigured(false);
      }
    };

    checkAIStatus();
    // Check AI status periodically to detect configuration changes
    const interval = setInterval(checkAIStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Reset messages and notify server when context changes
  useEffect(() => {
    setMessages([]);
    hasReceivedWelcome.current = false;
    // Notify server of context change
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'setContext', context }));
    }
  }, [context]);

  useEffect(() => {
    // Connect to WebSocket through Vite proxy (same port as frontend)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      setIsConnected(true);
      // Send initial context
      ws.send(JSON.stringify({ type: 'setContext', context: contextRef.current }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setIsThinking(false);
        setStatus(null);
        
        // Skip welcome messages from server - we show our own based on context
        const isWelcome = data.data.message.includes("help you apply for a grant");
        if (isWelcome) {
          // Only show applicant welcome in applicant context
          if (contextRef.current !== 'application' || hasReceivedWelcome.current) {
            return;
          }
          hasReceivedWelcome.current = true;
        }

        const msg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.data.message,
          fieldUpdates: data.data.fieldUpdates,
        };
        setMessages((prev) => [...prev, msg]);

        // Apply field updates
        data.data.fieldUpdates?.forEach((update: { field: string; value: string }) => {
          onFieldUpdateRef.current(update.field, update.value);
        });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []); // Empty deps - connect only once

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim() || !wsRef.current) return;

    const msg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, msg]);

    // Show thinking status
    setIsThinking(true);
    setStatus('Thinking...');

    wsRef.current.send(JSON.stringify({ type: 'chat', message: text }));
    setInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const toggleVoice = () => {
    if (mode === 'voice') {
      onModeChange('text');
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    } else {
      onModeChange('voice');
      startListening();
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser');
      onModeChange('text');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setStatus('Transcribing...');
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Use ref to get current mode value (not stale closure)
      if (modeRef.current === 'voice') {
        setTimeout(() => startListening(), 500);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {context === 'application' ? '💬 AI Assistant' : '🤖 Analysis Assistant'}
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isConnected && isAIConfigured ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span 
            className="text-sm text-dove-500"
            title={
              !isConnected 
                ? 'WebSocket connection failed'
                : !isAIConfigured 
                  ? 'AI not configured - add OPENAI_API_KEY to backend .env file'
                  : 'AI assistant is ready'
            }
          >
            {isConnected && isAIConfigured ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="flex-1 bg-dove-50 rounded-lg p-4 mb-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center mt-8">
            {!isAIConfigured ? (
              <div className="text-dove-500">
                <p className="mb-2">🤖 AI Assistant is not configured</p>
                <p className="text-sm">Please configure the OpenAI API key to enable AI assistance.</p>
                <p className="text-sm mt-2">You can still use the form manually.</p>
              </div>
            ) : (
              <p className="text-dove-500">
                {context === 'application'
                  ? "Hi! I'm here to help you apply for a grant. Tell me about your project!"
                  : "Hi! I'm here to help you manage grants. Ask me about reviewing applications, budget allocation, or ranking criteria."}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-dove-600 text-white'
                      : 'bg-white border border-dove-200'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-dove-800">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                  {msg.fieldUpdates && msg.fieldUpdates.length > 0 && (
                    <div className="mt-2 text-xs opacity-75">
                      Updated: {msg.fieldUpdates.map((u) => u.field).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Status indicator */}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-dove-100 border border-dove-200 rounded-lg px-4 py-2 text-dove-600 animate-pulse">
                  {status || 'Thinking...'}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            !isAIConfigured 
              ? 'AI not configured - use form manually'
              : isListening 
                ? '🎙️ Listening... speak now' 
                : 'Type your message...'
          }
          disabled={!isAIConfigured || (mode === 'voice' && isListening)}
          className={`flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-dove-500 ${
            !isAIConfigured 
              ? 'border-dove-200 bg-dove-100 text-dove-400'
              : isListening 
                ? 'border-red-400 bg-red-50 animate-pulse' 
                : 'border-dove-300'
          }`}
        />
        <button
          type="submit"
          disabled={!isAIConfigured || !input.trim()}
          className={`${context === 'admin' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-sky-500 hover:bg-sky-600'} text-white px-4 py-2 rounded-lg disabled:opacity-50`}
        >
          Send
        </button>
        <button
          type="button"
          onClick={toggleVoice}
          disabled={!isAIConfigured}
          className={`px-4 py-2 rounded-lg disabled:opacity-50 ${
            !isAIConfigured
              ? 'bg-dove-200 text-dove-400 cursor-not-allowed'
              : mode === 'voice'
                ? 'bg-red-500 text-white'
                : 'bg-dove-200 text-dove-700 hover:bg-dove-300'
          }`}
        >
          {isListening ? '🔴' : '🎤'}
        </button>
      </form>
    </div>
  );
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInterface;
    webkitSpeechRecognition: new () => SpeechRecognitionInterface;
  }
}
