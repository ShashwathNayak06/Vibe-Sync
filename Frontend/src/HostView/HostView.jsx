import React, { useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import { Users, Play, SkipForward, Copy, Check, ArrowLeft, Search, Plus, ThumbsUp, ThumbsDown, Music } from 'lucide-react';

function HostView({ roomCode, socket, setView }) {
  const [queue, setQueue] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    socket.emit('join_room', roomCode);

    socket.on('queue_updated', (updatedQueue) => {
      setQueue(updatedQueue);
    });

    return () => {
      socket.off('queue_updated');
    };
  }, [roomCode, socket]);

  useEffect(() => {
    if (!nowPlaying && queue.length > 0) {
      const nextSong = queue[0];
      setNowPlaying(nextSong);
      socket.emit('song_ended', { roomCode, queueId: nextSong.queueId });
    }
  }, [queue, nowPlaying, roomCode, socket]);

  useEffect(() => {
    socket.emit('play_song', { roomCode, song: nowPlaying });
  }, [nowPlaying, roomCode, socket]);

  const handleSongEnd = () => setNowPlaying(null);
  const handleSkip = () => setNowPlaying(null);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const res = await fetch(`${backendUrl}/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results) setSearchResults(data.results);
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

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: { autoplay: 1 },
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-900 text-white overflow-hidden font-sans">
      {/* Player Section */}
      <div className="flex-1 flex flex-col relative bg-black">
        {nowPlaying ? (
          <div className="w-full h-full relative">
             <YouTube 
                videoId={nowPlaying.videoId} 
                opts={opts} 
                onEnd={handleSongEnd}
                className="absolute inset-0 w-full h-full"
                iframeClassName="w-full h-full"
             />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 relative z-10">
             <button onClick={() => setView('landing')} className="absolute top-8 left-8 p-3 bg-slate-800/50 hover:bg-slate-700 rounded-full transition-colors backdrop-blur-md">
                 <ArrowLeft size={24} className="text-white" />
             </button>
             <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-slate-900/50">
               <Play size={40} className="text-slate-600 ml-2" />
             </div>
             <h2 className="text-3xl font-bold text-white mb-2">Waiting for music</h2>
             <p className="text-slate-400 text-lg">Add songs from the panel or invite guests!</p>
          </div>
        )}
        
        {nowPlaying && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-6 pb-20 pointer-events-none flex justify-between items-start">
               <div>
                   <p className="text-fuchsia-400 font-bold uppercase tracking-widest text-xs mb-1">Now Playing</p>
                   <h2 className="text-3xl font-black text-white drop-shadow-lg truncate max-w-2xl">{nowPlaying.title}</h2>
                   <p className="text-lg text-slate-300 drop-shadow-md mt-1">{nowPlaying.channelName}</p>
               </div>
               <button onClick={() => setView('landing')} className="pointer-events-auto p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors border border-white/10">
                   <ArrowLeft size={20} className="text-white" />
               </button>
            </div>
        )}
      </div>

      {/* Sidebar Section */}
      <div className="w-full md:w-[450px] bg-slate-800/90 backdrop-blur-xl border-l border-slate-700 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-slate-700 bg-slate-800/50 relative overflow-hidden">
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-[50px] opacity-20"></div>
          
          <div className="flex justify-between items-center mb-4">
              <div>
                  <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">Room Code</p>
                  <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
                    {roomCode}
                  </h1>
              </div>
              <button onClick={copyCode} className="p-3 bg-slate-900 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 shadow-inner">
                 {copied ? <Check size={24} className="text-green-400" /> : <Copy size={24} className="text-slate-300" />}
              </button>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-slate-300">
              <Users size={18} className="text-cyan-400" />
              <span className="font-bold text-sm">{queue.length} in queue</span>
            </div>
            {nowPlaying && (
                <button onClick={handleSkip} className="flex items-center gap-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm border border-white/5">
                    Skip <SkipForward size={14} />
                </button>
            )}
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl shadow-inner">
             <button 
                onClick={() => setActiveTab('queue')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'queue' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
             >
                 Queue
             </button>
             <button 
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'search' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
             >
                 Add Music
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'search' && (
             <div className="space-y-4 animate-in fade-in duration-300">
                 <form onSubmit={handleSearch} className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input 
                         type="text" 
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                         placeholder="Search YouTube..."
                         className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-white focus:outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/50 transition-all shadow-inner placeholder:text-slate-500"
                     />
                 </form>

                 <div className="space-y-3">
                     {isSearching ? (
                         <div className="text-center py-8 text-slate-400 font-medium animate-pulse text-sm">Searching...</div>
                     ) : searchResults.length > 0 ? (
                         searchResults.map(song => (
                             <div key={song.videoId} className="flex gap-3 p-3 bg-slate-800 rounded-xl shadow-sm border border-slate-700 hover:bg-slate-700 transition-all group">
                                 <img src={song.thumbnailUrl} className="w-20 h-16 object-cover rounded-lg" />
                                 <div className="flex-1 min-w-0 flex flex-col justify-center">
                                     <h3 className="font-bold text-slate-100 text-sm truncate">{song.title}</h3>
                                     <p className="text-slate-400 text-xs truncate mt-0.5">{song.channelName}</p>
                                 </div>
                                 <div className="flex items-center justify-center pl-1">
                                     <button 
                                        onClick={() => handleAddSong(song)}
                                        className="w-10 h-10 bg-slate-900 hover:bg-fuchsia-500 group-hover:text-white text-slate-400 rounded-full flex items-center justify-center transition-all shadow-inner border border-slate-700"
                                     >
                                         <Plus size={20} />
                                     </button>
                                 </div>
                             </div>
                         ))
                     ) : searchQuery && !isSearching ? (
                         <div className="text-center py-8 text-slate-500 text-sm font-medium">No results found.</div>
                     ) : null}
                 </div>
             </div>
          )}

          {activeTab === 'queue' && (
             <div className="space-y-3 animate-in fade-in duration-300">
                 {queue.length === 0 ? (
                     <div className="text-center py-10 flex flex-col items-center justify-center text-slate-500">
                         <Music size={32} className="mb-3 opacity-50" />
                         <p className="font-medium text-sm">The queue is empty.</p>
                     </div>
                 ) : (
                     queue.map((song, idx) => (
                         <div key={song.queueId} className="flex gap-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700/50 hover:bg-slate-700/80 transition-colors shadow-sm items-center">
                             <div className="font-black text-slate-500 w-5 text-center text-xs">{idx + 1}</div>
                             <img src={song.thumbnailUrl} className="w-16 h-12 object-cover rounded-lg shadow-md" />
                             <div className="flex-1 min-w-0">
                                 <h3 className="font-bold text-slate-100 text-sm truncate">{song.title}</h3>
                                 <p className="text-slate-400 text-[10px] uppercase tracking-wider truncate mt-0.5">{song.channelName}</p>
                             </div>
                             <div className="flex flex-col gap-0.5 items-center bg-slate-900 p-1.5 rounded-lg shadow-inner border border-slate-800">
                                 <button 
                                    onClick={() => handleVote(song.queueId, 1)} 
                                    className={`transition-colors p-1 rounded-md ${song.votedBy?.[socket.id] === 1 ? 'text-green-400 bg-slate-800' : 'text-slate-500 hover:text-green-400'}`}
                                 >
                                     <ThumbsUp size={14} />
                                 </button>
                                 <span className="font-black text-xs text-fuchsia-400">{song.votes}</span>
                                 <button 
                                    onClick={() => handleVote(song.queueId, -1)} 
                                    className={`transition-colors p-1 rounded-md ${song.votedBy?.[socket.id] === -1 ? 'text-red-400 bg-slate-800' : 'text-slate-500 hover:text-red-400'}`}
                                 >
                                     <ThumbsDown size={14} />
                                 </button>
                             </div>
                         </div>
                     ))
                 )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HostView;
