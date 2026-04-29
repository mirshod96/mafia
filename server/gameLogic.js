const fs = require('fs');
const medicalCases = require('./data/medicalCases.json');

class GameEngine {
  constructor(io) {
    this.io = io;
    this.resetState();
  }

  resetState() {
    this.players = {}; // playerId -> player object
    this.socketToPlayer = {}; // socketId -> playerId
    this.phase = 'lobby'; // lobby, night, day, end
    this.dayCount = 0;
    this.nightVotes = {}; // molePlayerId -> targetPlayerId
    this.dayVotes = {}; // playerId -> targetPlayerId
    this.diagnosticianTarget = null;
    this.therapistHealTarget = null; // targetId saved by therapist
    this.lastNightActions = { killTarget: null, healTarget: null, investigateTarget: null };
    this.eliminatedTonight = null;
    this.chatHistory = [];
  }

  resetGame() {
    this.resetState();
    this.broadcastState();
  }

  addPlayer(socketId, name, playerId) {
    if (this.players[playerId]) {
      // Reconnect
      this.players[playerId].socketId = socketId;
      this.socketToPlayer[socketId] = playerId;
      this.broadcastState();
      return { success: true };
    }

    if (this.phase !== 'lobby') {
      return { success: false, reason: 'Сессия игры уже началась. Вы сможете присоединиться к следующей сессии.' };
    }
    
    this.players[playerId] = {
      id: playerId,
      name,
      role: null,
      caseData: null, 
      isAlive: true,
      socketId,
    };
    this.socketToPlayer[socketId] = playerId;
    
    this.broadcastState();
    return { success: true };
  }

  removePlayer(socketId) {
    const playerId = this.socketToPlayer[socketId];
    if (playerId) {
      if (this.phase === 'lobby') {
        // Only remove player entirely if game hasn't started
        delete this.players[playerId];
        delete this.socketToPlayer[socketId];
      }
      this.broadcastState();
    }
  }

  startGame() {
    const playerIds = Object.keys(this.players);
    const numPlayers = playerIds.length;
    
    // Scale roles based on players (1 Mafia per 4 players)
    let numMoles = Math.max(1, Math.floor(numPlayers / 4));
    let hasDiagnostician = numPlayers >= 5 ? 1 : 0;
    let hasTherapist = numPlayers >= 6 ? 1 : 0;

    const numPatients = numPlayers - numMoles - hasDiagnostician - hasTherapist;

    let roles = [];
    for (let i = 0; i < numMoles; i++) roles.push('Mole');
    if (hasDiagnostician) roles.push('Diagnostician');
    if (hasTherapist) roles.push('Therapist');
    for (let i = 0; i < numPatients; i++) roles.push('Patient');

    // Shuffle roles
    roles.sort(() => Math.random() - 0.5);
    
    // Shuffle cases
    let shuffledCases = [...medicalCases].sort(() => Math.random() - 0.5);

    playerIds.forEach((id, index) => {
      this.players[id].role = roles[index];
      
      // Assign case
      if (this.players[id].role === 'Mole') {
        // Moles get a fake case diagnosis, but no real vitals
        const fakeCase = shuffledCases.pop();
        this.players[id].caseData = {
          id: fakeCase.id,
          diagnosis: fakeCase.diagnosis,
          isFake: true
        };
      } else {
        this.players[id].caseData = shuffledCases.pop();
      }
    });

    this.startNight();
  }

  startNight() {
    this.phase = 'night';
    this.dayCount++;
    this.nightVotes = {};
    this.diagnosticianTarget = null;
    this.therapistHealTarget = null;
    this.eliminatedTonight = null;
    this.lastNightActions = { killTarget: null, healTarget: null, investigateTarget: null };
    
    this.addSystemMessage(`Night ${this.dayCount} has fallen. Waiting for night roles to act.`);
    this.broadcastState();
  }

