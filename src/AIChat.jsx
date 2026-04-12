import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send } from 'lucide-react';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')
).replace(/\/$/, '');

const formatInlineText = (text) => {
  const segments = String(text || '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return segments.map((segment, idx) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={`strong-${idx}`}>{segment.slice(2, -2)}</strong>;
    }
    return <span key={`text-${idx}`}>{segment}</span>;
  });
};

const renderMessageText = (text) => {
  const lines = String(text || '').split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="chat-list">
          {listItems.map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      elements.push(<div key={`space-${idx}`} className="chat-spacer" />);
      return;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2));
      return;
    }

    flushList();

    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${idx}`} className="chat-heading">
          {formatInlineText(line.slice(4))}
        </h4>
      );
      return;
    }

    elements.push(
      <p key={`p-${idx}`} className="chat-paragraph">
        {formatInlineText(line)}
      </p>
    );
  });

  flushList();
  return elements;
};

const AIChat = ({ currentTournament, financialContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: 'Hi! I\'m your Expense Calculator Assistant. Ask me anything about your tournament expenses, collections, or settlements. 💰'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = async (userMessage) => {
    try {
      const fallbackContext = {
        totalExpenses: currentTournament?.expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0,
        totalCollection: (currentTournament?.collections?.reduce((sum, c) => sum + (c.isRefund ? 0 : (Number(c.amount) || 0)), 0) || 0)
          - (currentTournament?.collections?.reduce((sum, c) => sum + (c.isRefund ? (Number(c.amount) || 0) : 0), 0) || 0),
        profit: 0,
        sidInvestment: 0,
        vishInvestment: 0,
        categoryBreakdown: {
          court: 0,
          shuttle: 0,
          referee: 0,
          food: 0,
          others: 0
        }
      };

      fallbackContext.profit = fallbackContext.totalCollection - fallbackContext.totalExpenses;

      const contextPayload = financialContext || fallbackContext;
      const tournamentInfo = {
        name: currentTournament?.name || 'Unknown Tournament',
        date: currentTournament?.date || '',
        club: currentTournament?.club || ''
      };

      const context = [
        'You are a financial assistant for badminton tournament organizers.',
        'You analyze expenses, collections, refunds, and final settlement.',
        'Give clear, short, data-driven insights. Avoid generic advice.',
        'Always use Indian Rupees (₹), percentages, and concrete numeric references from the data.',
        '',
        `Tournament: ${JSON.stringify(tournamentInfo)}`,
        `Financial Context: ${JSON.stringify(contextPayload)}`
      ].join('\n');

      // Create conversation messages array and include the latest user message.
      const conversationMessages = messages
        .filter(m => m.type !== 'ai' || m.text !== 'Hi! I\'m your Expense Calculator Assistant. Ask me anything about your tournament expenses, collections, or settlements. 💰')
        .map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.text
        }));

      conversationMessages.push({
        role: 'user',
        content: userMessage
      });

      console.log('📤 Sending to backend:', { messageCount: conversationMessages.length });

      // Call local backend instead of Azure directly
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationMessages,
          context: context
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Response received from backend');
      return data.response;
      
    } catch (error) {
      console.error('❌ Error fetching AI response:', error);
      
      // Return user-friendly error message
      const errorMsg = error.message || 'Unknown error occurred';
      
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('localhost')) {
        return 'Backend error: Make sure the backend server is running and VITE_API_BASE_URL is set correctly.';
      } else if (errorMsg.includes('Azure')) {
        return '🔑 Azure Configuration Error: Check your .env file has correct Azure OpenAI credentials.';
      }
      
      return `❌ Error: ${errorMsg}`;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: input
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Get AI response
    const aiResponse = await generateAIResponse(input);
    
    const aiMessage = {
      id: messages.length + 2,
      type: 'ai',
      text: aiResponse
    };
    setMessages(prev => [...prev, aiMessage]);
    setLoading(false);
  };

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          className="chat-toggle-btn"
          onClick={() => setIsOpen(true)}
          title="Open AI Assistant"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Widget */}
      <div className={`chat-widget ${!isOpen ? 'chat-widget-hidden' : ''}`}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-title">
            <span>🤖 AI Assistant</span>
          </div>
          <button
            className="chat-close"
            onClick={() => setIsOpen(false)}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-message ${msg.type}`}>
              {renderMessageText(msg.text)}
            </div>
          ))}
          
          {loading && (
            <div className="chat-loading">
              <div className="chat-loading-dot"></div>
              <div className="chat-loading-dot"></div>
              <div className="chat-loading-dot"></div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="chat-input-area">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask about expenses..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="chat-send"
            disabled={loading || !input.trim()}
            title="Send"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </>
  );
};

export default AIChat;
