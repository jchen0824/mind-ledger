const axios = require('axios');

const MINIMAX_API_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2';

async function callMiniMax(messages, options = {}) {
  const apiKey = process.env.MINIMAX_API_KEY ? process.env.MINIMAX_API_KEY.trim() : '';
  const groupId = process.env.MINIMAX_GROUP_ID ? process.env.MINIMAX_GROUP_ID.trim() : '';
  const { stream = false } = options;

  if (!apiKey) {
    console.error('MiniMax API Key is missing');
    
    // Check if this is a summary request
    const isSummary = messages.some(m => m.content.includes('summarizes meetings into JSON'));
    
    if (isSummary) {
      // Return mock data for summary
      return JSON.stringify({
        outline: ["Mock Outline 1: Introduction", "Mock Outline 2: Main Discussion"],
        action_items: [{ task: "Configure API Key", owner: "Developer" }],
        knowledge_points: ["MiniMax API Key is required for real summaries."]
      });
    } else {
      // Return mock answer for chat
      return "This is a mock answer because the MiniMax API Key is missing. Please configure MINIMAX_API_KEY in backend/.env to get real answers.";
    }
  }

  const url = groupId ? `${MINIMAX_API_URL}?GroupId=${groupId}` : MINIMAX_API_URL;

  try {
    const response = await axios.post(
      url,
      {
        model: 'MiniMax-M2.5',
        messages: messages,
        temperature: 0.1,
        top_p: 0.95,
        stream: stream
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: stream ? 'stream' : 'json'
      }
    );

    if (stream) {
      return response.data;
    }
    
    if (response.data.base_resp && response.data.base_resp.status_code !== 0) {
      throw new Error(`MiniMax API Error: ${response.data.base_resp.status_msg} (Code: ${response.data.base_resp.status_code})`);
    }

    if (response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Invalid response from MiniMax API');
    }
  } catch (error) {
    console.error('Error calling MiniMax API:', error.response ? error.response.data : error.message);
    throw error;
  }
}

async function summarizeMeeting(content) {
  const prompt = `
    You are an expert meeting assistant. Please analyze the following meeting notes and extract structured information.
    Return the result in valid JSON format with the following keys:
    - outline: A hierarchical outline of the meeting content (array of strings or objects).
    - action_items: A list of action items, each with "task" and "owner" (if mentioned).
    - knowledge_points: Key takeaways or knowledge points (array of strings).

    Meeting Notes:
    ${content}
    
    Ensure the output is ONLY valid JSON without markdown formatting.
  `;

  const messages = [
    { role: 'system', content: 'You are a helpful assistant that summarizes meetings into JSON. User MiniMax-2.5.' },
    { role: 'user', content: prompt }
  ];

  try {
    let result = await callMiniMax(messages);
    // Clean up markdown code blocks if present
    const jsonString = result.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse summary JSON", e);
    // Fallback
    return {
      outline: ["Summary failed"],
      action_items: [],
      knowledge_points: []
    };
  }
}

async function askQuestion(query, context, history = [], stream = false) {
  const systemPrompt = `
    You are a helpful assistant with access to a meeting knowledge base.
    Use the following context to answer the user's question.
    If the answer is not in the context, say so politely.

    Context:
    ${JSON.stringify(context).substring(0, 10000)} // Limit context size
  `;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: query }
  ];

  return await callMiniMax(messages, { stream });
}

module.exports = { summarizeMeeting, askQuestion };
