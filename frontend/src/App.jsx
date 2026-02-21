import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import MeetingInput from './pages/MeetingInput';
import MeetingDetail from './pages/MeetingDetail';
import Chat from './pages/Chat';
import './App.css'; // Assuming Tailwind is configured here or in index.css

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 font-sans">
        <nav className="bg-white shadow-md mb-6 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600 hover:text-blue-800 transition">MindLedger</Link>
            <div className="space-x-6 text-lg font-medium">
              <Link to="/" className="text-gray-600 hover:text-blue-500 transition">Meetings</Link>
              <Link to="/chat" className="text-gray-600 hover:text-blue-500 transition">Knowledge Base Chat</Link>
            </div>
          </div>
        </nav>
        <div className="container mx-auto px-6 pb-12">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<MeetingInput />} />
            <Route path="/meeting/:id" element={<MeetingDetail />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
