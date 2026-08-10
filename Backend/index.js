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
// In-memory store for room queues
const rooms = {};

const broadcastQueue = (roomCode) => {
    if (rooms[roomCode]) {
        // Sort the queue descending by votes
        rooms[roomCode].queue.sort((a, b) => b.votes - a.votes);
        io.to(roomCode).emit('queue_updated', rooms[roomCode].queue);
    }
};

io.on('connection', (socket) => {
    console.log(`🔌 New device connected: ${socket.id}`);

    // 1. Join a specific room code (Host or Guest)
    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        // Initialize room if it doesn't exist
        if (!rooms[roomCode]) {
            rooms[roomCode] = { queue: [] };
        }
        console.log(`📱 User ${socket.id} joined room: ${roomCode}`);
        // Send current queue to the user who just joined
        socket.emit('queue_updated', rooms[roomCode].queue);
    });

    // 2. Add a song to the room's queue
    socket.on('add_song', (data) => {
        const { roomCode, song } = data;
        if (!rooms[roomCode]) return;
        
        const newSong = {
            ...song,
            queueId: Math.random().toString(36).substring(2, 9), // Unique ID in queue
            votes: 0,
            votedBy: {} // keep track of socket.id's that voted to prevent multi-voting and allow undo
        };

        rooms[roomCode].queue.push(newSong);
        console.log(`🎶 Song added to room ${roomCode}: ${song.title}`);
        
        broadcastQueue(roomCode);
    });

    // 3. Vote on a song
    socket.on('vote_song', (data) => {
        const { roomCode, queueId, vote } = data;
        if (!rooms[roomCode]) return;

        const song = rooms[roomCode].queue.find(s => s.queueId === queueId);
        if (song) {
            const currentVote = song.votedBy[socket.id];
            
            if (currentVote === vote) {
                // Undo vote if clicking the same button
                song.votes -= vote;
                delete song.votedBy[socket.id];
            } else if (currentVote) {
                // Change vote (e.g. from -1 to 1)
                song.votes = song.votes - currentVote + vote;
                song.votedBy[socket.id] = vote;
            } else {
                // New vote
                song.votes += vote;
                song.votedBy[socket.id] = vote;
            }
            
            console.log(`👍 Vote cast in ${roomCode} for ${song.title}: ${song.votes} votes`);
            broadcastQueue(roomCode);
        }
    });

    // 4. Remove a song from queue and broadcast now playing
    socket.on('song_ended', (data) => {
        const { roomCode, queueId } = data;
        if (!rooms[roomCode]) return;

        rooms[roomCode].queue = rooms[roomCode].queue.filter(s => s.queueId !== queueId);
        console.log(`⏭️ Song removed from queue in ${roomCode}.`);
        broadcastQueue(roomCode);
    });

    // 5. Sync playback state (Host broadcasts to Guests)
    socket.on('play_song', (data) => {
        const { roomCode, song } = data;
        if (!rooms[roomCode]) return;

        rooms[roomCode].nowPlaying = song;
        console.log(`▶️ Now playing in ${roomCode}: ${song ? song.title : 'None'}`);
        // Broadcast to everyone in the room (including guests)
        io.to(roomCode).emit('now_playing', song);
    });

    // Send current state to newly joined users
    socket.on('request_state', (roomCode) => {
        if (rooms[roomCode]) {
            socket.emit('now_playing', rooms[roomCode].nowPlaying || null);
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Device disconnected: ${socket.id}`);
        // Optional: cleanup empty rooms if all users leave
    });
});

// IMPORTANT: use server.listen instead of app.listen to bind Socket.io properly
server.listen(PORT, () => {
    console.log(`🎵 VibeSync Backend is running on http://localhost:${PORT}`);
    console.log(`Try searching for a song: http://localhost:${PORT}/api/search?q=daft+punk`);
});