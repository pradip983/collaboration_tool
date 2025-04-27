const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/collaborative-editor', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Document Schema
const documentSchema = new mongoose.Schema({
  content: String,
  title: String,
  lastModified: { type: Date, default: Date.now }
});

const Document = mongoose.model('Document', documentSchema);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join-document', async (documentId) => {
    socket.join(documentId);
    
    // Load document content
    const document = await Document.findById(documentId);
    if (document) {
      socket.emit('load-document', document.content);
    }
  });

  socket.on('send-changes', (delta, documentId) => {
    socket.broadcast.to(documentId).emit('receive-changes', delta);
  });

  socket.on('save-document', async (content, documentId) => {
    await Document.findByIdAndUpdate(documentId, { content });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API Routes
app.post('/api/documents', async (req, res) => {
  try {
    const { title } = req.body;
    const document = new Document({ title, content: '' });
    await document.save();
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const documents = await Document.find();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});