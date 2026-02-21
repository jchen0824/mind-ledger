import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Chat() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I can answer questions about your meeting notes. What would you like to know?' }
  ]);
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(searchParams.get('meetingId') || '');
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewArchived, setViewArchived] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`/api/chat/sessions?archived=${viewArchived}`);
      setSessions(response.data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [viewArchived]);

  const archiveSession = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.patch(`/api/chat/sessions/${id}`, { archived: !viewArchived });
      
      if (sessionId === id && !viewArchived) {
        // If archiving current active session, switch to another one
        const remaining = sessions.filter(s => s.id !== id);
        if (remaining.length > 0) {
          switchSession(remaining[0].id);
        } else {
          startNewSession(true);
        }
      }
      fetchSessions();
    } catch (err) {
      console.error('Failed to update session:', err);
    }
  };

  const deleteSession = (id, e) => {
    e.stopPropagation();
    setDeletingSessionId(id);
  };

  const confirmDelete = async () => {
    if (!deletingSessionId) return;

    try {
      await axios.delete(`/api/chat/sessions/${deletingSessionId}`);
      
      const remaining = sessions.filter(s => s.id !== deletingSessionId);
      setSessions(remaining); // Optimistic update

      if (sessionId === deletingSessionId) {
        if (remaining.length > 0) {
          switchSession(remaining[0].id);
        } else {
          startNewSession(true);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      fetchSessions(); // Revert on error
    } finally {
      setDeletingSessionId(null);
    }
  };

  const startNewSession = async (forceNew = false) => {
    // Try to restore session if not forcing new
    if (!forceNew) {
      const savedSessionId = localStorage.getItem('chatSessionId');
      if (savedSessionId) {
        try {
          const response = await axios.get(`/api/chat/sessions/${savedSessionId}`);
          setSessionId(savedSessionId);
          if (response.data.history && response.data.history.length > 0) {
            setMessages(response.data.history);
          } else {
            setMessages([
              { role: 'assistant', content: 'Hello! I can answer questions about your meeting notes. What would you like to know?' }
            ]);
          }
          fetchSessions();
          return;
        } catch (err) {
          console.warn('Failed to restore session, creating new one:', err);
          localStorage.removeItem('chatSessionId');
        }
      }
    }

    try {
      const response = await axios.post('/api/chat/sessions');
      const newSessionId = response.data.sessionId;
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
      setMessages([
        { role: 'assistant', content: 'Hello! I can answer questions about your meeting notes. What would you like to know?' }
      ]);
      fetchSessions();
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const switchSession = async (id) => {
    if (id === sessionId) return;
    try {
      const response = await axios.get(`/api/chat/sessions/${id}`);
      setSessionId(id);
      localStorage.setItem('chatSessionId', id);
      if (response.data.history && response.data.history.length > 0) {
        setMessages(response.data.history);
      } else {
        setMessages([
          { role: 'assistant', content: 'Hello! I can answer questions about your meeting notes. What would you like to know?' }
        ]);
      }
    } catch (err) {
      console.error('Failed to switch session:', err);
    }
  };

  useEffect(() => {
    // Initialize session
    startNewSession();
    fetchSessions();

    // Fetch meetings for filter dropdown
    const fetchMeetings = async () => {
      try {
        const response = await axios.get('/api/meetings');
        setMeetings(response.data);
      } catch (err) {
        console.error('Failed to fetch meetings for filter:', err);
      }
    };
    fetchMeetings();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          meetingId: selectedMeetingId || undefined,
          sessionId: sessionId
        })
      });

      if (!response.ok) throw new Error(response.statusText);

      // Add placeholder for assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessageContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
           if (line.trim() === '') continue;
           if (line.startsWith('data: ')) {
             const dataStr = line.replace('data: ', '');
             if (dataStr === '[DONE]') break;
             try {
               const data = JSON.parse(dataStr);
               if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                 const content = data.choices[0].delta.content;
                 assistantMessageContent += content;
                 
                 setMessages(prev => {
                   const newMsgs = [...prev];
                   const lastMsg = newMsgs[newMsgs.length - 1];
                   if (lastMsg.role === 'assistant') {
                     lastMsg.content = assistantMessageContent;
                   }
                   return newMsgs;
                 });
               }
             } catch (e) {
               // ignore
             }
           }
        }
      }

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => {
        // Check if last message is empty assistant message (failed before streaming started)
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === 'assistant' && lastMsg.content === '') {
             const newMsgs = [...prev];
             newMsgs[newMsgs.length - 1].content = 'Sorry, I encountered an error while processing your request.';
             return newMsgs;
        }
        return [...prev, { role: 'assistant', content: 'Sorry, I encountered an error while processing your request.' }];
      });
    } finally {
      setLoading(false);
      fetchSessions();
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div 
        className={`bg-gray-50 border-r border-gray-200 flex flex-col hidden md:flex transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full overflow-hidden border-none'
        }`}
      >
        <div className="p-4 border-b border-gray-200 min-w-[16rem]">
          <button
            onClick={() => startNewSession(true)}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition shadow-sm font-medium flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-w-[16rem]">
          {sessions.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">
              {viewArchived ? "No archived chats" : "No active chats"}
            </div>
          )}
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => switchSession(s.id)}
              className={`group relative p-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 transition-colors ${sessionId === s.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
            >
              <div className={`font-medium text-sm truncate pr-6 ${sessionId === s.id ? 'text-blue-700' : 'text-gray-700'}`}>{s.title}</div>
              <div className="text-xs text-gray-400 mt-1">{new Date(s.created_at).toLocaleDateString()}</div>
              
              <div className="absolute right-2 top-3 z-10 opacity-0 group-hover:opacity-100 flex gap-1">
                <button
                  onClick={(e) => archiveSession(s.id, e)}
                  className="p-1 bg-white rounded shadow text-gray-400 hover:text-blue-500 transition-all"
                  title={viewArchived ? "Unarchive chat" : "Archive chat"}
                >
                  {viewArchived ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className="p-1 bg-white rounded shadow text-gray-400 hover:text-red-500 transition-all"
                  title="Delete chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 min-w-[16rem] bg-gray-50">
          <button
            onClick={() => setViewArchived(!viewArchived)}
            className="w-full text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded transition"
          >
            {viewArchived ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
                Show Active Chats
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Show Archived Chats
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors hidden md:block"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800">Chat</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Context:</span>
            <select
              value={selectedMeetingId}
              onChange={(e) => setSelectedMeetingId(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm max-w-xs"
            >
              <option value="">All Meetings (Global)</option>
              {meetings.map(m => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm prose prose-sm max-w-none'
              }`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      ul: ({node, ...props}) => <ul className="list-disc ml-4 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal ml-4 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="pl-1" {...props} />,
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                      code: ({node, inline, ...props}) => (
                        inline 
                          ? <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800" {...props} />
                          : <code className="block bg-gray-100 p-3 rounded-lg text-sm font-mono text-gray-800 overflow-x-auto my-2" {...props} />
                      ),
                      table: ({node, ...props}) => <div className="overflow-x-auto my-2 rounded-lg border border-gray-200"><table className="min-w-full divide-y divide-gray-200" {...props} /></div>,
                      thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                      tbody: ({node, ...props}) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
                      tr: ({node, ...props}) => <tr className="" {...props} />,
                      th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
                      td: ({node, ...props}) => <td className="px-3 py-2 text-sm text-gray-500" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 px-5 py-4 rounded-2xl rounded-bl-sm shadow-sm flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your meetings..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className={`px-6 py-3 rounded-lg font-medium text-white transition shadow-sm flex items-center ${
                loading || !query.trim() 
                  ? 'bg-blue-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingSessionId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Chat?</h3>
            <p className="text-gray-600 mb-6 text-sm">This action cannot be undone. Are you sure you want to permanently delete this chat?</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeletingSessionId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
