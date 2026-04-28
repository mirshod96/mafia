import React, { useState, useRef, useEffect } from 'react';

function ChatSystem({ socket, gameState, defaultChannel }) {
  const [message, setMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState(defaultChannel);
  const messagesEndRef = useRef(null);
  
  const { chat, me } = gameState;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat, activeChannel]);

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('sendMessage', { text: message, channel: activeChannel });
      setMessage('');
    }
  };

  const getAvailableChannels = () => {
    const channels = [];
    if (me.isAlive) {
      channels.push({ id: 'public', name: 'WARD CHAT' });
      if (me.role === 'Mole') {
        channels.push({ id: 'mole', name: 'ENCRYPTED CHANNEL' });
      }
    } else {
      channels.push({ id: 'morgue', name: 'THE MORGUE' });
    }
    return channels;
  };

  const channels = getAvailableChannels();
  // Ensure active channel is valid
  if (!channels.find(c => c.id === activeChannel) && channels.length > 0) {
    setActiveChannel(channels[0].id);
  }

  const filteredChat = chat.filter(msg => msg.channel === activeChannel);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Channel Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', padding: '16px 24px 0 24px', gap: '10px' }}>
        {channels.map(c => (
          <div 
            key={c.id}
            onClick={() => setActiveChannel(c.id)}
            style={{
              padding: '10px 20px',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              cursor: 'pointer',
              background: activeChannel === c.id ? (c.id === 'mole' ? 'rgba(255,51,102,0.1)' : 'rgba(0,255,204,0.1)') : 'transparent',
              border: activeChannel === c.id ? `1px solid ${c.id === 'mole' ? 'var(--accent-crimson)' : 'var(--accent-cyan)'}` : '1px solid transparent',
              borderBottom: 'none',
              color: activeChannel === c.id ? (c.id === 'mole' ? 'var(--accent-crimson)' : 'var(--accent-cyan)') : 'var(--text-muted)',
              fontFamily: 'Share Tech Mono, monospace'
            }}
          >
            {c.name}
          </div>
        ))}
      </div>

      {/* Messages Area */}
      <div className="scrollable-section" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {filteredChat.map(msg => (
          <div key={msg.id} style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: msg.senderId === me.id ? 'flex-end' : 'flex-start'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              {msg.sender} {msg.senderId === me.id ? '(You)' : ''}
            </div>
            <div style={{
              background: msg.sender === 'System' ? 'rgba(255,204,0,0.1)' : (msg.senderId === me.id ? 'rgba(0,255,204,0.1)' : 'rgba(255,255,255,0.05)'),
              border: msg.sender === 'System' ? '1px solid var(--accent-warning)' : (msg.senderId === me.id ? '1px solid var(--accent-cyan)' : '1px solid var(--glass-border)'),
              padding: '10px 15px',
              borderRadius: '8px',
              maxWidth: '80%',
              color: msg.sender === 'System' ? 'var(--accent-warning)' : 'white'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '20px', borderTop: '1px solid var(--glass-border)', background: 'var(--bg-panel)' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder={`Send message to ${activeChannel}...`}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn primary" disabled={!message.trim()}>SEND</button>
        </form>
      </div>
    </div>
  );
}

export default ChatSystem;
