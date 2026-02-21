import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function MeetingDetail() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const response = await axios.get(`/api/meetings/${id}`);
        setMeeting(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch meeting:', err);
        setError('Failed to load meeting details.');
        setLoading(false);
      }
    };
    fetchMeeting();
  }, [id]);

  if (loading) return <div className="text-center p-8 animate-pulse text-gray-500">Loading meeting details...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!meeting) return <div className="text-center p-8">Meeting not found.</div>;

  const { title, content, summary, created_at } = meeting;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-gray-500 hover:text-blue-600 transition flex items-center font-medium">
          ← Back to List
        </Link>
        <div className="flex items-center gap-4">
          <Link 
            to={`/chat?meetingId=${id}`} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Ask Knowledge Base
          </Link>
          <span className="text-sm text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
            {new Date(created_at).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">{title}</h1>
        
        {/* Summary Sections */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Outline */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center pb-2 border-b border-gray-100">
              <span className="bg-blue-100 text-blue-600 p-1.5 rounded-md mr-2 text-sm">📑</span> 
              Meeting Outline
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 marker:text-blue-300">
              {summary.outline?.map((item, idx) => (
                <li key={idx} className="leading-relaxed pl-1">{item}</li>
              )) || <li className="text-gray-400 italic">No outline generated.</li>}
            </ul>
          </div>

          {/* Action Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center pb-2 border-b border-gray-100">
              <span className="bg-green-100 text-green-600 p-1.5 rounded-md mr-2 text-sm">✅</span> 
              Action Items
            </h3>
            <ul className="space-y-3">
              {summary.action_items?.map((item, idx) => (
                <li key={idx} className="flex items-start bg-green-50/50 p-3 rounded-lg border border-green-100 hover:bg-green-50 transition">
                  <div className="mt-1 mr-3 text-green-500">
                    <input type="checkbox" className="rounded border-green-300 text-green-600 focus:ring-green-500 cursor-pointer" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-800 block text-sm">{item.task}</span>
                    {item.owner && (
                      <div className="mt-1.5">
                        <span className="text-xs text-green-700 font-medium bg-green-100 px-2 py-0.5 rounded-md inline-block">
                          @{item.owner}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              )) || <li className="text-gray-400 italic">No action items found.</li>}
            </ul>
          </div>
        </div>

        {/* Knowledge Points */}
        <div className="mb-10">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center pb-2 border-b border-gray-100">
            <span className="bg-purple-100 text-purple-600 p-1.5 rounded-md mr-2 text-sm">💡</span> 
            Key Takeaways
          </h3>
          <div className="grid gap-3">
            {summary.knowledge_points?.map((point, idx) => (
              <div key={idx} className="bg-purple-50/50 p-4 rounded-lg border border-purple-100 text-gray-700 text-sm leading-relaxed hover:bg-purple-50 transition">
                {point}
              </div>
            )) || <p className="text-gray-400 italic">No knowledge points extracted.</p>}
          </div>
        </div>

        {/* Original Content Accordion (Simplified) */}
        <div className="border-t pt-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Original Transcript</h3>
          <div className="bg-gray-50 p-6 rounded-lg font-mono text-sm text-gray-600 whitespace-pre-wrap max-h-80 overflow-y-auto border border-gray-200 shadow-inner">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
