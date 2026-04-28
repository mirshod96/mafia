const fs = require('fs');
const medicalCases = require('./data/medicalCases.json');

class GameEngine {
  constructor(io) {
    this.io = io;
    this.resetState();
  }

  resetState() {
    this.players = {}; // socketId -> player object
    this.phase = 'lobby'; // lobby, night, day, end
    this.dayCount = 0;
    this.nightVotes = {}; // moleSocketId -> targetPlayerId
    this.dayVotes = {}; // socketId -> targetPlayerId
    this.diagnosticianTarget = null;
    this.therapistRequest = null; // { therapistId, targetId, status: 'pending'|'approved'|'rejected' }
    this.eliminatedTonight = null;
    this.winner = null;
    this.chatHistory = [];
  }

  addPlayer(socketId, name) {
    if (this.phase !== 'lobby') return false;
    // For testing, we might want to allow fewer players, but the rules say 18.
    // I will allow any number up to 18 for testing, and dynamically scale roles, 
    // but the default requested is 18.
    
    this.players[socketId] = {
      id: socketId,
      name,
      role: null,
      caseData: null, // real case for patients/doctors, fake for moles
      isAlive: true,
      socketId,
    };
    
    this.broadcastState();
    return true;
  }

  removePlayer(socketId) {
    delete this.players[socketId];
    if (Object.keys(this.players).length === 0) {
      this.resetState();
    } else {
      this.broadcastState();
    }
  }

  startGame() {
    const playerIds = Object.keys(this.players);
    const numPlayers = playerIds.length;
    
    // Scale roles based on players for easier testing, but aim for 18
    let numMoles = Math.max(1, Math.floor(numPlayers / 6));
    let hasDiagnostician = numPlayers >= 5 ? 1 : 0;
    let hasTherapist = numPlayers >= 6 ? 1 : 0;
    
    // If exactly 18 players, it matches the spec: 3 Moles, 1 Diag, 1 Ther, 13 Pat
    if (numPlayers === 18) {
      numMoles = 3; hasDiagnostician = 1; hasTherapist = 1;
    }

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
    this.therapistRequest = null;
    this.eliminatedTonight = null;
    
    this.addSystemMessage(`Night ${this.dayCount} has fallen. The Moles are choosing a target.`);
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

    if (targetToEliminate && this.players[targetToEliminate]) {
      this.players[targetToEliminate].isAlive = false;
      this.eliminatedTonight = targetToEliminate;
      this.addSystemMessage(`Morning report: ${this.players[targetToEliminate].name} was eliminated during the night.`);
    } else {
      this.addSystemMessage(`Morning report: The night was peaceful. No one was eliminated.`);
    }

    // Check Win Condition
    if (this.checkWinCondition()) return;

    this.broadcastState();
  }

  handleVote(socketId, targetId, isDay) {
    if (isDay && this.phase === 'day') {
      this.dayVotes[socketId] = targetId;
      this.broadcastState();
    } else if (!isDay && this.phase === 'night' && this.players[socketId].role === 'Mole') {
      this.nightVotes[socketId] = targetId;
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
    if (this.phase === 'night' && this.players[socketId].role === 'Diagnostician') {
      const target = this.players[targetId];
      // Send private result
      this.io.to(socketId).emit('investigationResult', {
        targetName: target.name,
        role: target.role === 'Mole' ? 'Mole' : 'Patient'
      });
    }
  }

  therapistRequestAdmin(socketId, targetId) {
    if (this.phase === 'day' && this.players[socketId].role === 'Therapist') {
      this.therapistRequest = {
        therapistId: socketId,
        targetId,
        status: 'pending'
      };
      this.addSystemMessage(`The Therapist has requested the medical chart of ${this.players[targetId].name}.`);
      this.broadcastState();
    }
  }

  adminResolveTherapistRequest(approved) {
    if (this.therapistRequest && this.therapistRequest.status === 'pending') {
      this.therapistRequest.status = approved ? 'approved' : 'rejected';
      
      if (approved) {
        const target = this.players[this.therapistRequest.targetId];
        // In real game, emit full data to Therapist, but for now we just show what their real data is
        this.io.to(this.therapistRequest.therapistId).emit('therapistDataResult', {
          targetName: target.name,
          caseData: target.caseData
        });
        this.addSystemMessage(`Admin approved the Therapist's request.`);
      } else {
        this.addSystemMessage(`Admin rejected the Therapist's request.`);
      }
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

  addChatMessage(senderId, text, channel) {
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

  getPublicState(socketId) {
    // Hide sensitive role info from standard clients
    const isClientAdmin = false; // Add real admin auth later
    const currentPlayer = this.players[socketId];

    const safePlayers = Object.values(this.players).map(p => {
      // If I am this player, OR I am a Mole and the other is a Mole, OR game is over, show role
      let showRole = false;
      let showCase = false;

      if (this.phase === 'end') {
        showRole = true;
        showCase = true;
      } else if (socketId === p.id) {
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
      therapistRequest: this.therapistRequest,
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
      therapistRequest: this.therapistRequest,
      winner: this.winner,
      nightVotes: this.nightVotes,
      dayVotes: this.dayVotes
    };
  }

  broadcastState() {
    // Send personalized state to each player
    Object.keys(this.players).forEach(socketId => {
      this.io.to(socketId).emit('gameState', this.getPublicState(socketId));
    });
    
    // Send master state to admin room
    this.io.to('admin').emit('adminState', this.getAdminState());
  }
}

module.exports = GameEngine;
