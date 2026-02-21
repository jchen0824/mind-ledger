const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { summarizeMeeting } = require('../services/llm');

// Vercel environment detection
const isVercel = !!process.env.VERCEL;
const DATA_DIR = isVercel ? '/tmp' : path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'meetings.json');

// Ensure data directory exists (if not /tmp)
if (!isVercel) {
  // Check if directory exists, if not create it? 
  // Usually exists in local dev.
}

// Helper to read/write JSON
async function readMeetings() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If file doesn't exist, try to create it with empty array
      try {
        await fs.writeFile(DATA_FILE, '[]', 'utf8');
      } catch (writeError) {
        console.error('Failed to initialize meetings file:', writeError);
        // Fallback to empty array in memory if write fails (e.g. read-only fs)
        return [];
      }
      return [];
    }
    console.error('Error reading meetings:', error);
    return []; // Return empty array on other errors to avoid crash
  }
}

async function writeMeetings(meetings) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(meetings, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing meetings:', error);
    // Don't throw, just log. Data won't persist but app won't crash.
  }
}

// POST /api/meetings - Create meeting and summarize
router.post('/', async (req, res) => {
  const { content, title } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    // Call LLM to summarize
    console.log('Summarizing meeting...');
    const summary = await summarizeMeeting(content);
    console.log('Summary result:', summary);
    
    const newMeeting = {
      id: uuidv4(),
      title: title || `Meeting on ${new Date().toLocaleDateString()}`,
      content: content,
      summary: summary,
      created_at: new Date().toISOString()
    };

    const meetings = await readMeetings();
    meetings.push(newMeeting);
    await writeMeetings(meetings);

    res.status(201).json(newMeeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// GET /api/meetings - List all meetings
router.get('/', async (req, res) => {
  try {
    const meetings = await readMeetings();
    // Return summaries only for list view to save bandwidth if needed, 
    // but for MVP returning full object is fine.
    // Maybe sort by date descending
    meetings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/meetings/:id - Get single meeting details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const meetings = await readMeetings();
    const meeting = meetings.find(m => m.id === id);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json(meeting);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
