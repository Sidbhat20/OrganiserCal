import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Settings,
  Receipt,
  Wallet,
  FileText,
  Plus,
  X,
  Trash2,
  Printer,
  Sparkles,
  LogOut,
  ShieldCheck,
  History,
  Download,
  Eye,
  Lock,
} from 'lucide-react';
import * as storage from './utils/storage';
import AIChat from './AIChat';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  buildTournamentFinancialSnapshot,
  getCategoryIcon,
  getSourceIcon,
} from './utils/helpers';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')
).replace(/\/$/, '');

const TABS = {
  SETUP: 'setup',
  EXPENSES: 'expenses',
  COLLECTIONS: 'collections',
  SUMMARY: 'summary',
};

const EXPENSE_CATEGORIES = [
  'Court',
  'Shuttle',
  'Referee',
  'Food',
  'Medals',
  'Trophy',
  'Certificate',
  'Criteria',
  'Other',
];

const COLLECTION_SOURCES = ['PlayMatches', 'UPI', 'Cash'];
const CLUBS = ['Velocity', 'Breathe'];
const LAST_PAYER_KEY = 'expense_last_payer';
const USER_PROFILES = [
  {
    id: 'SID',
    shortLabel: 'SID',
    name: 'Siddharth Bhat',
    description: 'Manage Siddharth workspace and tournament records.',
    accent: '#FFC107',
    pin: '2010',
  },
  {
    id: 'VISH',
    shortLabel: 'VISH',
    name: 'Vishwesh Kadam',
    description: 'Manage Vishwesh workspace and tournament records.',
    accent: '#A7F3D0',
    pin: '1005',
  },
];

const getClubLogo = (club) => {
  const basePath = import.meta.env.BASE_URL;
  if (club === 'Velocity') return `${basePath}velocity logo.jpg`;
  if (club === 'Breathe') return `${basePath}breathe logo.jpg`;
  return null;
};

