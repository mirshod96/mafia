import React from 'react';

function AdminConsole({ socket, adminState }) {
  if (!adminState) return <div style={{ color: 'white', padding: '20px' }}>Loading Admin Console...</div>;

  const { phase, dayCount, players, winner, nightVotes, dayVotes, therapistHealTarget, diagnosticianTarget, lastNightActions } = adminState;

  const handleNextPhase = () => {
    socket.emit('triggerNextPhase');
  };

  const handleExecuteDayVote = () => {
    socket.emit('executeDayVote');
  };

  return (
    <div className="app-container" style={{ background: '#1a1a2e', color: 'white', overflowY: 'auto' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="mono" style={{ color: 'var(--accent-warning)' }}>MASTER CONSOLE</h1>
          <p>Phase: {phase.toUpperCase()} | Day: {dayCount} | Status: {winner ? `Game Over (${winner} Wins)` : 'In Progress'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {phase === 'day' && <button className="btn" onClick={handleExecuteDayVote}>Execute Day Vote</button>}
          <button className="btn primary" onClick={handleNextPhase} disabled={phase === 'end'}>Force Next Phase</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px' }}>
        {/* Left Column - Player List */}
        <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <h2>Player Directory</h2>
          <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
                <th style={{ padding: '10px' }}>Name</th>
                <th style={{ padding: '10px' }}>True Role</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Assigned Case (True/Fake)</th>
                <th style={{ padding: '10px' }}>Current Vote</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #222', opacity: p.isAlive ? 1 : 0.5 }}>
                  <td style={{ padding: '10px' }}>{p.name}</td>
                  <td style={{ padding: '10px', color: p.role === 'Mole' ? 'var(--accent-crimson)' : 'var(--accent-cyan)' }}>{p.role}</td>
                  <td style={{ padding: '10px' }}>{p.isAlive ? 'Alive' : 'Dead'}</td>
                  <td style={{ padding: '10px', fontSize: '12px' }}>
                    {p.caseData?.diagnosis} {p.caseData?.isFake && <span style={{color: 'red'}}>(FAKE)</span>}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {phase === 'night' ? (nightVotes[p.id] ? players.find(x => x.id === nightVotes[p.id])?.name : '-') : (dayVotes[p.id] ? players.find(x => x.id === dayVotes[p.id])?.name : '-')}
                  </td>
                  <td style={{ padding: '10px', display: 'flex', gap: '5px' }}>
                    <button className="btn danger" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => socket.emit('adminKillPlayer', p.id)}>УБИТЬ</button>
                    <button className="btn primary" style={{ padding: '5px 10px', fontSize: '12px', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }} onClick={() => socket.emit('adminHealPlayer', p.id)}>ВЫЛЕЧИТЬ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Column - Events & Approvals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Night Actions Queue */}
          <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: 'var(--accent-warning)', marginBottom: '10px' }}>Очередь ночных действий</h2>
            
            {phase === 'night' && (
              <div style={{ marginBottom: '15px' }}>
                <p style={{ color: 'var(--accent-cyan)' }}>Текущая ночь (ожидание):</p>
                <ul>
                  <li>Мафия хочет убить: {players.find(p => p.id === (Object.values(nightVotes)[0]))?.name || '...'}</li>
                  <li>Терапевт лечит: {players.find(p => p.id === therapistHealTarget)?.name || '...'}</li>
                  <li>Диагност проверяет: {players.find(p => p.id === diagnosticianTarget)?.name || '...'}</li>
                </ul>
              </div>
            )}

            {phase === 'day' && lastNightActions && (
              <div style={{ background: 'rgba(255,204,0,0.1)', border: '1px solid var(--accent-warning)', padding: '15px', borderRadius: '8px' }}>
                <p style={{ color: 'var(--accent-warning)', fontWeight: 'bold' }}>Итоги прошлой ночи (для ручного решения):</p>
                <ul>
                  <li>Кого убивала мафия: <strong style={{ color: 'var(--accent-crimson)' }}>{players.find(p => p.id === lastNightActions.killTarget)?.name || 'Никого'}</strong></li>
                  <li>Кого лечил терапевт: <strong style={{ color: 'var(--accent-green)' }}>{players.find(p => p.id === lastNightActions.healTarget)?.name || 'Никого'}</strong></li>
                  <li>Кого проверил диагност: <strong>{players.find(p => p.id === lastNightActions.investigateTarget)?.name || 'Никого'}</strong></li>
                </ul>
                <p style={{ marginTop: '10px', fontSize: '12px' }}>* Вы можете вручную применить эффекты с помощью кнопок "УБИТЬ" или "ВЫЛЕЧИТЬ" в таблице слева.</p>
              </div>
            )}
          </div>

          {/* Mole Detection Highlight */}
          <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: 'var(--accent-cyan)', marginBottom: '10px' }}>AI Detection Alerts</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>This panel flags potential clinical contradictions in chat (Simulated).</p>
            {/* Example simulated flag */}
            <div style={{ borderLeft: '3px solid var(--accent-crimson)', paddingLeft: '10px', marginTop: '10px' }}>
              <span style={{ color: 'var(--accent-crimson)' }}>[SUSPICIOUS ACTIVITY]</span>
              <p style={{ fontSize: '14px' }}>Player X described symptoms of Asthma, but assigned fake case is Myocardial Infarction.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminConsole;
