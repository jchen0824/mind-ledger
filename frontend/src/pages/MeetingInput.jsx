import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function MeetingInput() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/meetings', {
        title,
        content
      });
      // Redirect to detail page
      navigate(`/meeting/${response.data.id}`);
    } catch (err) {
      console.error('Failed to summarize meeting:', err);
      setError('Failed to summarize meeting. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">New Meeting Summary</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 flex items-center">
          <span className="mr-2">⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
            Meeting Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
            placeholder="e.g. Weekly Sync - Feb 21"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
            Meeting Notes / Transcript <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-y font-mono text-sm leading-relaxed text-gray-800"
              placeholder="Paste your meeting notes here..."
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none">
              {content.length} chars
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`px-8 py-3 rounded-lg text-white font-medium shadow-sm transition flex items-center text-lg ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Summarizing...
              </>
            ) : (
              'Generate Summary ✨'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
