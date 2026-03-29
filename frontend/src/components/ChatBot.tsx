import { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../api/client';
import { MessageCircle, X, Send, Sparkles, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: Array<{ id: number; name: string; price: number; category: string }>;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m SmartCart AI assistant. Ask me about products, recommendations, or help finding what you need!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await aiAPI.chat(userMessage, history);
      const data = res.data.data;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        products: data.products,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble right now. Please try again later.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${isOpen ? 'bg-gray-700 rotate-0' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '500px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">SmartCart AI</p>
              <p className="text-indigo-100 text-xs">Shopping Assistant</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5'
                  : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.products.slice(0, 3).map(p => (
                        <Link key={p.id} to={`/products/${p.id}`} onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2 bg-white/90 rounded-lg p-2 hover:bg-white transition text-gray-800">
                          <ShoppingBag className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium line-clamp-1">{p.name}</p>
                            <p className="text-xs text-indigo-600 font-bold">₹{p.price}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about products..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                disabled={loading} />
              <button type="submit" disabled={loading || !input.trim()}
                className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
