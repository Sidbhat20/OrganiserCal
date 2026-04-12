import { isSupabaseEnabled, pullRemoteState, pushRemoteState } from './supabaseClient';

// Storage keys
const STORAGE_KEY = 'badminton_expense_calculator';
const CLOUD_SYNC_THROTTLE_MS = 800;
let cloudSyncTimer = null;

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Get all data from localStorage
export const getStorageData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        tournaments: parsed.tournaments || [],
        currentTournamentId: parsed.currentTournamentId || null,
        updatedAt: parsed.updatedAt || null
      };
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error);
  }
  return { tournaments: [], currentTournamentId: null, updatedAt: null };
};

const scheduleCloudSync = (data) => {
  if (!isSupabaseEnabled) return;

  if (cloudSyncTimer) {
    clearTimeout(cloudSyncTimer);
  }

  cloudSyncTimer = setTimeout(async () => {
    await pushRemoteState(data);
  }, CLOUD_SYNC_THROTTLE_MS);
};

// Save all data to localStorage
export const saveStorageData = (data) => {
  try {
    const nextData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    scheduleCloudSync(nextData);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const initSupabaseSync = async () => {
  if (!isSupabaseEnabled) {
    return false;
  }

  try {
    const local = getStorageData();
    const remote = await pullRemoteState();

    if (!remote) {
      if (local.tournaments.length > 0) {
        await pushRemoteState(local);
      }
      return true;
    }

    const localTs = local.updatedAt ? Date.parse(local.updatedAt) : 0;
    const remoteTs = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;

    if (remoteTs > localTs) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
    } else if (localTs > 0) {
      await pushRemoteState(local);
    }

    return true;
  } catch (error) {
    console.warn('Supabase sync init failed:', error.message);
    return false;
  }
};

// Tournament operations
export const createTournament = (name, club, date, sidInvestment = 0) => {
  const data = getStorageData();
  const tournament = {
    id: generateId(),
    name,
    club,
    date,
    sidInvestment: Number(sidInvestment) || 0,
    createdAt: new Date().toISOString(),
    expenses: [],
    collections: []
  };
  data.tournaments.push(tournament);
  data.currentTournamentId = tournament.id;
  saveStorageData(data);
  return tournament;
};

export const updateTournament = (id, updates) => {
  const data = getStorageData();
  const index = data.tournaments.findIndex(t => t.id === id);
  if (index !== -1) {
    data.tournaments[index] = { ...data.tournaments[index], ...updates };
    saveStorageData(data);
    return data.tournaments[index];
  }
  return null;
};

export const deleteTournament = (id) => {
  const data = getStorageData();
  data.tournaments = data.tournaments.filter(t => t.id !== id);
  if (data.currentTournamentId === id) {
    data.currentTournamentId = data.tournaments.length > 0 ? data.tournaments[0].id : null;
  }
  saveStorageData(data);
  return data.currentTournamentId;
};

export const setCurrentTournament = (id) => {
  const data = getStorageData();
  data.currentTournamentId = id;
  saveStorageData(data);
};

export const getCurrentTournament = () => {
  const data = getStorageData();
  if (!data.currentTournamentId) return null;
  return data.tournaments.find(t => t.id === data.currentTournamentId) || null;
};

export const getAllTournaments = () => {
  const data = getStorageData();
  return data.tournaments;
};

// Expense operations
export const addExpense = (tournamentId, expense) => {
  const data = getStorageData();
  const tournament = data.tournaments.find(t => t.id === tournamentId);
  if (tournament) {
    const payer = String(expense.paidBy || '').toUpperCase();
    const normalizedPayer = payer === 'SIDDHARTH' || payer === 'SID' ? 'SID' : (payer === 'VISHWESH' || payer === 'VISH' ? 'VISH' : payer);

    tournament.expenses.push({
      id: generateId(),
      ...expense,
      paidBy: normalizedPayer,
      createdAt: new Date().toISOString()
    });
    saveStorageData(data);
    return tournament.expenses;
  }
  return null;
};

export const deleteExpense = (tournamentId, expenseId) => {
  const data = getStorageData();
  const tournament = data.tournaments.find(t => t.id === tournamentId);
  if (tournament) {
    tournament.expenses = tournament.expenses.filter(e => e.id !== expenseId);
    saveStorageData(data);
    return tournament.expenses;
  }
  return null;
};

// Collection operations
export const addCollection = (tournamentId, collection) => {
  const data = getStorageData();
  const tournament = data.tournaments.find(t => t.id === tournamentId);
  if (tournament) {
    tournament.collections.push({
      id: generateId(),
      ...collection,
      createdAt: new Date().toISOString()
    });
    saveStorageData(data);
    return tournament.collections;
  }
  return null;
};

export const deleteCollection = (tournamentId, collectionId) => {
  const data = getStorageData();
  const tournament = data.tournaments.find(t => t.id === tournamentId);
  if (tournament) {
    tournament.collections = tournament.collections.filter(c => c.id !== collectionId);
    saveStorageData(data);
    return tournament.collections;
  }
  return null;
};
