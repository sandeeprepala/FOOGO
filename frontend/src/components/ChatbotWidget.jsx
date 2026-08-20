import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Sparkles, X, Send, Loader2, Minus, Utensils, ChevronRight, ShoppingBag, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import { chatbotService } from '../services/chatbotService';
import { formatCurrency } from '../utils/formatting';
import { ROLES } from '../constants';

export function ChatbotWidget() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  // ONLY render chatbot for customers (or logged out users who act as customer guests)
  const isPartner = user?.role === ROLES.RESTAURANT || user?.role === ROLES.DELIVERY_AGENT;
  if (isPartner) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 Hi! I'm your FOO GO Gourmet AI. Ask me about top restaurants, dishes, or recommendations near you!",
      results: []
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    '🍛 Best Biryani',
    '🍕 Artisan Pizza',
    '🥗 Healthy options',
    '🍰 Top Desserts'
  ];

  const handleSend = async (queryText) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      { id: userMsgId, sender: 'user', text: textToSend }
    ];
    setMessages(newMessages);
    setInputQuery('');
    setLoading(true);

    try {
      const response = await chatbotService.sendMessage(textToSend);
      if (response && response.message) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: response.message,
            results: response.results || []
          }
        ]);
      } else {
        throw new Error('No message returned');
      }
    } catch (err) {
      console.warn('Chatbot error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: "I couldn't fetch recommendations right now. Please make sure you are logged in or try again!",
          results: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    const resId = item.restaurant_id || 1;
    addToCart(resId, {
      id: item.menu_item_id || 'item-1',
      name: item.food_name || 'Gourmet Special',
      price: item.price || 299,
      description: item.description || ''
    }, 1);
    addToast(`Added "${item.food_name}" to your cart!`, 'success');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Minimized Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group flex items-center gap-2.5 px-4 py-3.5 bg-primary-olive hover:bg-primary-olive-hover text-white font-bold rounded-full shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 active:translate-y-0 border-2 border-white/20"
          aria-label="Open AI Food Assistant"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-primary-olive animate-ping" />
          </div>
          <span className="text-xs tracking-wide">FOO GO AI</span>
        </button>
      )}

      {/* Expanded Chatbot Window */}
      {isOpen && (
        <div className="w-[94vw] sm:w-[440px] md:w-[460px] h-[600px] max-h-[85vh] bg-surface-ivory rounded-3xl border border-border-light shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-forest-green p-4 flex items-center justify-between text-white border-b border-border-light/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-olive/30 flex items-center justify-center text-amber-300 border border-amber-300/30 shadow-inner">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base leading-tight flex items-center gap-1.5 text-white">
                  FOO GO AI Assistant
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                </h3>
                <p className="text-xs text-muted-sage font-medium">Smart RAG Food &amp; Restaurant Recommender</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Minimize Chat"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-surface-ivory/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}
              >
                {/* Text Bubble */}
                <div
                  className={`max-w-[88%] p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-primary-olive text-white rounded-br-none'
                      : 'bg-card-sage border border-border-light text-forest-green rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Structured RAG Results (Menu items or Restaurants) */}
                {msg.results && msg.results.length > 0 && (
                  <div className="w-full space-y-2.5 pt-1">
                    <p className="text-[11px] font-bold text-muted-sage uppercase tracking-wider pl-1">
                      Matched Options ({msg.results.length})
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {msg.results.map((res, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-white rounded-2xl border border-border-light shadow-card hover:border-primary-olive/40 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 overflow-hidden">
                            <h5 className="font-bold text-forest-green text-xs sm:text-sm truncate">
                              {res.food_name || res.restaurant_name}
                            </h5>
                            <p className="text-xs text-muted-sage truncate">
                              {res.restaurant_name ? `by ${res.restaurant_name}` : res.cuisine_type || res.address}
                            </p>
                            {res.price && (
                              <p className="text-xs sm:text-sm font-extrabold text-primary-olive">
                                {formatCurrency(res.price)}
                              </p>
                            )}
                          </div>

                          {res.type === 'menu_item' ? (
                            <button
                              onClick={() => handleAddToCart(res)}
                              className="px-3 py-2 bg-primary-olive hover:bg-primary-olive-hover text-white rounded-xl shadow-soft shrink-0 text-xs font-bold flex items-center gap-1 transition-all"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" /> Add
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                navigate(`/search?q=${encodeURIComponent(res.restaurant_name || '')}`);
                                setIsOpen(false);
                              }}
                              className="px-3 py-2 bg-card-sage hover:bg-border-light text-forest-green rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all"
                            >
                              <Store className="w-3.5 h-3.5" /> View
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Loader */}
            {loading && (
              <div className="flex items-center gap-2 text-muted-sage p-3 bg-card-sage/60 rounded-2xl border border-border-light/50 w-fit">
                <Loader2 className="w-4 h-4 animate-spin text-primary-olive" />
                <span className="text-xs font-medium italic">Searching gourmet knowledge base...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          <div className="px-3.5 py-2.5 bg-card-sage/30 border-t border-border-light/50 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="px-3 py-1.5 bg-white hover:bg-card-sage text-forest-green text-xs font-bold rounded-full border border-border-light shrink-0 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3.5 bg-surface-ivory border-t border-border-light flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask for dishes, biryani, pizza..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-card-sage border border-border-light rounded-full text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-olive text-text-charcoal placeholder:text-muted-sage"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="p-3 bg-primary-olive hover:bg-primary-olive-hover text-white rounded-full shadow-soft transition-all disabled:opacity-40 shrink-0"
              aria-label="Send query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
