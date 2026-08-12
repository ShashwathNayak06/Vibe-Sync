import { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import { Search, Plus, ThumbsUp, ThumbsDown, Music, ArrowLeft, Play, Pause } from 'lucide-react';

function GuestView({ roomCode, socket, setView }) {
  const [queue, setQueue] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'search'
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerTarget, setPlayerTarget] = useState(null);
  const [hostSync, setHostSync] = useState(null);
  const guestPaused = useRef(false);

  const onPlayerReady = (event) => {
    setPlayerTarget(event.target);
    // Let the host_sync effect handle seeking and playing
  };

  const onPlayerStateChange = (event) => {
    setIsPlaying(event.data === 1); // 1 is playing
  };

  useEffect(() => {
    if (!playerTarget || !hostSync || guestPaused.current) return;
    
    const { isPlaying: hostPlaying, currentTime, timestamp } = hostSync;
    const expectedTime = hostPlaying ? currentTime + (Date.now() - timestamp) / 1000 : currentTime;
    
    const guestTime = playerTarget.getCurrentTime();
    if (Math.abs(guestTime - expectedTime) > 2) {
      playerTarget.seekTo(expectedTime, true);
    }

    if (hostPlaying && !isPlaying) {
      playerTarget.playVideo();
    } else if (!hostPlaying && isPlaying) {
      playerTarget.pauseVideo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostSync, playerTarget]);

  const togglePlay = () => {
    if (playerTarget) {
      if (isPlaying) {
         guestPaused.current = true;
         playerTarget.pauseVideo();
      } else {
         guestPaused.current = false;
         if (hostSync) {
            const { isPlaying: hostPlaying, currentTime, timestamp } = hostSync;
            const expectedTime = hostPlaying ? currentTime + (Date.now() - timestamp) / 1000 : currentTime;
            playerTarget.seekTo(expectedTime, true);
         }
         playerTarget.playVideo();
      }
    }
  };

  useEffect(() => {
    socket.emit('join_room', roomCode);
    socket.emit('request_state', roomCode);

    socket.on('queue_updated', (updatedQueue) => {
      setQueue(updatedQueue);
    });
    
    socket.on('now_playing', (song) => {
      setNowPlaying(song);
      // Reset guest pause state on a new song so it autosyncs
      guestPaused.current = false;
    });

    socket.on('host_sync', (data) => {
      setHostSync(data);
    });

    return () => {
      socket.off('queue_updated');
      socket.off('now_playing');
      socket.off('host_sync');
    };
  }, [roomCode, socket]);

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
      const res = await fetch(`${backendUrl}/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results);
      }
    } catch (err) {
      console.error("Search failed:", err);
    }
    setIsSearching(false);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleAddSong = (song) => {
    socket.emit('add_song', { roomCode, song });
    setActiveTab('queue');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleVote = (queueId, voteValue) => {
    socket.emit('vote_song', { roomCode, queueId, vote: voteValue });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-hidden font-sans">
      {/* Background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>
      
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-white shadow-sm sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
             <button onClick={() => setView('landing')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                 <ArrowLeft size={20} className="text-slate-600" />
             </button>
             <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room</p>
                 <h1 className="text-2xl font-black text-slate-800">{roomCode}</h1>
             </div>
         </div>
         <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
             <button 
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'queue' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 Queue
             </button>
             <button 
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'search' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 Add Music
             </button>
         </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 relative z-10 max-w-2xl mx-auto w-full pb-20">
         
         {activeTab === 'search' && (
             <div className="space-y-6 animate-in fade-in duration-300">
                 <form onSubmit={handleSearch} className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                     <input 
                         type="text" 
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                         placeholder="Search for a song or artist..."
                         className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-lg font-medium focus:outline-none focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-500/10 transition-all shadow-sm"
                     />
                 </form>

                 <div className="space-y-4">
                     {isSearching ? (
                         <div className="text-center py-10 text-slate-400 font-medium animate-pulse">Searching YouTube...</div>
                     ) : searchResults.length > 0 ? (
                         searchResults.map(song => (
                             <div key={song.videoId} className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                                 <img src={song.thumbnailUrl} className="w-24 h-24 object-cover rounded-xl" />
                                 <div className="flex-1 min-w-0 flex flex-col justify-center">
                                     <h3 className="font-bold text-slate-900 text-lg truncate mb-1">{song.title}</h3>
                                     <p className="text-slate-500 text-sm truncate">{song.channelName}</p>
                                 </div>
                                 <div className="flex items-center justify-center pl-2">
                                     <button 
                                        onClick={() => handleAddSong(song)}
                                        className="w-12 h-12 bg-slate-50 hover:bg-fuchsia-500 group-hover:text-white text-slate-400 rounded-full flex items-center justify-center transition-all shadow-sm"
                                     >
                                         <Plus size={24} />
                                     </button>
                                 </div>
                             </div>
                         ))
                     ) : searchQuery && !isSearching ? (
                         <div className="text-center py-10 text-slate-400 font-medium">No results found.</div>
                     ) : (
                         <div className="text-center py-20 flex flex-col items-center justify-center text-slate-300">
                            <Music size={48} className="mb-4 opacity-50" />
                            <p className="font-medium text-lg">Search for a song to add to the party.</p>
                         </div>
                     )}
                 </div>
             </div>
         )}

         {activeTab === 'queue' && (
             <div className="space-y-4 animate-in fade-in duration-300">
                 {queue.length === 0 ? (
                     <div className="text-center py-20 flex flex-col items-center justify-center text-slate-400 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">
                         <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                             <Music size={32} className="text-slate-300" />
                         </div>
                         <h3 className="text-xl font-bold text-slate-800 mb-2">The queue is empty</h3>
                         <p className="mb-6">Be the first to add a song!</p>
                         <button 
                            onClick={() => setActiveTab('search')}
                            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-colors"
                         >
                             Add Music
                         </button>
                     </div>
                 ) : (
                     <div className="space-y-3">
                         {queue.map((song, idx) => (
                             <div key={song.queueId} className="flex gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100 items-center">
                                 <div className="font-black text-slate-300 w-6 text-center">{idx + 1}</div>
                                 <img src={song.thumbnailUrl} className="w-16 h-16 object-cover rounded-xl shadow-sm" />
                                 <div className="flex-1 min-w-0">
                                     <h3 className="font-bold text-slate-900 text-base truncate">{song.title}</h3>
                                     <p className="text-slate-500 text-xs truncate">{song.channelName}</p>
                                 </div>
                                 <div className="flex flex-col gap-1 items-center bg-slate-50 border border-slate-100 p-2 rounded-xl shadow-inner">
                                     <button 
                                        onClick={() => handleVote(song.queueId, 1)}
                                        className={`transition-colors p-1 ${song.votedBy?.[socket.id] === 1 ? 'text-green-500 bg-green-100 rounded-full' : 'text-slate-400 hover:text-green-500'}`}
                                     >
                                         <ThumbsUp size={18} />
                                     </button>
                                     <span className="font-black text-sm text-slate-700">{song.votes}</span>
                                     <button 
                                        onClick={() => handleVote(song.queueId, -1)}
                                        className={`transition-colors p-1 ${song.votedBy?.[socket.id] === -1 ? 'text-red-500 bg-red-100 rounded-full' : 'text-slate-400 hover:text-red-500'}`}
                                     >
                                         <ThumbsDown size={18} />
                                     </button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
         )}
      </main>

      {/* Mini Player for Guest */}
      {nowPlaying && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 z-50 flex items-center gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
           <div className="absolute top-[-9999px] left-[-9999px] opacity-0 pointer-events-none">
              <YouTube 
                videoId={nowPlaying.videoId} 
                opts={{ height: '100', width: '100', playerVars: { autoplay: 1 } }} 
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
              />
           </div>
           <img src={nowPlaying.thumbnailUrl} className="w-12 h-12 object-cover rounded-md shadow-lg" />
           <div className="flex-1 min-w-0">
               <p className="text-xs font-bold text-fuchsia-400 uppercase tracking-wider mb-0.5">Now Playing</p>
               <h3 className="font-bold text-white text-sm truncate">{nowPlaying.title}</h3>
               <p className="text-slate-400 text-xs truncate">{nowPlaying.channelName}</p>
           </div>
           <button 
               onClick={togglePlay} 
               className="w-12 h-12 rounded-full bg-fuchsia-500 hover:bg-fuchsia-400 flex items-center justify-center transition-colors shadow-lg flex-shrink-0"
           >
               {isPlaying ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white ml-1" />}
           </button>
        </div>
      )}
    </div>
  );
}

export default GuestView;
