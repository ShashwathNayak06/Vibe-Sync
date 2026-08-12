import { useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import LandingView from './LandingView/LandingView';
import HostView from './HostView/HostView';
import GuestView from './GuestView/GuestView';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
const socket = io(BACKEND_URL);

function App() {
  const [view, setView] = useState('landing');
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {view === 'landing' && <LandingView setView={setView} setRoomCode={setRoomCode} />}
      {view === 'host' && <HostView roomCode={roomCode} socket={socket} setView={setView} />}
      {view === 'guest' && <GuestView roomCode={roomCode} socket={socket} setView={setView} />}
    </div>
  );
}

export default App;
