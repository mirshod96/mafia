const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const playHeartbeat = () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(50, audioCtx.currentTime); // Low thump
  osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
};

export const playBeep = () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime); // High pitched beep

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
};

export const playFlatline = () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime); // Continuous high pitched

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
  gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 2.5); // Hold
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3.0); // Fade out

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 3.0);
};