  startDay() {
    this.phase = 'day';
    this.dayVotes = {};
    
    // Resolve night actions
    const voteCounts = {};
    Object.values(this.nightVotes).forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });
    
    // Find highest voted target by Moles
    let maxVotes = 0;
    let targetToEliminate = null;
    for (const [targetId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        targetToEliminate = targetId;
      }
    }

    this.lastNightActions = {
      killTarget: targetToEliminate,
      healTarget: this.therapistHealTarget,
      investigateTarget: this.diagnosticianTarget
    };

    this.addSystemMessage(`Day has broken. The Game Master is making the final decision on the night's events.`);

    // Check Win Condition
    if (this.checkWinCondition()) return;

    this.broadcastState();
  }

  handleVote(socketId, targetId, isDay) {
    const playerId = this.socketToPlayer[socketId];
    if (!playerId) return;

    if (isDay && this.phase === 'day') {
      this.dayVotes[playerId] = targetId;
      this.broadcastState();
    } else if (!isDay && this.phase === 'night' && this.players[playerId].role === 'Mole') {
      this.nightVotes[playerId] = targetId;
      this.broadcastState();
    }
  }

  executeDayVote() {
    if (this.phase !== 'day') return;

    const voteCounts = {};
    Object.values(this.dayVotes).forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    let maxVotes = 0;
    let targetToDischarge = null;
    for (const [targetId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        targetToDischarge = targetId;
      }
    }

    if (targetToDischarge && this.players[targetToDischarge]) {
      this.players[targetToDischarge].isAlive = false;
      this.addSystemMessage(`The hospital has voted to discharge ${this.players[targetToDischarge].name}.`);
    } else {
      this.addSystemMessage(`The hospital could not reach a consensus. No one was discharged.`);
    }

    if (this.checkWinCondition()) return;

    this.startNight();
  }

  diagnosticianInvestigate(socketId, targetId) {
    const playerId = this.socketToPlayer[socketId];
    if (!playerId) return;

    if (this.phase === 'night' && this.players[playerId].role === 'Diagnostician') {
      const target = this.players[targetId];
      this.diagnosticianTarget = targetId;
      let resultText = '';
      
      if (target.role === 'Mole') {
        resultText = 'The patient is completely healthy (Faker)';
      } else if (target.role === 'Therapist') {
        resultText = 'This is the Therapist';
      } else {
        const symptoms = target.caseData?.symptoms?.join(', ') || 'No data';
        resultText = `Patient symptoms: ${symptoms}`;
      }

      this.io.to(socketId).emit('investigationResult', {
        targetName: target.name,
        result: resultText
      });
    }
  }

  therapistHeal(socketId, targetId) {
    const playerId = this.socketToPlayer[socketId];
    if (!playerId) return;

    if (this.phase === 'night' && this.players[playerId].role === 'Therapist') {
      this.therapistHealTarget = targetId;
      // Send confirmation to therapist
      this.io.to(socketId).emit('healResult', { targetName: this.players[targetId].name });
    }
  }

  adminKillPlayer(targetId) {
    if (this.players[targetId]) {
      this.players[targetId].isAlive = false;
      this.addSystemMessage(`Admin: Player ${this.players[targetId].name} has been KILLED.`);
      if (this.checkWinCondition()) return;
      this.broadcastState();
    }
  }

  adminHealPlayer(targetId) {
    if (this.players[targetId]) {
      this.players[targetId].isAlive = true;
      this.addSystemMessage(`Admin: Player ${this.players[targetId].name} has been HEALED (Saved).`);
      if (this.checkWinCondition()) return;
      this.broadcastState();
    }
  }

  checkWinCondition() {
    const alivePlayers = Object.values(this.players).filter(p => p.isAlive);
    const aliveMoles = alivePlayers.filter(p => p.role === 'Mole').length;
    const aliveMedicals = alivePlayers.length - aliveMoles;

    if (aliveMoles === 0) {
      this.winner = 'Medical';
      this.phase = 'end';
      this.addSystemMessage('Medical Team Wins! All Moles have been discharged.');
      this.broadcastState();
      return true;
    } else if (aliveMoles >= aliveMedicals) {
      this.winner = 'Moles';
      this.phase = 'end';
      this.addSystemMessage('Moles Win! They have taken over the hospital.');
      this.broadcastState();
      return true;
    }
    return false;
  }

  addSystemMessage(text) {
    this.chatHistory.push({
      id: Date.now(),
      sender: 'System',
      text,
      channel: 'public',
      timestamp: new Date().toISOString()
    });
  }

  addChatMessage(senderSocketId, text, channel) {
    const senderId = this.socketToPlayer[senderSocketId];
    if (!senderId) return;

    const player = this.players[senderId];
    if (!player) return;

    // Prevent dead players from speaking in public/mole chat
    if (!player.isAlive && channel !== 'morgue') {
      channel = 'morgue';
    }

    this.chatHistory.push({
      id: Date.now(),
      sender: player.name,
      senderId,
      text,
      channel,
      timestamp: new Date().toISOString()
    });
    this.broadcastState(); // Or broadcast just the message for efficiency
  }

  getPublicState(playerId) {
    // Hide sensitive role info from standard clients
    const currentPlayer = this.players[playerId];

    const safePlayers = Object.values(this.players).map(p => {
      // If I am this player, OR I am a Mole and the other is a Mole, OR game is over, show role
      let showRole = false;
      let showCase = false;

      if (this.phase === 'end') {
        showRole = true;
        showCase = true;
      } else if (playerId === p.id) {
        showRole = true;
        showCase = true;
      } else if (currentPlayer?.role === 'Mole' && p.role === 'Mole') {
        showRole = true;
      }

      return {
        id: p.id,
        name: p.name,
        isAlive: p.isAlive,
        role: showRole ? p.role : 'Unknown',
        caseData: showCase ? p.caseData : (p.caseData ? { diagnosis: p.caseData.diagnosis } : null), // Everyone sees claimed diagnosis
        votedFor: this.phase === 'day' ? this.dayVotes[p.id] : null,
      };
    });

    // Filter chat based on role & alive status
    const safeChat = this.chatHistory.filter(msg => {
      if (msg.channel === 'public') return true;
      if (msg.channel === 'morgue') return !currentPlayer?.isAlive;
      if (msg.channel === 'mole') return currentPlayer?.role === 'Mole';
      return false;
    });

    return {
      phase: this.phase,
      dayCount: this.dayCount,
      players: safePlayers,
      me: currentPlayer,
      chat: safeChat,
      winner: this.winner
    };
  }
  
  getAdminState() {
    // Admin sees everything
    return {
      phase: this.phase,
      dayCount: this.dayCount,
      players: Object.values(this.players),
      chat: this.chatHistory,
      winner: this.winner,
      nightVotes: this.nightVotes,
      dayVotes: this.dayVotes,
      therapistHealTarget: this.therapistHealTarget,
      diagnosticianTarget: this.diagnosticianTarget,
      lastNightActions: this.lastNightActions
    };
  }

  broadcastState() {
    // Send personalized state to each player via their active socketId
    Object.values(this.players).forEach(player => {
      if (player.socketId) {
        this.io.to(player.socketId).emit('gameState', this.getPublicState(player.id));
      }
    });
    
    // Send master state to admin room
    this.io.to('admin').emit('adminState', this.getAdminState());
  }
}

module.exports = GameEngine;
