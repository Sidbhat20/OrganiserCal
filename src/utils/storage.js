import { isSupabaseEnabled, pullRemoteState, pushRemoteState } from './supabaseClient';

const STORAGE_KEY = 'badminton_expense_calculator';
const CLOUD_SYNC_THROTTLE_MS = 800;
const PROFILE_IDS = ['SID', 'VISH'];
const SUMMARY_HISTORY_LIMIT = 50;
let cloudSyncTimer = null;

const createEmptyProfileState = () => ({
  tournaments: [],
  currentTournamentId: null,
  updatedAt: null,
});

const createDefaultAppState = () => ({
  profiles: {
    SID: createEmptyProfileState(),
    VISH: createEmptyProfileState(),
  },
  currentProfileId: null,
  updatedAt: null,
});

const normalizeProfileId = (value) => {
  const id = String(value || '').trim().toUpperCase();
  return PROFILE_IDS.includes(id) ? id : null;
};

const normalizeTournament = (tournament = {}) => ({
  ...tournament,
  expenses: Array.isArray(tournament.expenses) ? tournament.expenses : [],
  collections: Array.isArray(tournament.collections) ? tournament.collections : [],
  summaryHistory: Array.isArray(tournament.summaryHistory) ? tournament.summaryHistory : [],
});

const normalizeProfileState = (profile = {}) => ({
  tournaments: Array.isArray(profile.tournaments) ? profile.tournaments.map(normalizeTournament) : [],
  currentTournamentId: profile.currentTournamentId || null,
  updatedAt: profile.updatedAt || null,
});

const normalizeAppState = (raw = {}) => {
  if (!raw || typeof raw !== 'object') {
    return createDefaultAppState();
  }

  if (!raw.profiles) {
    return {
      profiles: {
        SID: normalizeProfileState({
          tournaments: raw.tournaments,
          currentTournamentId: raw.currentTournamentId,
          updatedAt: raw.updatedAt,
        }),
        VISH: createEmptyProfileState(),
      },
      currentProfileId: normalizeProfileId(raw.currentProfileId),
      updatedAt: raw.updatedAt || null,
    };
  }

  return {
    profiles: {
      SID: normalizeProfileState(raw.profiles.SID),
      VISH: normalizeProfileState(raw.profiles.VISH),
    },
    currentProfileId: normalizeProfileId(raw.currentProfileId),
    updatedAt: raw.updatedAt || null,
  };
};

const getAppState = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return createDefaultAppState();
    }

    return normalizeAppState(JSON.parse(data));
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return createDefaultAppState();
  }
};

