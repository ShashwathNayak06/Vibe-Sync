import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'

//Load environment variables from the .env file
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Create an HTTP server and bind Socket.io to it
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // We'll restrict this to your frontend URL later for security
        methods: ["GET", "POST"]
    }
});

// Middleware to parse incoming JSON requests and allow cross-origin requests (CORS)
app.use(express.json())
app.use(cors())

app.get('/', (req,res) => {
    res.status(200).json({message: 'VibeSync API is running!'})
})

app.get('/api/search', async (req,res) => {
    try {
        //Etract the search query from the url 
        const searchQuery = req.query.q

        if(!searchQuery) {
            return res.status(400).json({error: 'Please provide a search query using the ?q= parameter.'})
        }

        const apiKey = process.env.YOUTUBE_API_KEY
        const maxResults = 5 //Limit results to keep it clean

        //Construct the official Youtube data api v3 url
        const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}&key=${apiKey}&videoCategoryId=10`; 
        // Note: videoCategoryId=10 restricts results strictly to the "Music" category!

        const response = await fetch(youtubeUrl)
        const data = await response.json()

        // Handle cases where the YouTube API returns an error (e.g., quota exceeded, bad key)
        if (data.error) {
            console.error("YouTube API Error:", data.error);
            return res.status(500).json({ error: 'Failed to fetch data from YouTube.' });
        }

        
        // We map over the raw data to extract only the pieces we care about for the queue
        const cleanResults = data.items.map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channelName: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.high.url
        }));

        // Send the clean array back to the client
        res.status(200).json({ results: cleanResults });

    } catch (error) {
        console.error("Server Error:", error)
        res.status(500).json({error:'An internal server erron occured.'})
    }
})

// --- REAL-TIME SOCKET LOGIC ---
io.on('connection', (socket) => {
    console.log(`🔌 New device connected: ${socket.id}`);

    // 1. Guest joins a specific room code
    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        console.log(`📱 User ${socket.id} joined room: ${roomCode}`);
    });

    // 2. Guest adds a song, tell everyone in the room to update their queue!
    socket.on('add_song', (data) => {
        const { roomCode, song } = data;
        console.log(`🎶 Song added to room ${roomCode}: ${song.title}`);
        
        // Broadcast the new song to everyone in that specific room
        io.to(roomCode).emit('queue_updated', song);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Device disconnected: ${socket.id}`);
    });
});

app.listen(PORT, () => {
    console.log(`🎵 VibeSync Backend is running on http://localhost:${PORT}`);
    console.log(`Try searching for a song: http://localhost:${PORT}/api/search?q=daft+punk`);
});