function App() {
  const [currentProfile, setCurrentProfile] = useState(() => storage.getCurrentProfile());
  const [tournaments, setTournaments] = useState([]);
  const [currentTournament, setCurrentTournament] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.SETUP);
  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showQuickExpenseModal, setShowQuickExpenseModal] = useState(false);
  const [toast, setToast] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedLoginProfileId, setSelectedLoginProfileId] = useState(null);
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);
  const billContentRef = useRef(null);

  const [tournamentForm, setTournamentForm] = useState({ name: '', club: 'Velocity', date: '' });
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    paidBy: 'SID',
    splitSidAmount: '',
    splitVishAmount: '',
    note: '',
  });
  const [collectionForm, setCollectionForm] = useState({ source: 'PlayMatches', amount: '', isRefund: false });
  const [lastUsedPayer, setLastUsedPayer] = useState(() => {
    const saved = localStorage.getItem(LAST_PAYER_KEY);
    return saved === 'SID' || saved === 'VISH' ? saved : 'SID';
  });

  const currentProfileMeta = useMemo(
    () => USER_PROFILES.find((profile) => profile.id === currentProfile) || null,
    [currentProfile],
  );

  const loadData = useCallback(() => {
    const nextProfile = storage.getCurrentProfile();
    setCurrentProfile(nextProfile);

    if (!nextProfile) {
      setTournaments([]);
      setCurrentTournament(null);
      return;
    }

    setTournaments(storage.getAllTournaments());
    setCurrentTournament(storage.getCurrentTournament());
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      await storage.initSupabaseSync();
      loadData();
    };

    bootstrap();
  }, [loadData]);

  useEffect(() => {
    localStorage.setItem(LAST_PAYER_KEY, lastUsedPayer);
  }, [lastUsedPayer]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const financialSnapshot = useMemo(
    () => buildTournamentFinancialSnapshot(currentTournament),
    [currentTournament],
  );
  const { expenseTotals, collectionTotals, split, aiContext, categoryEntries, highestCategory } = financialSnapshot;
  const summaryHistory = useMemo(() => currentTournament?.summaryHistory || [], [currentTournament]);

  const handleChooseLoginProfile = useCallback((profileId) => {
    setSelectedLoginProfileId(profileId);
    setLoginPin('');
    setLoginError('');
  }, []);

  const handleLogin = useCallback((e) => {
    e.preventDefault();

    const selectedProfile = USER_PROFILES.find((profile) => profile.id === selectedLoginProfileId);
    if (!selectedProfile) {
      setLoginError('Please select Siddharth or Vishwesh first.');
      return;
    }

    if (loginPin !== selectedProfile.pin) {
      setLoginError('Incorrect PIN. Please try again.');
      return;
    }

    storage.setCurrentProfile(selectedProfile.id);
    setActiveTab(TABS.SETUP);
    setShowNewTournamentModal(false);
    setShowBillModal(false);
    setShowQuickExpenseModal(false);
    setLoginPin('');
    setLoginError('');
    loadData();
  }, [selectedLoginProfileId, loginPin, loadData]);

  const handleLogout = useCallback(() => {
    storage.clearCurrentProfile();
    setActiveTab(TABS.SETUP);
    setShowNewTournamentModal(false);
    setShowBillModal(false);
    setShowQuickExpenseModal(false);
    setAiAnalysis('');
    setSelectedHistoryEntry(null);
    setSelectedLoginProfileId(null);
    setLoginPin('');
    setLoginError('');
    loadData();
  }, [loadData]);

  const handleCreateTournament = useCallback((e) => {
    e.preventDefault();
    if (!currentProfile || !tournamentForm.name || !tournamentForm.date) return;

    storage.createTournament(tournamentForm.name, tournamentForm.club, tournamentForm.date);
    loadData();
    setShowNewTournamentModal(false);
    setTournamentForm({ name: '', club: 'Velocity', date: '' });
    setActiveTab(TABS.EXPENSES);
    setToast(`Tournament created in ${currentProfileMeta?.name || 'selected'} workspace`);
  }, [currentProfile, tournamentForm, loadData, currentProfileMeta]);

  const handleSelectTournament = useCallback((e) => {
    const id = e.target.value;
    storage.setCurrentTournament(id);
    loadData();
  }, [loadData]);

  const handleDeleteTournament = useCallback((id) => {
    if (window.confirm('Are you sure you want to delete this tournament?')) {
      storage.deleteTournament(id);
      loadData();
      setToast('Tournament deleted');
    }
  }, [loadData]);

  const handleUpdateTournament = useCallback((field, value) => {
    if (!currentTournament) return;
    storage.updateTournament(currentTournament.id, { [field]: value });
    loadData();
  }, [currentTournament, loadData]);

  const openQuickExpenseModal = useCallback((category) => {
    setExpenseForm({
      category,
      amount: '',
      paidBy: lastUsedPayer,
      splitSidAmount: '',
      splitVishAmount: '',
      note: '',
    });
    setShowQuickExpenseModal(true);
  }, [lastUsedPayer]);

  const handleAmountChange = useCallback((value) => {
    const amount = Number(value) || 0;
    if (expenseForm.paidBy !== 'SPLIT') {
      setExpenseForm((prev) => ({ ...prev, amount: value }));
      return;
    }

    const sidHalf = amount > 0 ? (amount / 2).toFixed(2) : '';
    const vishHalf = amount > 0 ? (amount - Number(sidHalf)).toFixed(2) : '';
    setExpenseForm((prev) => ({
      ...prev,
      amount: value,
      splitSidAmount: sidHalf,
      splitVishAmount: vishHalf,
    }));
  }, [expenseForm.paidBy]);

  const handlePayerChange = useCallback((payer) => {
    setExpenseForm((prev) => {
      const amount = Number(prev.amount) || 0;
      if (payer === 'SPLIT') {
        const sidHalf = amount > 0 ? (amount / 2).toFixed(2) : '';
        const vishHalf = amount > 0 ? (amount - Number(sidHalf)).toFixed(2) : '';
        return { ...prev, paidBy: payer, splitSidAmount: sidHalf, splitVishAmount: vishHalf };
      }
      return { ...prev, paidBy: payer };
    });

    if (payer === 'SID' || payer === 'VISH') {
      setLastUsedPayer(payer);
    }
  }, []);

  const handleQuickAddExpense = useCallback((e) => {
    e.preventDefault();
    if (!currentTournament || !expenseForm.category) return;

    const amount = Number(expenseForm.amount);
    if (!amount || amount <= 0) return;

    const note = expenseForm.note?.trim() || undefined;

    if (expenseForm.paidBy === 'SPLIT') {
      const sidAmount = Number(expenseForm.splitSidAmount) || 0;
      const vishAmount = Number(expenseForm.splitVishAmount) || 0;
      const delta = Math.abs((sidAmount + vishAmount) - amount);

      if (delta > 0.01) {
        setToast('Split invalid: SID + VISH must equal total amount');
        return;
      }

      storage.addExpense(currentTournament.id, {
        category: expenseForm.category,
        amount,
        paidBy: 'SPLIT',
        split: {
          sidAmount,
          vishAmount,
        },
        note,
      });
    } else {
      storage.addExpense(currentTournament.id, {
        category: expenseForm.category,
        amount,
        paidBy: expenseForm.paidBy,
        note,
      });
    }

    loadData();
    setShowQuickExpenseModal(false);
    setExpenseForm((prev) => ({
      ...prev,
      amount: '',
      splitSidAmount: '',
      splitVishAmount: '',
      note: '',
    }));
    setToast(`${formatCurrency(amount)} added to ${expenseForm.category}`);
  }, [currentTournament, expenseForm, loadData]);

  const handleDeleteExpense = useCallback((expenseId) => {
    if (!currentTournament) return;
    storage.deleteExpense(currentTournament.id, expenseId);
    loadData();
    setToast('Expense deleted');
  }, [currentTournament, loadData]);

  const handleAddCollection = useCallback((e) => {
    e.preventDefault();
    if (!collectionForm.amount || !currentTournament) return;

    storage.addCollection(currentTournament.id, {
      source: collectionForm.source,
      amount: parseFloat(collectionForm.amount),
      isRefund: collectionForm.isRefund,
    });
    loadData();
    setCollectionForm({ source: 'PlayMatches', amount: '', isRefund: false });
    setToast(collectionForm.isRefund ? 'Refund added' : 'Collection added');
  }, [collectionForm, currentTournament, loadData]);

  const handleDeleteCollection = useCallback((collectionId) => {
    if (!currentTournament) return;
    storage.deleteCollection(currentTournament.id, collectionId);
    loadData();
    setToast('Collection deleted');
  }, [currentTournament, loadData]);

  const handleAnalyzeTournament = useCallback(async () => {
    if (!currentTournament) return;

    setAnalysisLoading(true);
    setAiAnalysis('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: `You are a financial assistant for badminton tournament organizers. You analyze expenses, collections, and profit. Give clear, short, data-driven insights. Avoid generic advice. Use INR currency and include exact numbers and percentages from provided data.\n\nTournament Financial Context:\n${JSON.stringify(aiContext, null, 2)}`,
          messages: [
            {
              role: 'user',
              content: 'Analyze tournament and provide: 1) overspending areas, 2) highest expense category, 3) profit margin analysis, 4) top 3 improvement suggestions with numbers.',
            },
          ],
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setAiAnalysis(data.response || 'No analysis generated.');
    } catch (error) {
      setAiAnalysis(`Analysis error: ${error.message}`);
    } finally {
      setAnalysisLoading(false);
    }
  }, [currentTournament, aiContext]);

  const savePrintedSummary = useCallback((action = 'PRINT') => {
    if (!currentTournament || !currentProfileMeta) return;

    storage.addSummaryHistory(currentTournament.id, {
      action,
      printedBy: currentProfileMeta.name,
      profileId: currentProfileMeta.id,
      tournamentName: currentTournament.name,
      tournamentDate: currentTournament.date,
      totalCollection: collectionTotals.netCollection,
      totalIncome: collectionTotals.totalIncome,
      totalRefunds: collectionTotals.totalRefunds,
      totalExpenses: expenseTotals.totalExpenses,
      profit: split.profit,
      highestCategory: highestCategory.label,
      highestCategoryAmount: highestCategory.amount,
      settlementMessage: split.settlement.message,
      sidInvestment: expenseTotals.sidInvestment,
      vishInvestment: expenseTotals.vishInvestment,
    });
    loadData();
  }, [currentTournament, currentProfileMeta, collectionTotals, expenseTotals, split, highestCategory, loadData]);

  const handleDownloadPdf = useCallback(async () => {
    if (!billContentRef.current || !currentTournament) return;

    const html2pdf = (await import('html2pdf.js')).default;
    const safeName = (currentTournament.name || 'tournament-summary').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'tournament-summary';

    await html2pdf()
      .set({
        margin: 10,
        filename: `${safeName}-summary.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(billContentRef.current)
      .save();
  }, [currentTournament]);

  const handleExportSummaryHistory = useCallback(() => {
    if (!currentTournament || summaryHistory.length === 0) {
      setToast('No printed history to export yet');
      return;
    }

    const safeName = (currentTournament.name || 'summary-history').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'summary-history';
    const payload = {
      exportedAt: new Date().toISOString(),
      exportedBy: currentProfileMeta?.name,
      tournament: {
        id: currentTournament.id,
        name: currentTournament.name,
        date: currentTournament.date,
        club: currentTournament.club,
      },
      summaryHistory,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}-printed-history.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToast('Printed history exported');
  }, [currentTournament, summaryHistory, currentProfileMeta]);

  const handlePrintBill = useCallback(() => {
    savePrintedSummary('PRINT');
    setToast('Printed bill saved to history');
    setTimeout(() => window.print(), 120);
  }, [savePrintedSummary]);

  const renderLoginScreen = () => {
    const selectedProfile = USER_PROFILES.find((profile) => profile.id === selectedLoginProfileId);

    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-badge">
            <ShieldCheck size={18} />
            Secure login
          </div>
          <h1 className="auth-title">Choose your workspace</h1>
          <p className="auth-copy">
            Home opens only after selecting a login and entering the correct PIN. Siddharth and Vishwesh each get
            separate saved tournaments, expenses, collections, and printed summary history.
          </p>

          <div className="auth-grid">
            {USER_PROFILES.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={`auth-option ${selectedLoginProfileId === profile.id ? 'auth-option-active' : ''}`}
                onClick={() => handleChooseLoginProfile(profile.id)}
                style={{ '--auth-accent': profile.accent }}
              >
                <div className="auth-option-top">
                  <span className="auth-option-tag">{profile.shortLabel}</span>
                  <span className="auth-option-arrow">→</span>
                </div>
                <h3>{profile.name}</h3>
                <p>{profile.description}</p>
              </button>
            ))}
          </div>

          <form className="auth-pin-panel" onSubmit={handleLogin}>
            <div className="auth-pin-header">
              <Lock size={18} />
              <span>{selectedProfile ? `Enter PIN for ${selectedProfile.name}` : 'Select a profile first'}</span>
            </div>
            <div className="auth-pin-row">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className="form-input auth-pin-input"
                placeholder="Enter 4-digit PIN"
                value={loginPin}
                onChange={(e) => {
                  setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setLoginError('');
                }}
                disabled={!selectedProfile}
              />
              <button type="submit" className="btn auth-login-btn" disabled={!selectedProfile || loginPin.length !== 4}>
                Open Workspace
              </button>
            </div>
            {loginError && <div className="auth-error">{loginError}</div>}
          </form>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">🏸</div>
      <h3 className="empty-state-title">No Tournament Yet</h3>
      <p className="empty-state-text">Create your first tournament to start tracking expenses and collections.</p>
      <button className="btn" onClick={() => setShowNewTournamentModal(true)}>
        <Plus size={18} style={{ marginRight: 8 }} />
        Create Tournament
      </button>
    </div>
  );

  const renderSetup = () => (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Tournament Details</h3>
        </div>

        <div className="form-group">
          <label className="form-label">Tournament Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., Krida Velocity Cup"
            value={currentTournament?.name || ''}
            onChange={(e) => handleUpdateTournament('name', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Club</label>
          <div className="pill-group">
            {CLUBS.map((club) => (
              <button
                key={club}
                type="button"
                className={`pill-btn ${currentTournament?.club === club ? 'active' : ''}`}
                onClick={() => handleUpdateTournament('club', club)}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <img
                  src={getClubLogo(club)}
                  alt={club}
                  style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'contain' }}
                />
                {club}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            type="date"
            className="form-input"
            value={currentTournament?.date || ''}
            onChange={(e) => handleUpdateTournament('date', e.target.value)}
          />
        </div>
      </div>

      {currentTournament && (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <h3 className="card-title" style={{ color: 'var(--danger)', marginBottom: 12 }}>Danger Zone</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
            Permanently delete this tournament and all its data for {currentProfileMeta?.name}.
          </p>
          <button className="btn btn-danger" onClick={() => handleDeleteTournament(currentTournament.id)}>
            <Trash2 size={18} style={{ marginRight: 8 }} />
            Delete Tournament
          </button>
        </div>
      )}
    </div>
  );

  const renderExpenses = () => (
    <div>
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>Quick Add Expense</h3>
        <p className="section-note">Tap a category to add an expense in 1–2 clicks.</p>
        <div className="quick-expense-grid">
          {EXPENSE_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className="quick-expense-btn"
              onClick={() => openQuickExpenseModal(category)}
            >
              <span className="quick-expense-icon">{getCategoryIcon(category)}</span>
              <span>{category}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Expenses</h3>
          <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatCurrency(expenseTotals.totalExpenses)}</span>
        </div>

        {(!currentTournament?.expenses || currentTournament.expenses.length === 0) ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No expenses yet</p>
        ) : (
          currentTournament.expenses.map((expense) => (
            <div key={expense.id} className="list-item">
              <div className="list-item-info">
                <div className="list-item-icon">{getCategoryIcon(expense.category)}</div>
                <div className="list-item-details">
                  <div className="list-item-title">{expense.category}</div>
                  <span className={`badge badge-${String(expense.paidBy || '').toLowerCase()}`}>{expense.paidBy || 'VISH'}</span>
                  {expense.paidBy === 'SPLIT' && (
                    <div className="list-item-subtitle">
                      SID {formatCurrency(expense?.split?.sidAmount)} • VISH {formatCurrency(expense?.split?.vishAmount)}
                    </div>
                  )}
                  {expense.note && <div className="list-item-subtitle">{expense.note}</div>}
                </div>
              </div>
              <div className="list-item-trailing">
                <span className="list-item-amount" style={{ color: 'var(--danger)' }}>{formatCurrency(expense.amount)}</span>
                <button className="list-item-delete" onClick={() => handleDeleteExpense(expense.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderCollections = () => (
    <div>
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>Add Collection</h3>
        <form onSubmit={handleAddCollection}>
          <div className="form-group">
            <label className="form-label">Source</label>
            <select
              className="form-input"
              value={collectionForm.source}
              onChange={(e) => setCollectionForm({ ...collectionForm, source: e.target.value })}
            >
              {COLLECTION_SOURCES.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${!collectionForm.isRefund ? 'active' : ''}`}
                onClick={() => setCollectionForm({ ...collectionForm, isRefund: false })}
              >
                Income
              </button>
              <button
                type="button"
                className={`toggle-btn ${collectionForm.isRefund ? 'active refund' : ''}`}
                onClick={() => setCollectionForm({ ...collectionForm, isRefund: true })}
              >
                Refund
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Amount</label>
            <div className="amount-input-wrapper">
              <input
                type="number"
                className="form-input amount-input"
                placeholder="0"
                value={collectionForm.amount}
                onChange={(e) => setCollectionForm({ ...collectionForm, amount: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="btn">
            {collectionForm.isRefund ? 'Add Refund' : 'Add Collection'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Collections</h3>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
            {formatCurrency(collectionTotals.netCollection)}
          </span>
        </div>

        {(!currentTournament?.collections || currentTournament.collections.length === 0) ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No collections yet</p>
        ) : (
          currentTournament.collections.map((collection) => (
            <div key={collection.id} className="list-item">
              <div className="list-item-info">
                <div className="list-item-icon">{getSourceIcon(collection.source)}</div>
                <div className="list-item-details">
                  <div className="list-item-title">{collection.source}</div>
                  <span className={`badge ${collection.isRefund ? 'badge-refund' : 'badge-income'}`}>
                    {collection.isRefund ? 'Refund' : 'Income'}
                  </span>
                </div>
              </div>
              <div className="list-item-trailing">
                <span className="list-item-amount" style={{ color: collection.isRefund ? 'var(--danger)' : 'var(--accent-primary)' }}>
                  {collection.isRefund ? '-' : '+'}{formatCurrency(collection.amount)}
                </span>
                <button className="list-item-delete" onClick={() => handleDeleteCollection(collection.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderSummaryHistory = () => (
    <div className="card">
      <div className="card-header history-header">
        <div>
          <h3 className="card-title">Past Printed Bills</h3>
          <p className="section-note history-header-note">Saved snapshots from every Print Bill action.</p>
        </div>
        <div className="history-toolbar">
          <button type="button" className="btn btn-secondary history-export-btn" onClick={handleExportSummaryHistory}>
            <Download size={16} style={{ marginRight: 8 }} />
            Export
          </button>
          <History size={18} />
        </div>
      </div>

      {summaryHistory.length === 0 ? (
        <p className="empty-history">No printed summaries yet. Use Print Bill and each snapshot will be saved here.</p>
      ) : (
        <div className="history-list">
          {summaryHistory.map((entry) => (
            <div key={entry.id} className="history-item">
              <div className="history-item-top">
                <div>
                  <div className="history-title">{entry.tournamentName || currentTournament?.name}</div>
                  <div className="history-meta">
                    {formatDateTime(entry.createdAt)} • {entry.printedBy}
                  </div>
                </div>
                <span className="bill-history-badge">{entry.action || 'PRINT'}</span>
              </div>

              <div className="history-values">
                <div>
                  <span>Collection</span>
                  <strong>{formatCurrency(entry.totalCollection)}</strong>
                </div>
                <div>
                  <span>Expenses</span>
                  <strong>{formatCurrency(entry.totalExpenses)}</strong>
                </div>
                <div>
                  <span>Profit</span>
                  <strong>{formatCurrency(entry.profit)}</strong>
                </div>
                <div>
                  <span>Top Expense</span>
                  <strong>{entry.highestCategory || '—'}</strong>
                </div>
              </div>

              <div className="history-inline">{entry.settlementMessage}</div>
              <div className="history-actions-row">
                <button type="button" className="btn btn-secondary history-view-btn" onClick={() => setSelectedHistoryEntry(entry)}>
                  <Eye size={16} style={{ marginRight: 8 }} />
                  View Snapshot
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSummary = () => (
    <div>
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-label">Total Collection</div>
          <div className="summary-card-value positive">{formatCurrency(collectionTotals.netCollection)}</div>
          <div className="summary-card-breakdown">
            <span>Income {formatCurrency(collectionTotals.totalIncome)}</span>
            <span>Refunds {formatCurrency(collectionTotals.totalRefunds)}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Total Expenses</div>
          <div className="summary-card-value negative">{formatCurrency(expenseTotals.totalExpenses)}</div>
          <div className="summary-card-breakdown">
            <span>SID {formatCurrency(expenseTotals.sidInvestment)}</span>
            <span>VISH {formatCurrency(expenseTotals.vishInvestment)}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Profit / Loss</div>
          <div className={`summary-card-value ${split.isProfit ? 'positive' : 'negative'}`}>
            {formatCurrency(split.profit)}
          </div>
          <div className="summary-card-breakdown">
            <span>SID share {formatCurrency(split.sidShare)}</span>
            <span>VISH share {formatCurrency(split.vishShare)}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Highest Expense</div>
          <div className="summary-card-value">{highestCategory.label}</div>
          <div className="summary-card-breakdown">
            <span>{formatCurrency(highestCategory.amount)}</span>
            <span>{highestCategory.percent}% of total</span>
          </div>
        </div>

        <div className="summary-card settlement-card">
          <div className="summary-card-label">Settlement</div>
          <div className="settlement-text">SID final: {formatCurrency(split.sidFinal)}</div>
          <div className="settlement-text">VISH final: {formatCurrency(split.vishFinal)}</div>
          <div className="settlement-highlight">{split.settlement.message}</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">AI Insights</div>
          <button className="btn" onClick={handleAnalyzeTournament} disabled={analysisLoading}>
            <Sparkles size={16} style={{ marginRight: 8 }} />
            {analysisLoading ? 'Analyzing...' : 'Analyze Tournament'}
          </button>
          {aiAnalysis && <div className="ai-analysis-box">{aiAnalysis}</div>}
        </div>
      </div>

      <div className="card summary-action-card">
        <div className="card-header">
          <h3 className="card-title">Bill Actions</h3>
          <Printer size={18} />
        </div>
        <p className="section-note">Whenever Print Bill is clicked, the current summary is saved into past history automatically.</p>
        <div className="summary-actions">
          <button className="btn btn-secondary" onClick={() => setShowBillModal(true)}>
            Preview Bill
          </button>
        </div>
      </div>

      {renderSummaryHistory()}
    </div>
  );

  const renderBill = () => {
    if (!currentTournament) return null;

    const visibleCategories = categoryEntries.filter((entry) => entry.amount > 0);

    return (
      <div className="bill">
        <div className="bill-header">
          <h2 className="bill-title">Tournament Bill</h2>
          <div className="bill-subtitle">Generated for {currentProfileMeta?.name}</div>
        </div>

        <div className="bill-meta-grid">
          <div className="bill-chip"><strong>Tournament</strong><span>{currentTournament.name}</span></div>
          <div className="bill-chip"><strong>Club</strong><span>{currentTournament.club}</span></div>
          <div className="bill-chip"><strong>Date</strong><span>{formatDate(currentTournament.date)}</span></div>
          <div className="bill-chip"><strong>Workspace</strong><span>{currentProfileMeta?.name}</span></div>
        </div>

        <div className="bill-section">
          <div className="bill-section-title">Financial Summary</div>
          <div className="bill-table">
            <div className="bill-row">
              <span className="bill-row-label">Total Income</span>
              <span className="bill-row-value" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(collectionTotals.totalIncome)}</span>
            </div>
            <div className="bill-row">
              <span className="bill-row-label">Total Refunds</span>
              <span className="bill-row-value" style={{ color: 'var(--danger)' }}>{formatCurrency(collectionTotals.totalRefunds)}</span>
            </div>
            <div className="bill-row">
              <span className="bill-row-label">Net Collection</span>
              <span className="bill-row-value">{formatCurrency(collectionTotals.netCollection)}</span>
            </div>
            <div className="bill-row">
              <span className="bill-row-label">Total Expenses</span>
              <span className="bill-row-value" style={{ color: 'var(--danger)' }}>{formatCurrency(expenseTotals.totalExpenses)}</span>
            </div>
            <div className="bill-row">
              <span className="bill-row-label">Profit / Loss</span>
              <span className="bill-row-value" style={{ color: split.isProfit ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency(split.profit)}
              </span>
            </div>
          </div>
        </div>

        <div className="bill-section">
          <div className="bill-section-title">Expense Breakdown</div>
          {visibleCategories.length === 0 ? (
            <div className="section-note">No expenses added yet.</div>
          ) : (
            <div className="bill-list">
              {visibleCategories.map((entry) => (
                <div key={entry.key} className="bill-list-item">
                  <span>{entry.label}</span>
                  <strong>{formatCurrency(entry.amount)} • {entry.percent}%</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bill-section">
          <div className="bill-section-title">Settlement</div>
          <div className="bill-table">
            <div className="bill-row">
              <span className="bill-row-label">SID Investment</span>
              <span className="bill-row-value">{formatCurrency(expenseTotals.sidInvestment)}</span>
            </div>
            <div className="bill-row">
              <span className="bill-row-label">VISH Investment</span>
              <span className="bill-row-value">{formatCurrency(expenseTotals.vishInvestment)}</span>
            </div>
            <div className="bill-row">
              <span className="bill-row-label">SID Final</span>
              <span className="bill-row-value">{formatCurrency(split.sidFinal)}</span>
            </div>
            <div className="bill-row">
              <span className="bill-row-label">VISH Final</span>
              <span className="bill-row-value">{formatCurrency(split.vishFinal)}</span>
            </div>
          </div>
          <div className="bill-settlement">
            <div className="bill-settlement-label">Final Settlement</div>
            <div className="bill-settlement-value">{split.settlement.message}</div>
          </div>
        </div>
      </div>
    );
  };

  if (!currentProfile) {
    return (
      <div className="app">
        {renderLoginScreen()}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            {currentTournament?.club ? (
              <img
                src={getClubLogo(currentTournament.club)}
                alt={currentTournament.club}
                style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain' }}
              />
            ) : (
              <span className="shuttle-icon">🏸</span>
            )}
            <div>
              <h1>Baddy Cal</h1>
              <div className="workspace-pill">{currentProfileMeta?.name}</div>
            </div>
          </div>

          <div className="header-actions">
            {tournaments.length > 0 && (
              <select className="tournament-select" value={currentTournament?.id || ''} onChange={handleSelectTournament}>
                <option value="" disabled>Select Tournament</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                ))}
              </select>
            )}

            <button className="btn-new" onClick={() => setShowNewTournamentModal(true)}>
              <Plus size={18} />
              New
            </button>

            <button className="btn-ghost" onClick={handleLogout} title="Switch login">
              <LogOut size={18} />
              Switch
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {!currentTournament && tournaments.length === 0 ? (
          renderEmptyState()
        ) : !currentTournament ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3 className="empty-state-title">Select a Tournament</h3>
            <p className="empty-state-text">Choose a tournament from the dropdown above or create a new one.</p>
            <button className="btn" onClick={() => setShowNewTournamentModal(true)}>
              <Plus size={18} style={{ marginRight: 8 }} />
              Create Tournament
            </button>
          </div>
        ) : (
          <>
            {activeTab === TABS.SETUP && renderSetup()}
            {activeTab === TABS.EXPENSES && renderExpenses()}
            {activeTab === TABS.COLLECTIONS && renderCollections()}
            {activeTab === TABS.SUMMARY && renderSummary()}
          </>
        )}
      </main>

      <nav className="tab-nav">
        <div className="tab-nav-content">
          <button className={`tab-btn ${activeTab === TABS.SETUP ? 'active' : ''}`} onClick={() => setActiveTab(TABS.SETUP)}>
            <Settings />
            Setup
          </button>
          <button className={`tab-btn ${activeTab === TABS.EXPENSES ? 'active' : ''}`} onClick={() => setActiveTab(TABS.EXPENSES)}>
            <Receipt />
            Expenses
          </button>
          <button className={`tab-btn ${activeTab === TABS.COLLECTIONS ? 'active' : ''}`} onClick={() => setActiveTab(TABS.COLLECTIONS)}>
            <Wallet />
            Collections
          </button>
          <button className={`tab-btn ${activeTab === TABS.SUMMARY ? 'active' : ''}`} onClick={() => setActiveTab(TABS.SUMMARY)}>
            <FileText />
            Summary
          </button>
        </div>
      </nav>

      {showNewTournamentModal && (
        <div className="modal-overlay" onClick={() => setShowNewTournamentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Tournament</h3>
              <button className="modal-close" onClick={() => setShowNewTournamentModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateTournament}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tournament Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Krida Velocity Cup"
                    value={tournamentForm.name}
                    onChange={(e) => setTournamentForm({ ...tournamentForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Club</label>
                  <div className="pill-group">
                    {CLUBS.map((club) => (
                      <button
                        key={club}
                        type="button"
                        className={`pill-btn ${tournamentForm.club === club ? 'active' : ''}`}
                        onClick={() => setTournamentForm({ ...tournamentForm, club })}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <img
                          src={getClubLogo(club)}
                          alt={club}
                          style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'contain' }}
                        />
                        {club}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={tournamentForm.date}
                    onChange={(e) => setTournamentForm({ ...tournamentForm, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewTournamentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBillModal && (
        <div className="modal-overlay" onClick={() => setShowBillModal(false)}>
          <div className="modal bill-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tournament Bill</h3>
              <button className="modal-close" onClick={() => setShowBillModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div ref={billContentRef}>{renderBill()}</div>
            </div>
            <div className="modal-footer modal-footer-wrap">
              <button className="btn btn-secondary" onClick={() => setShowBillModal(false)}>
                Close
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadPdf}>
                Download PDF
              </button>
              <button className="btn" onClick={handlePrintBill}>
                <Printer size={18} style={{ marginRight: 8 }} />
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuickExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowQuickExpenseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">Add {expenseForm.category}</h3>
              <button className="modal-close" onClick={() => setShowQuickExpenseModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleQuickAddExpense}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <div className="amount-input-wrapper">
                    <input
                      type="number"
                      className="form-input amount-input"
                      placeholder="0"
                      value={expenseForm.amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Paid By</label>
                  <div className="pill-group">
                    {['SID', 'VISH', 'SPLIT'].map((payer) => (
                      <button
                        key={payer}
                        type="button"
                        className={`pill-btn ${expenseForm.paidBy === payer ? 'active' : ''}`}
                        onClick={() => handlePayerChange(payer)}
                      >
                        {payer}
                      </button>
                    ))}
                  </div>
                </div>

                {expenseForm.paidBy === 'SPLIT' && (
                  <div className="split-grid">
                    <div className="form-group">
                      <label className="form-label">SID Amount</label>
                      <div className="amount-input-wrapper">
                        <input
                          type="number"
                          className="form-input amount-input"
                          value={expenseForm.splitSidAmount}
                          onChange={(e) => setExpenseForm((prev) => ({ ...prev, splitSidAmount: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">VISH Amount</label>
                      <div className="amount-input-wrapper">
                        <input
                          type="number"
                          className="form-input amount-input"
                          value={expenseForm.splitVishAmount}
                          onChange={(e) => setExpenseForm((prev) => ({ ...prev, splitVishAmount: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Note / Criteria (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Optional note, criteria, or reference"
                    value={expenseForm.note}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, note: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuickExpenseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedHistoryEntry && (
        <div className="modal-overlay" onClick={() => setSelectedHistoryEntry(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 className="modal-title">Printed Snapshot</h3>
              <button className="modal-close" onClick={() => setSelectedHistoryEntry(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="history-modal-grid">
                <div className="history-modal-item"><span>Tournament</span><strong>{selectedHistoryEntry.tournamentName || currentTournament?.name}</strong></div>
                <div className="history-modal-item"><span>Printed At</span><strong>{formatDateTime(selectedHistoryEntry.createdAt)}</strong></div>
                <div className="history-modal-item"><span>Printed By</span><strong>{selectedHistoryEntry.printedBy}</strong></div>
                <div className="history-modal-item"><span>Action</span><strong>{selectedHistoryEntry.action || 'PRINT'}</strong></div>
                <div className="history-modal-item"><span>Total Income</span><strong>{formatCurrency(selectedHistoryEntry.totalIncome)}</strong></div>
                <div className="history-modal-item"><span>Total Refunds</span><strong>{formatCurrency(selectedHistoryEntry.totalRefunds)}</strong></div>
                <div className="history-modal-item"><span>Net Collection</span><strong>{formatCurrency(selectedHistoryEntry.totalCollection)}</strong></div>
                <div className="history-modal-item"><span>Total Expenses</span><strong>{formatCurrency(selectedHistoryEntry.totalExpenses)}</strong></div>
                <div className="history-modal-item"><span>Profit / Loss</span><strong>{formatCurrency(selectedHistoryEntry.profit)}</strong></div>
                <div className="history-modal-item"><span>Highest Expense</span><strong>{selectedHistoryEntry.highestCategory || '—'}</strong></div>
                <div className="history-modal-item"><span>SID Investment</span><strong>{formatCurrency(selectedHistoryEntry.sidInvestment)}</strong></div>
                <div className="history-modal-item"><span>VISH Investment</span><strong>{formatCurrency(selectedHistoryEntry.vishInvestment)}</strong></div>
              </div>
              <div className="history-inline">{selectedHistoryEntry.settlementMessage}</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedHistoryEntry(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      {currentTournament && <AIChat currentTournament={currentTournament} financialContext={aiContext} />}
    </div>
  );
}

export default App;
