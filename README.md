# MindLedger

MindLedger is an intelligent meeting knowledge base application designed to help teams capture, summarize, and retrieve insights from their meetings. It leverages AI to automatically generate meeting summaries, extract action items, and provide a conversational interface for querying your meeting history.

## Features

- **Meeting Management**: Record and store meeting transcripts.
- **AI Summarization**: Automatically generates:
  - 📑 Meeting Outlines
  - ✅ Action Items with Owners
  - 💡 Key Takeaways/Knowledge Points
- **Knowledge Base Chat**:
  - Interactive Q&A with your meeting data.
  - Context-aware responses based on specific meetings or the entire knowledge base.
  - Streaming responses for a smooth user experience.
  - Session management (Create, Archive, Delete chats).
  - Markdown and Table support in chat responses.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, React Router, Axios
- **Backend**: Node.js, Express
- **AI/LLM**: MiniMax API (or compatible LLM service)
- **Data Storage**: JSON-based local storage (for MVP simplicity)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jchen0824/mind-ledger.git
   cd mind-ledger
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Configure Environment Variables
   cp .env.example .env
   # Edit .env and add your LLM API Key (e.g., MINIMAX_API_KEY)
   
   # Start the server
   node index.js
   ```
   The backend will run on `http://localhost:3000`.

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Start the development server
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`.

## Usage

1. Open the application in your browser.
2. Go to "Meetings" to view existing meeting summaries or add a new one.
3. Click "Knowledge Base Chat" (or "Chat with Meeting" from a detail page) to ask questions like:
   - "What were the action items for John?"
   - "Summarize the key decisions from last week."

## License

[MIT](LICENSE)
