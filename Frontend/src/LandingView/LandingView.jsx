import { useState } from "react";
import { Tv, Music } from "lucide-react"

function LandingView({ setView, setRoomCode }) {
  const [joinCode, setJoinCode] = useState('');

  const handleStartParty = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(code);
    setView('host');
  };

  const handleJoinParty = (e) => {
    e.preventDefault();
    if (joinCode.length === 4) {
      setRoomCode(joinCode.toUpperCase());
      setView('guest');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Decorative background blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      { }
      <div className="max-w-md w-full space-y-8 text-center relative z-10 bg-white/70 backdrop-blur-xl p-10 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div>
          <div className="w-24 h-24 bg-gradient-to-br from-fuchsia-500 to-violet-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_10px_30px_-10px_rgba(192,38,211,0.4)] rotate-3 hover:rotate-6 transition-transform duration-500">
            <Music size={48} className="text-white drop-shadow-sm" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-600 mb-4 drop-shadow-sm">
            VibeSync
          </h1>
          <p className="text-slate-600 text-lg font-medium">
            Crowdsource the aux cord.
            <br/><span className="text-slate-400 text-sm">No app required.</span>
          </p>
        </div>

        <div className="space-y-6 pt-6">
          <button
            onClick={handleStartParty}
            className="group w-full py-4 px-6 bg-slate-900 text-white font-bold text-lg rounded-2xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30"
          >
            <Tv size={24} className="group-hover:scale-110 transition-transform" />
            Start a Party (Host)
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold tracking-widest uppercase">Or join one</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleJoinParty} className="flex gap-2 items-stretch max-w-sm mx-auto">
            <input
              type="text"
              maxLength={4}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="PIN"
              className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-3 text-center text-xl font-black tracking-[0.2em] focus:outline-none focus:border-fuchsia-400 focus:bg-white focus:ring-4 focus:ring-fuchsia-500/10 transition-all uppercase placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 placeholder:text-base text-slate-900 shadow-inner"
            />
            <button
              type="submit"
              disabled={joinCode.length !== 4}
              className="bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none transition-all active:scale-95 flex-shrink-0 text-white"
            >
              JOIN
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LandingView