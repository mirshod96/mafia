import React from 'react';

function AdminConsole({ socket, adminState }) {
  if (!adminState) return <div style={{ color: 'white', padding: '20px' }}>Loading Admin Console...</div>;

  const { phase, dayCount, players, therapistRequest, winner, nightVotes, dayVotes } = adminState;

  const handleNextPhase = () => {
    socket.emit('triggerNextPhase');
  };

  const handleExecuteDayVote = () => {
    socket.emit('executeDayVote');
  };

  const handleTherapistApprove = (approved) => {
    socket.emit('adminResolveTherapist', approved);
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Column - Events & Approvals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Approval Console */}
          <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: 'var(--accent-warning)', marginBottom: '10px' }}>Approval Console</h2>
            {therapistRequest?.status === 'pending' ? (
              <div style={{ background: 'rgba(255,204,0,0.1)', border: '1px solid var(--accent-warning)', padding: '15px', borderRadius: '8px' }}>
                <p><strong>Therapist Request:</strong> Access to {players.find(p => p.id === therapistRequest.targetId)?.name}'s chart.</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button className="btn primary" onClick={() => handleTherapistApprove(true)}>Approve (Release Data)</button>
                  <button className="btn danger" onClick={() => handleTherapistApprove(false)}>Deny (Block Access)</button>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No pending requests.</p>
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