const getActiveProfileState = (appState) => {
  const profileId = normalizeProfileId(appState?.currentProfileId);
  if (!profileId) {
    return createEmptyProfileState();
  }

  return normalizeProfileState(appState?.profiles?.[profileId]);
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

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

export const getStorageData = () => {
  const appState = getAppState();
  return getActiveProfileState(appState);
};

export const saveStorageData = (data) => {
  try {
    const nextData = normalizeAppState(data);
    nextData.updatedAt = new Date().toISOString();
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
    const local = getAppState();
    const remote = normalizeAppState(await pullRemoteState());

    if (!remote?.updatedAt) {
      if (local.updatedAt || local.profiles.SID.tournaments.length > 0 || local.profiles.VISH.tournaments.length > 0) {
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

export const getCurrentProfile = () => {
  return normalizeProfileId(getAppState().currentProfileId);
};

export const setCurrentProfile = (profileId) => {
  const appState = getAppState();
  appState.currentProfileId = normalizeProfileId(profileId);
  saveStorageData(appState);
};

export const clearCurrentProfile = () => {
  const appState = getAppState();
  appState.currentProfileId = null;
  saveStorageData(appState);
};

const commitProfileMutation = (profileId, updater) => {
  const normalizedProfileId = normalizeProfileId(profileId) || getCurrentProfile();
  if (!normalizedProfileId) return null;

  const appState = getAppState();
  const profileState = normalizeProfileState(appState.profiles[normalizedProfileId]);
  const result = updater(profileState, appState);

  profileState.updatedAt = new Date().toISOString();
  appState.profiles[normalizedProfileId] = profileState;
  appState.currentProfileId = normalizedProfileId;
  saveStorageData(appState);

  return result;
};

export const createTournament = (name, club, date, sidInvestment = 0) => {
  const currentProfileId = getCurrentProfile();
  return commitProfileMutation(currentProfileId, (profileState) => {
    const tournament = {
      id: generateId(),
      name,
      club,
      date,
      sidInvestment: Number(sidInvestment) || 0,
      createdAt: new Date().toISOString(),
      expenses: [],
      collections: [],
      summaryHistory: [],
    };

    profileState.tournaments.push(tournament);
    profileState.currentTournamentId = tournament.id;
    return tournament;
  });
};

export const updateTournament = (id, updates) => {
  const currentProfileId = getCurrentProfile();
  return commitProfileMutation(currentProfileId, (profileState) => {
    const index = profileState.tournaments.findIndex((tournament) => tournament.id === id);
    if (index === -1) return null;

    profileState.tournaments[index] = normalizeTournament({
      ...profileState.tournaments[index],
      ...updates,
    });

    return profileState.tournaments[index];
  });
};

export const deleteTournament = (id) => {
  const currentProfileId = getCurrentProfile();
  return commitProfileMutation(currentProfileId, (profileState) => {
    profileState.tournaments = profileState.tournaments.filter((tournament) => tournament.id !== id);
    if (profileState.currentTournamentId === id) {
      profileState.currentTournamentId = profileState.tournaments[0]?.id || null;
    }
    return profileState.currentTournamentId;
  });
};

export const setCurrentTournament = (id) => {
  const currentProfileId = getCurrentProfile();
  return commitProfileMutation(currentProfileId, (profileState) => {
    profileState.currentTournamentId = id || null;
    return profileState.currentTournamentId;
  });
};

export const getCurrentTournament = () => {
  const profileState = getStorageData();
  if (!profileState.currentTournamentId) return null;
  return profileState.tournaments.find((tournament) => tournament.id === profileState.currentTournamentId) || null;
};

export const getAllTournaments = () => {
  return getStorageData().tournaments;
};

export const addExpense = (tournamentId, expense) => {
  const currentProfileId = getCurrentProfile();
  return commitProfileMutation(currentProfileId, (profileState) => {
    const tournament = profileState.tournaments.find((item) => item.id === tournamentId);
    if (!tournament) return null;

    const payer = String(expense.paidBy || '').toUpperCase();
    const normalizedPayer = payer === 'SIDDHARTH' || payer === 'SID'
      ? 'SID'
      : payer === 'VISHWESH' || payer === 'VISH'
        ? 'VISH'
        : payer;

    tournament.expenses.push({
      id: generateId(),
      ...expense,
      paidBy: normalizedPayer,
      createdAt: new Date().toISOString(),
    });

    return tournament.expenses;
  });
};

export const deleteExpense = (tournamentId, expenseId) => {
  const currentProfileId = getCurrentProfile();
  return commitProfileMutation(currentProfileId, (profileState) => {
    const tournament = profileState.tournaments.find((item) => item.id === tournamentId);
    if (!tournament) return null;

    tournament.expenses = tournament.expenses.filter((expense) => expense.id !== expenseId);
    return tournament.expenses;
  });
};

export const addCollection = (tournamentId, collection) => {
  const currentProfileId = getCurrentProfile();
  return commitProfileMutation(currentProfileId, (profileState) => {
    const tournament = profileState.tournaments.find((item) => item.id === tournamentId);
    if (!tournament) return null;

    tournament.collections.push({
      id: generateId(),
      ...collection,
      createdAt: new Date().toISOString(),
    });

    return tournament.collections;
  });
};

export const deleteCollection = (tournamentId, collectionId) => {
  const currentProfileId = getCurrentProfile();
  return commitProfileMutation(currentProfileId, (profileState) => {
    const tournament = profileState.tournaments.find((item) => item.id === tournamentId);
    if (!tournament) return null;

    tournament.collections = tournament.collections.filter((collection) => collection.id !== collectionId);
    return tournament.collections;
  });
};

export const addSummaryHistory = (tournamentId, entry) => {
  const currentProfileId = getCurrentProfile();
  return commitProfileMutation(currentProfileId, (profileState) => {
    const tournament = profileState.tournaments.find((item) => item.id === tournamentId);
    if (!tournament) return null;

    const nextEntry = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...entry,
    };

    tournament.summaryHistory = [nextEntry, ...(tournament.summaryHistory || [])].slice(0, SUMMARY_HISTORY_LIMIT);
    return tournament.summaryHistory;
  });
};
