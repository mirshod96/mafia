import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import PlayerDashboard from './components/PlayerDashboard';
import AdminConsole from './components/AdminConsole';
import { playBeep, playFlatline, playHeartbeat } from './utils/audio';

// Use environment variable or default to localhost
const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001');

function App() {
  const [gameState, setGameState] = useState(null);
  const [adminState, setAdminState] = useState(null);
  const [view, setView] = useState('login'); // login, lobby, dashboard, admin
  const [playerName, setPlayerName] = useState(sessionStorage.getItem('heuc_playerName') || '');
  const [joinError, setJoinError] = useState('');
  const prevPhaseRef = useRef(null);
  const prevAliveRef = useRef(null);

  // Generate or retrieve persistent player ID (per tab)
  const playerIdRef = useRef(null);
  useEffect(() => {
    let savedId = sessionStorage.getItem('heuc_playerId');
    if (!savedId) {
      savedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('heuc_playerId', savedId);
    }
    playerIdRef.current = savedId;

    // Auto-reconnect if we already have a name saved
    const savedName = sessionStorage.getItem('heuc_playerName');
    if (savedName) {
      socket.emit('joinGame', { name: savedName, playerId: savedId });
    }
  }, []);

  useEffect(() => {
    socket.on('gameState', (state) => {
      setGameState(state);
      
      // Handle Phase Changes Audio
      if (prevPhaseRef.current && prevPhaseRef.current !== state.phase && (state.phase === 'day' || state.phase === 'night')) {
        playBeep();
      }
      prevPhaseRef.current = state.phase;

      // Handle Elimination Audio
      if (state.me) {
        if (prevAliveRef.current === true && state.me.isAlive === false) {
          playFlatline();
        }
        prevAliveRef.current = state.me.isAlive;
      }

      // Automatically set the correct view if we are a player
      if (view !== 'admin' && state.me) {
        setView(state.phase === 'lobby' ? 'lobby' : 'dashboard');
      }
    });

    socket.on('adminState', (state) => {
      setAdminState(state);
    });

    socket.on('investigationResult', (result) => {
      alert(`DIAGNOSIS RESULT\n\nPlayer: ${result.targetName}\n${result.result}`);
    });

    socket.on('healResult', (result) => {
      alert(`ACTION EXECUTED\n\nYou chose to heal: ${result.targetName}\nIf the Mafia attacks them, they will survive.`);
    });

    socket.on('joinResult', (result) => {
      if (result.success) {
        setJoinError('');
        // View is handled by the gameState event now
      } else {
        setJoinError(result.reason);
        sessionStorage.removeItem('heuc_playerName'); // Clear on failure to prevent infinite loops
        setView('login');
      }
    });

    return () => {
      socket.off('gameState');
      socket.off('adminState');
      socket.off('investigationResult');
      socket.off('healResult');
      socket.off('joinResult');
    };
  }, [view]);

  const joinGame = (e) => {
    e.preventDefault();
    if (playerName.trim() && playerIdRef.current) {
      sessionStorage.setItem('heuc_playerName', playerName);
      setJoinError('');
      socket.emit('joinGame', { name: playerName, playerId: playerIdRef.current });
    }
  };

  const joinAdmin = () => {
    socket.emit('joinAdmin');
    setView('admin');
  };

  if (view === 'admin') {
    return <AdminConsole socket={socket} adminState={adminState} />;
  }

  return (
    <div className="app-container scanlines">
      {view === 'login' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
          <h1 className="mono" style={{ fontSize: '48px', color: 'var(--accent-cyan)', marginBottom: '10px' }}>HEUC-18</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '40px', letterSpacing: '2px' }}>CLINICAL STRATEGY SIMULATOR</p>
          
          <form onSubmit={joinGame} className="glass-panel" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>ID Badge / Name</label>
              <input 
                type="text" 
                value={playerName} 
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                required
              />
            </div>
            {joinError && (
              <div style={{ color: 'var(--accent-crimson)', fontSize: '14px', background: 'rgba(255,51,102,0.1)', padding: '10px', borderRadius: '4px', border: '1px solid var(--accent-crimson)' }}>
                {joinError}
              </div>
            )}
            <button type="submit" className="btn primary">Join Ward</button>
            <button type="button" onClick={joinAdmin} className="btn" style={{ marginTop: '10px' }}>Access Master Console</button>
          </form>
        </div>
      )}

      {view === 'lobby' && gameState && (
        <Lobby socket={socket} gameState={gameState} playerName={playerName} />
      )}

      {view === 'dashboard' && gameState && (
        <PlayerDashboard socket={socket} gameState={gameState} />
      )}
    </div>
  );
}

export default App;
