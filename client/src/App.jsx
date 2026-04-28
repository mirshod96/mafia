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
  const [playerName, setPlayerName] = useState('');
  const prevPhaseRef = useRef(null);
  const prevAliveRef = useRef(null);

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

      if (view === 'login' || view === 'lobby') {
        setView(state.phase === 'lobby' ? 'lobby' : 'dashboard');
      }
    });

    socket.on('adminState', (state) => {
      setAdminState(state);
    });

    socket.on('investigationResult', (result) => {
      alert(`РЕЗУЛЬТАТ ДИАГНОСТИКИ\n\nИгрок: ${result.targetName}\n${result.result}`);
    });

    socket.on('healResult', (result) => {
      alert(`ДЕЙСТВИЕ ВЫПОЛНЕНО\n\nВы выбрали лечить: ${result.targetName}\nЕсли на него нападет мафия, он выживет.`);
    });

    return () => {
      socket.off('gameState');
      socket.off('adminState');
      socket.off('investigationResult');
      socket.off('healResult');
    };
  }, [view]);

  const joinGame = (e) => {
    e.preventDefault();
    if (playerName.trim()) {
      socket.emit('joinGame', playerName);
      setView('lobby');
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
