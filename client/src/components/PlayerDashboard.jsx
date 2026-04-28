import React, { useState } from 'react';
import ChatSystem from './ChatSystem';
import { Activity, ShieldAlert, HeartPulse, UserSearch, FileText } from 'lucide-react';

function PlayerDashboard({ socket, gameState }) {
  const { me, phase, dayCount, players, winner } = gameState;
  const [selectedTarget, setSelectedTarget] = useState('');

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

  const handleAction = () => {
    if (!selectedTarget) return;
    
    if (phase === 'night') {
      if (me.role === 'Mole') {
        socket.emit('voteNight', selectedTarget);
      } else if (me.role === 'Diagnostician') {
        socket.emit('diagnosticianInvestigate', selectedTarget);
      } else if (me.role === 'Therapist') {
        socket.emit('therapistHeal', selectedTarget);
      }
    } else if (phase === 'day') {
      socket.emit('voteDay', selectedTarget);
    }
  };

  const roleNameMap = {
    'Mole': 'Пациент-Мафия',
    'Diagnostician': 'Диагност',
    'Therapist': 'Терапевт',
    'Patient': 'Пациент'
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
                <h3 style={{ marginBottom: '5px', color: 'var(--accent-cyan)' }}>ПРАВИЛА РОЛИ: {roleNameMap[me.role]}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                  {me.role === 'Patient' && 'Ваша задача - описывать свои симптомы честно, чтобы доказать врачам, что вы реально больны, и вычислить мафию.'}
                  {me.role === 'Mole' && 'Вы абсолютно здоровы, но должны симулировать эти симптомы. Ваша цель - убить всех врачей и пациентов. Ночью вы выбираете жертву.'}
                  {me.role === 'Therapist' && 'Ночью вы можете выбрать одного игрока, чтобы вылечить (спасти) его от убийства мафией.'}
                  {me.role === 'Diagnostician' && 'Ночью вы делаете запрос системе, чтобы получить симптомы любого участника и проверить, врет ли он.'}
                </p>
              </div>

              <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '10px' }}>ДИАГНОЗ: {me.caseData.diagnosis}</h3>
              {me.role === 'Mole' && (
                <div style={{ background: 'rgba(255,51,102,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid var(--accent-crimson)', marginBottom: '15px' }}>
                  <p style={{ color: 'var(--accent-crimson)', fontSize: '12px' }}>ФАЛЬШИВЫЙ ПРОФИЛЬ. ЗАПОМНИТЕ ЭТИ СИМПТОМЫ ДЛЯ СИМУЛЯЦИИ.</p>
                </div>
              )}
              
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '5px' }}>REPORTED SYMPTOMS:</h4>
                <ul style={{ paddingLeft: '20px' }}>
                  {me.caseData.symptoms?.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              {me.caseData.vitals && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: 'var(--text-muted)', marginBottom: '5px' }}>VITALS:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>HR: {me.caseData.vitals.hr}</div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>BP: {me.caseData.vitals.bp}</div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>Temp: {me.caseData.vitals.temp}°C</div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>RR: {me.caseData.vitals.rr}</div>
                  </div>
                </div>
              )}
              
              {me.caseData.labResults && (
                <div>
                  <h4 style={{ color: 'var(--text-muted)', marginBottom: '5px' }}>LAB RESULTS:</h4>
                  <p style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>{me.caseData.labResults}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CENTER PANEL - CHAT */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <ChatSystem socket={socket} gameState={gameState} defaultChannel="public" />
        </div>

        {/* RIGHT PANEL - ACTIONS & PLAYERS */}
        <div className="glass-panel scrollable-section" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="mono" style={{ marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>ACTION TERMINAL</h2>
          
          <div style={{ flex: 1 }}>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>SELECT TARGET:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.filter(p => p.isAlive && p.id !== me.id).map(p => (
                <div 
                  key={p.id}
                  onClick={() => setSelectedTarget(p.id)}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: selectedTarget === p.id ? '1px solid var(--accent-cyan)' : '1px solid var(--glass-border)',
                    background: selectedTarget === p.id ? 'rgba(0,255,204,0.1)' : 'rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{p.name}</span>
                  {p.role !== 'Unknown' && <span style={{ color: 'var(--accent-crimson)' }}>({p.role})</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
            {phase === 'night' && me.role === 'Mole' && (
              <button className="btn danger" style={{ width: '100%' }} onClick={handleAction} disabled={!selectedTarget}>
                УБИТЬ ЦЕЛЬ
              </button>
            )}
            
            {phase === 'night' && me.role === 'Diagnostician' && (
              <button className="btn primary" style={{ width: '100%' }} onClick={handleAction} disabled={!selectedTarget}>
                ЗАПРОСИТЬ СИМПТОМЫ
              </button>
            )}

            {phase === 'night' && me.role === 'Therapist' && (
              <button className="btn primary" style={{ width: '100%', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }} onClick={handleAction} disabled={!selectedTarget}>
                ВЫЛЕЧИТЬ (СПАСТИ)
              </button>
            )}

            {phase === 'night' && me.role === 'Patient' && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                Ожидание действий ночи...
              </div>
            )}

            {phase === 'day' && (
              <button className="btn primary" style={{ width: '100%' }} onClick={() => socket.emit('voteDay', selectedTarget)} disabled={!selectedTarget}>
                ГОЛОСОВАТЬ НА ВЫПИСКУ (ИСКЛЮЧИТЬ)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerDashboard;
