import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Home() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/meetings');
      setMeetings(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
      setError('Failed to load meetings. Is the backend running?');
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-8 text-xl text-gray-600 animate-pulse">Loading meetings...</div>;
  if (error) return (
    <div className="text-center p-8">
      <div className="text-red-500 text-lg mb-2">{error}</div>
      <button onClick={fetchMeetings} className="text-blue-600 hover:underline">Retry</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Meetings</h1>
        <Link to="/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium">
          + New Meeting
        </Link>
      </div>
      
      {meetings.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center border border-gray-100">
          <div className="text-gray-300 text-6xl mb-4">📝</div>
          <p className="text-gray-500 text-lg mb-6">No meetings recorded yet.</p>
          <Link to="/new" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
            Summarize Your First Meeting
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {meetings.map((meeting) => (
            <Link key={meeting.id} to={`/meeting/${meeting.id}`} className="block group">
              <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 group-hover:border-blue-200">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-semibold text-gray-900 truncate flex-1 pr-4 group-hover:text-blue-600 transition">{meeting.title}</h2>
                  <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full whitespace-nowrap border border-gray-100">
                    {new Date(meeting.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-600 line-clamp-2 mb-4 text-sm leading-relaxed">
                  {meeting.content}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {meeting.summary?.knowledge_points?.slice(0, 3).map((point, idx) => (
                    <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 truncate max-w-[200px]">
                      {point}
                    </span>
                  ))}
                  {meeting.summary?.knowledge_points?.length > 3 && (
                    <span className="text-xs text-gray-400 py-1 pl-1">+{meeting.summary.knowledge_points.length - 3} more</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
