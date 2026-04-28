import React from 'react';

function Lobby({ socket, gameState, playerName }) {
  const { players } = gameState;
  
  const handleStart = () => {
    socket.emit('startGame');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      <div className="glass-panel" style={{ width: '600px', textAlign: 'center' }}>
        <h2 className="mono" style={{ color: 'var(--accent-cyan)', marginBottom: '10px' }}>INTAKE WARD</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Waiting for personnel to join...</p>
        
        <div style={{ fontSize: '48px', fontWeight: '800', marginBottom: '30px' }}>
          {players.length} / 18
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '30px' }}>
          {players.map(p => (
            <div key={p.id} style={{ 
              padding: '8px 16px', 
              background: 'rgba(0,255,204,0.1)', 
              borderRadius: '20px',
              border: '1px solid var(--accent-cyan)',
              color: 'var(--accent-cyan)'
            }}>
              {p.name} {p.name === playerName ? '(You)' : ''}
            </div>
          ))}
        </div>
        
        <button className="btn primary" onClick={handleStart} style={{ width: '100%' }}>
          INITIATE SIMULATION
        </button>
      </div>
    </div>
  );
}

export default Lobby;
