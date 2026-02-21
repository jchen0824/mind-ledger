const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { summarizeMeeting } = require('../services/llm');

const DATA_FILE = path.join(__dirname, '../data/meetings.json');

// Helper to read/write JSON
async function readMeetings() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If file doesn't exist, create it with empty array
      await fs.writeFile(DATA_FILE, '[]', 'utf8');
      return [];
    }
    throw error;
  }
}

async function writeMeetings(meetings) {
  await fs.writeFile(DATA_FILE, JSON.stringify(meetings, null, 2), 'utf8');
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
