import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Schemas & Models
const watchlistSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true, trim: true },
  targetSellPrice: { type: Number, default: null },
  targetLossPrice: { type: Number, default: null },
  status: { type: String, enum: ['pending', 'triggered'], default: 'pending' },
  triggeredAt: { type: Date, default: null }
}, { collection: 'watchlist' });

// Ensure unique symbols in watchlist to avoid duplicate tracking
watchlistSchema.index({ symbol: 1 }, { unique: true });

const alertHistorySchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true, trim: true },
  targetSellPrice: { type: Number, default: null },
  targetLossPrice: { type: Number, default: null },
  triggerPrice: { type: Number, required: true },
  triggerType: { type: String, required: true },
  triggerTarget: { type: Number, required: true },
  recommendation: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { collection: 'alerts_history' });

const Watchlist = mongoose.model('Watchlist', watchlistSchema);
const AlertHistory = mongoose.model('AlertHistory', alertHistorySchema);

// REST API Endpoints

// 0. Root Endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the NEPSE AI Portfolio Risk API Server',
    status: 'online',
    endpoints: {
      status: '/api/status',
      watchlist: '/api/watchlist',
      alerts: '/api/alerts',
      chat: '/api/chat'
    }
  });
});

// 1. Health & Connection Status Check
app.get('/api/status', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  res.json({
    status: 'online',
    database: states[dbStatus] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// 2. Fetch Watchlist Items
app.get('/api/watchlist', async (req, res) => {
  try {
    const items = await Watchlist.find({});
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch watchlist items.', message: error.message });
  }
});

// 3. Add Item to Watchlist
app.post('/api/watchlist', async (req, res) => {
  const { symbol, targetSellPrice, targetLossPrice } = req.body;
  if (!symbol) {
    return res.status(400).json({ error: 'Stock symbol is required.' });
  }

  try {
    const formattedSymbol = symbol.toUpperCase().trim();
    // Check if stock is already on watchlist
    const existing = await Watchlist.findOne({ symbol: formattedSymbol });
    if (existing) {
      return res.status(400).json({ error: `Stock ${formattedSymbol} is already in the watchlist.` });
    }

    const newItem = new Watchlist({
      symbol: formattedSymbol,
      targetSellPrice: targetSellPrice ? parseFloat(targetSellPrice) : null,
      targetLossPrice: targetLossPrice ? parseFloat(targetLossPrice) : null,
      status: 'pending'
    });

    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save watchlist item.', message: error.message });
  }
});

// 4. Delete Item from Watchlist
app.delete('/api/watchlist/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Watchlist.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Watchlist item not found.' });
    }
    res.json({ success: true, message: 'Stock removed from watchlist.', item: deleted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete watchlist item.', message: error.message });
  }
});

// 5. Fetch Triggered Alert History
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await AlertHistory.find({}).sort({ timestamp: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alert history.', message: error.message });
  }
});

// 6. Delete Alert History Log
app.delete('/api/alerts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await AlertHistory.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Alert log not found.' });
    }
    res.json({ success: true, message: 'Alert history log deleted.', item: deleted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete alert log.', message: error.message });
  }
});

// 7. Chat Assistant with Stock Context
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  try {
    // Fetch data context
    const watchlist = await Watchlist.find({});
    const alerts = await AlertHistory.find({}).sort({ timestamp: -1 }).limit(10);

    const watchlistText = watchlist.map(w => 
      `- Symbol: ${w.symbol}, TP Target: Rs. ${w.targetSellPrice || 'None'}, SL Target: Rs. ${w.targetLossPrice || 'None'}, Status: ${w.status}`
    ).join('\n');

    const alertsText = alerts.map(a => 
      `- Symbol: ${a.symbol}, Trigger Type: ${a.triggerType}, Target: Rs. ${a.triggerTarget}, Price Hit: Rs. ${a.triggerPrice}, Time: ${a.timestamp.toISOString()}`
    ).join('\n');

    const promptText = `
You are an on-screen stock analyst assistant for the "NEPSE Alert AI" system. You have access to the user's live stock watchlist and recent alerts history from their MongoDB database.
Use this context to answer the user's questions professionally, concisely, and helpfully. Always explain trading risks (like stop loss value or taking profits) when relevant.
Keep your response to a maximum of 3 sentences. Do not use complex markdown formatting or HTML.

User's database context:
[WATCHLIST]:
${watchlistText || '(Watchlist is currently empty)'}

[RECENT ALERTS]:
${alertsText || '(No alerts triggered yet)'}

User's Question:
"${message}"
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: 'Failed to retrieve response from Gemini API.', details: errText });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    res.json({ reply: replyText.trim() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process chat request.', message: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Express API Server running on port ${PORT}`);
});
