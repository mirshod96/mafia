import React, { useState } from 'react';
import ChatSystem from './ChatSystem';
import { Activity, ShieldAlert, HeartPulse, UserSearch, FileText } from 'lucide-react';

function PlayerDashboard({ socket, gameState }) {
  const { me, phase, dayCount, players, winner } = gameState;

  if (phase === 'end') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <h1 className="mono" style={{ color: winner === 'Medical' ? 'var(--accent-cyan)' : 'var(--accent-crimson)', fontSize: '64px' }}>
          {winner === 'Medical' ? 'MEDICAL TEAM WINS' : 'MOLES WIN'}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>The simulation has concluded.</p>
        <div style={{ marginTop: '40px', display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {players.map(p => (
            <div key={p.id} className="glass-panel" style={{ width: '250px' }}>
              <h3 style={{ color: p.role === 'Mole' ? 'var(--accent-crimson)' : 'var(--accent-cyan)' }}>{p.name}</h3>
              <p>Role: {p.role}</p>
              <p>Status: {p.isAlive ? 'Survived' : 'Eliminated'}</p>
              {p.caseData && <p className="mono" style={{ fontSize: '12px', marginTop: '10px' }}>{p.caseData.diagnosis}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!me.isAlive) {
    return (
      <div className="app-container scanlines" style={{ background: '#050000' }}>
        <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid var(--accent-crimson)' }}>
          <h1 style={{ color: 'var(--accent-crimson)' }} className="mono">YOU HAVE FLATLINED</h1>
          <p>You were eliminated. You can only view the Morgue chat.</p>
        </div>
        <div style={{ flex: 1, padding: '20px' }}>
          <ChatSystem socket={socket} gameState={gameState} defaultChannel="morgue" />
        </div>
      </div>
    );
  }

  const roleNameMap = {
    'Mole': 'Mafia',
    'Diagnostician': 'Diagnostician',
    'Therapist': 'Therapist',
    'Patient': 'Patient'
  };

  const getRoleIcon = () => {
    switch (me.role) {
      case 'Mole': return <ShieldAlert color="var(--accent-crimson)" size={32} />;
      case 'Diagnostician': return <UserSearch color="var(--accent-cyan)" size={32} />;
      case 'Therapist': return <Activity color="var(--accent-green)" size={32} />;
      default: return <HeartPulse color="var(--text-main)" size={32} />;
    }
  };

  return (
    <div className="app-container">
      {/* STATUS BAR */}
      <div className="status-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {getRoleIcon()}
          <div>
            <div className="mono" style={{ fontSize: '20px', fontWeight: 'bold' }}>{me.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase' }}>{roleNameMap[me.role]}</div>
          </div>
        </div>
        
        <div className="mono" style={{ fontSize: '24px', letterSpacing: '2px', color: phase === 'night' ? 'var(--accent-warning)' : 'var(--accent-cyan)' }}>
          {phase.toUpperCase()} PHASE | DAY {dayCount}
        </div>
        
        <div className="vitality-indicator">
          <span className="mono">{me.role === 'Mole' ? 'COVER INTEGRITY' : 'VITALITY'}</span>
          <div className="vitality-bar">
            <div className={`vitality-fill ${me.role === 'Mole' ? 'danger' : ''} heartbeat`} style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* LEFT PANEL - MEDICAL CHART */}
        <div className="glass-panel scrollable-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
            <FileText color="var(--accent-cyan)" />
            <h2 className="mono">MEDICAL CHART</h2>
          </div>
          
          {me.caseData && (
            <div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid var(--accent-cyan)' }}>
                <h3 style={{ marginBottom: '5px', color: 'var(--accent-cyan)' }}>ROLE RULES: {roleNameMap[me.role]}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                  {me.role === 'Patient' && 'Your task is to discuss with others who the Mafia might be and vote during the day. You are a peaceful citizen.'}
                  {me.role === 'Mole' && 'You are the Mafia. Your goal is to eliminate all citizens. At night, choose a victim.'}
                  {me.role === 'Therapist' && 'At night, you can select one player to heal (save) them from being killed by the Mafia.'}
                  {me.role === 'Diagnostician' && 'At night, you request the system to check a participant to see if they are the Mafia.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlayerDashboard;
