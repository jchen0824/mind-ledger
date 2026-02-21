const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { askQuestion } = require('../services/llm');

// Vercel environment detection
const isVercel = !!process.env.VERCEL;
const DATA_DIR = isVercel ? '/tmp' : path.join(__dirname, '../data');

const DATA_FILE = path.join(DATA_DIR, 'meetings.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Helper to read meetings
async function readMeetings() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error('Error reading meetings:', error);
    return [];
  }
}

// Helper to read sessions
async function readSessions() {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    console.error('Error reading sessions:', error);
    return {}; // Return empty object on error
  }
}

// Helper to write sessions
async function writeSessions(sessions) {
  try {
    await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error('Error writing sessions:', error);
  }
}

// Create a new session
router.post('/sessions', async (req, res) => {
  try {
    const sessionId = uuidv4();
    const sessions = await readSessions();
    sessions[sessionId] = {
      title: 'New Chat',
      created_at: new Date().toISOString(),
      messages: []
    };
    await writeSessions(sessions);
    res.json({ sessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get all sessions
router.get('/sessions', async (req, res) => {
  try {
    const showArchived = req.query.archived === 'true';
    const sessions = await readSessions();
    const list = Object.entries(sessions)
      .filter(([id, session]) => {
        // Handle legacy array format (always active)
        if (Array.isArray(session)) return !showArchived;
        // Handle object format
        return !!(session.archived) === showArchived;
      })
      .map(([id, session]) => {
        // Handle legacy array format
        if (Array.isArray(session)) {
          return { 
            id, 
            title: 'Chat History', 
            created_at: new Date().toISOString() 
          };
        }
        return {
          id,
          title: session.title || 'New Chat',
          created_at: session.created_at || new Date().toISOString()
        };
      });
    // Sort by created_at desc
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(list);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Update session (e.g. archive)
router.patch('/sessions/:id', async (req, res) => {
  try {
    const { archived } = req.body;
    const sessionId = req.params.id;
    const sessions = await readSessions();
    let session = sessions[sessionId];
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Convert legacy array to object if needed
    if (Array.isArray(session)) {
      session = {
        title: 'Chat History',
        created_at: new Date().toISOString(),
        messages: session,
        archived: false
      };
    }

    if (typeof archived !== 'undefined') {
      session.archived = !!archived;
    }

    sessions[sessionId] = session;
    await writeSessions(sessions);
    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete a session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const sessions = await readSessions();
    
    if (!sessions[sessionId]) {
      return res.status(404).json({ error: 'Session not found' });
    }

    delete sessions[sessionId];
    await writeSessions(sessions);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Get session history
router.get('/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const sessions = await readSessions();
    const session = sessions[sessionId];
    
    if (session) {
      if (Array.isArray(session)) {
        res.json({ sessionId, history: session });
      } else {
        res.json({ sessionId, history: session.messages, title: session.title });
      }
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.post('/', async (req, res) => {
  const { query, meetingId, sessionId } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    let context;
    const meetings = await readMeetings();

    // Load session history if sessionId is provided
    let history = [];
    let sessions = {};
    let sessionData = null;

    if (sessionId) {
      sessions = await readSessions();
      sessionData = sessions[sessionId];
      
      if (sessionData) {
        if (Array.isArray(sessionData)) {
          history = sessionData;
          // Migrate to object structure in memory (will be saved later)
          sessionData = {
            title: 'Chat History',
            created_at: new Date().toISOString(),
            messages: history
          };
          sessions[sessionId] = sessionData;
        } else {
          history = sessionData.messages || [];
        }
      } else {
        // Initialize if not exists
        sessionData = {
          title: 'New Chat',
          created_at: new Date().toISOString(),
          messages: []
        };
        sessions[sessionId] = sessionData;
      }
    }

    if (meetingId) {
      // Query specific meeting
      const meeting = meetings.find(m => m.id === meetingId);
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      // Use full content for single meeting context if available, or summary
      context = {
        title: meeting.title,
        content: meeting.content,
        summary: meeting.summary
      };
    } else {
      // Query all meetings (knowledge base)
      // For MVP, we pass all summaries as context.
      // We map to a smaller structure to avoid token limits if possible
      context = meetings.map(m => ({
        id: m.id,
        title: m.title,
        summary: m.summary,
        created_at: m.created_at
      }));
    }

    // Enable streaming
    const stream = await askQuestion(query, context, history, true);
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullAnswer = '';
    let buffer = '';

    stream.on('data', (chunk) => {
      // Forward raw chunk to client immediately
      res.write(chunk);

      // Buffer for history processing
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '');
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
              fullAnswer += data.choices[0].delta.content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });

    stream.on('end', async () => {
      res.end();
      
      // Update history
      if (sessionId && fullAnswer) {
        history.push({ role: 'user', content: query });
        history.push({ role: 'assistant', content: fullAnswer });
        // Keep last 20 messages to avoid token overflow
        if (history.length > 20) {
          history = history.slice(-20);
        }
        
        if (sessionData) {
          sessionData.messages = history;
          
          // Generate title if needed
          if (sessionData.title === 'New Chat') {
            const userMsg = history.find(m => m.role === 'user');
            if (userMsg) {
              sessionData.title = userMsg.content.substring(0, 30) + (userMsg.content.length > 30 ? '...' : '');
            }
          }
          sessions[sessionId] = sessionData;
        } else {
          // Fallback if sessionData was not initialized properly
          sessions[sessionId] = {
            title: query.substring(0, 30) + (query.length > 30 ? '...' : ''),
            created_at: new Date().toISOString(),
            messages: history
          };
        }
        
        await writeSessions(sessions);
      }
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.end();
    });

  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

module.exports = router;
