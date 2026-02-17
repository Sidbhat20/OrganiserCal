import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Settings, 
  Receipt, 
  Wallet, 
  FileText, 
  Plus, 
  X, 
  Trash2,
  Printer
} from 'lucide-react';
import * as storage from './utils/storage';
import { 
  formatCurrency, 
  formatDate, 
  calculateExpenseTotals, 
  calculateCollectionTotals, 
  calculateProfitAndSplit,
  getCategoryIcon,
  getSourceIcon
} from './utils/helpers';

// Tab names
const TABS = {
  SETUP: 'setup',
  EXPENSES: 'expenses',
  COLLECTIONS: 'collections',
  SUMMARY: 'summary'
};

// Categories and sources
const EXPENSE_CATEGORIES = [
  'Court', 'Referee', 'Shuttle', 'Food', 'Trophy', 'Medal', 'Certificate', 'Bhaiya', 'Other'
];

const COLLECTION_SOURCES = ['PlayMatches', 'UPI', 'Cash'];

const CLUBS = ['Velocity', 'Breathe'];

// Get club logo path
const getClubLogo = (club) => {
  if (club === 'Velocity') return '/velocity logo.jpg';
  if (club === 'Breathe') return '/breathe logo.jpg';
  return null;
};

function App() {
  // State
  const [tournaments, setTournaments] = useState([]);
  const [currentTournament, setCurrentTournament] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.SETUP);
  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  
  // Form states
  const [tournamentForm, setTournamentForm] = useState({ name: '', club: 'Velocity', date: '' });
  const [expenseForm, setExpenseForm] = useState({ category: 'Court', amount: '', paidBy: 'Sid' });
  const [collectionForm, setCollectionForm] = useState({ source: 'PlayMatches', amount: '', isRefund: false });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(() => {
    const allTournaments = storage.getAllTournaments();
    setTournaments(allTournaments);
    const current = storage.getCurrentTournament();
    setCurrentTournament(current);
  }, []);

  // Tournament handlers
  const handleCreateTournament = useCallback((e) => {
    e.preventDefault();
    if (!tournamentForm.name || !tournamentForm.date) return;
    
    storage.createTournament(tournamentForm.name, tournamentForm.club, tournamentForm.date);
    loadData();
    setShowNewTournamentModal(false);
    setTournamentForm({ name: '', club: 'Velocity', date: '' });
    setActiveTab(TABS.EXPENSES);
  }, [tournamentForm, loadData]);

  const handleSelectTournament = useCallback((e) => {
    const id = e.target.value;
    storage.setCurrentTournament(id);
    loadData();
  }, [loadData]);

  const handleDeleteTournament = useCallback((id) => {
    if (window.confirm('Are you sure you want to delete this tournament?')) {
      storage.deleteTournament(id);
      loadData();
    }
  }, [loadData]);

  const handleUpdateTournament = useCallback((field, value) => {
    if (currentTournament) {
      storage.updateTournament(currentTournament.id, { [field]: value });
      loadData();
    }
  }, [currentTournament, loadData]);

  // Expense handlers
  const handleAddExpense = useCallback((e) => {
    e.preventDefault();
    if (!expenseForm.amount || !currentTournament) return;
    
    storage.addExpense(currentTournament.id, {
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount),
      paidBy: expenseForm.paidBy
    });
    loadData();
    setExpenseForm({ category: expenseForm.category, amount: '', paidBy: expenseForm.paidBy });
  }, [expenseForm, currentTournament, loadData]);

  const handleDeleteExpense = useCallback((expenseId) => {
    if (!currentTournament) return;
    storage.deleteExpense(currentTournament.id, expenseId);
    loadData();
  }, [currentTournament, loadData]);

  // Collection handlers
  const handleAddCollection = useCallback((e) => {
    e.preventDefault();
    if (!collectionForm.amount || !currentTournament) return;
    
    storage.addCollection(currentTournament.id, {
      source: collectionForm.source,
      amount: parseFloat(collectionForm.amount),
      isRefund: collectionForm.isRefund
    });
    loadData();
    setCollectionForm({ source: 'PlayMatches', amount: '', isRefund: false });
  }, [collectionForm, currentTournament, loadData]);

  const handleDeleteCollection = useCallback((collectionId) => {
    if (!currentTournament) return;
    storage.deleteCollection(currentTournament.id, collectionId);
    loadData();
  }, [currentTournament, loadData]);

  // Memoized calculations
  const expenseTotals = useMemo(() => {
    return currentTournament ? calculateExpenseTotals(currentTournament.expenses) : { totalExpenses: 0 };
  }, [currentTournament?.expenses]);

  const collectionTotals = useMemo(() => {
    return currentTournament ? calculateCollectionTotals(currentTournament.collections) : { totalIncome: 0, totalRefunds: 0, netCollection: 0 };
  }, [currentTournament?.collections]);

  const profitData = useMemo(() => {
    return calculateProfitAndSplit(
      collectionTotals.totalIncome, 
      collectionTotals.totalRefunds, 
      expenseTotals.totalExpenses
    );
  }, [collectionTotals, expenseTotals]);

  // Render functions
  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">🏸</div>
      <h3 className="empty-state-title">No Tournament Yet</h3>
      <p className="empty-state-text">Create your first tournament to start tracking expenses and collections</p>
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
            {CLUBS.map(club => (
              <button
                key={club}
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
            Permanently delete this tournament and all its data.
          </p>
          <button 
            className="btn btn-danger"
            onClick={() => handleDeleteTournament(currentTournament.id)}
          >
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
        <h3 className="card-title" style={{ marginBottom: 16 }}>Add Expense</h3>
        <form onSubmit={handleAddExpense}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select 
              className="form-input"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Amount</label>
            <div className="amount-input-wrapper">
              <input
                type="number"
                className="form-input amount-input"
                placeholder="0"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Paid By</label>
            <div className="pill-group">
              {['Sid', 'Vish', 'Both'].map(payer => (
                <button
                  key={payer}
                  type="button"
                  className={`pill-btn ${expenseForm.paidBy === payer ? (payer === 'Sid' ? 'active' : payer === 'Vish' ? 'active-secondary' : 'active') : ''}`}
                  onClick={() => setExpenseForm({ ...expenseForm, paidBy: payer })}
                >
                  {payer}
                </button>
              ))}
            </div>
          </div>
          
          <button type="submit" className="btn">Add Expense</button>
        </form>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Expenses</h3>
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
            {formatCurrency(expenseTotals.totalExpenses)}
          </span>
        </div>
        
        {(!currentTournament?.expenses || currentTournament.expenses.length === 0) ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No expenses yet</p>
        ) : (
          currentTournament.expenses.map(expense => (
            <div key={expense.id} className="list-item">
              <div className="list-item-info">
                <div className="list-item-icon">{getCategoryIcon(expense.category)}</div>
                <div className="list-item-details">
                  <div className="list-item-title">{expense.category}</div>
                  <span className={`badge badge-${expense.paidBy?.toLowerCase()}`}>{expense.paidBy}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
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
              {COLLECTION_SOURCES.map(source => (
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
          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
            {formatCurrency(collectionTotals.netCollection)}
          </span>
        </div>
        
        {(!currentTournament?.collections || currentTournament.collections.length === 0) ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No collections yet</p>
        ) : (
          currentTournament.collections.map(collection => (
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
              <div style={{ display: 'flex', alignItems: 'center' }}>
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

  const renderSummary = () => (
    <div>
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-label">Total Collection</div>
          <div className="summary-card-value positive">{formatCurrency(collectionTotals.totalIncome)}</div>
        </div>
        
        <div className="summary-card">
          <div className="summary-card-label">Total Refunds</div>
          <div className="summary-card-value negative">{formatCurrency(collectionTotals.totalRefunds)}</div>
        </div>
        
        <div className="summary-card">
          <div className="summary-card-label">Net Collection</div>
          <div className="summary-card-value positive">{formatCurrency(collectionTotals.netCollection)}</div>
        </div>
        
        <div className="summary-card">
          <div className="summary-card-label">Total Expenses</div>
          <div className="summary-card-value negative">{formatCurrency(expenseTotals.totalExpenses)}</div>
        </div>
        
        <div className="summary-card">
          <div className="summary-card-label">Profit / Loss</div>
          <div className={`summary-card-value ${profitData.isProfit ? 'positive' : 'negative'}`}>
            {profitData.isProfit ? '+' : ''}{formatCurrency(profitData.profit)}
          </div>
        </div>
        
        <div className="summary-card settlement-card">
          <div className="summary-card-label">Each Person's Share</div>
          <div className="settlement-text">Sid gets</div>
          <div className="settlement-amount">{formatCurrency(profitData.eachShare)}</div>
          <div className="settlement-text" style={{ marginTop: 8 }}>Vish gets</div>
          <div className="settlement-amount">{formatCurrency(profitData.eachShare)}</div>
        </div>
      </div>
      
      <button className="btn mt-4" onClick={() => setShowBillModal(true)}>
        <Printer size={18} style={{ marginRight: 8 }} />
        Generate Bill
      </button>
    </div>
  );

  const renderBill = () => {
    if (!currentTournament) return null;
    
    const incomeCollections = currentTournament.collections?.filter(c => !c.isRefund) || [];
    const refundCollections = currentTournament.collections?.filter(c => c.isRefund) || [];
    
    return (
      <div className="bill">
        <div className="bill-header">
          {currentTournament?.club && (
            <img 
              src={getClubLogo(currentTournament.club)} 
              alt={currentTournament.club}
              style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', marginBottom: 12 }}
            />
          )}
          <h2 className="bill-title">{currentTournament.name}</h2>
          <p className="bill-subtitle">
            {currentTournament.club} Badminton • {formatDate(currentTournament.date)}
          </p>
        </div>
        
        <div className="bill-section">
          <h4 className="bill-section-title">Expenses</h4>
          <div className="bill-table">
            {currentTournament.expenses.length === 0 ? (
              <div className="bill-row">
                <span className="bill-row-label">No expenses</span>
              </div>
            ) : (
              currentTournament.expenses.map(expense => (
                <div key={expense.id} className="bill-row">
                  <span className="bill-row-label">{expense.category} ({expense.paidBy})</span>
                  <span className="bill-row-value" style={{ color: 'var(--danger)' }}>-{formatCurrency(expense.amount)}</span>
                </div>
              ))
            )}
            <div className="bill-total">
              <span>Total Expenses</span>
              <span style={{ color: 'var(--danger)' }}>-{formatCurrency(expenseTotals.totalExpenses)}</span>
            </div>
          </div>
        </div>
        
        <div className="bill-section">
          <h4 className="bill-section-title">Collections</h4>
          <div className="bill-table">
            {incomeCollections.length === 0 ? (
              <div className="bill-row">
                <span className="bill-row-label">No income</span>
              </div>
            ) : (
              incomeCollections.map(collection => (
                <div key={collection.id} className="bill-row">
                  <span className="bill-row-label">{collection.source}</span>
                  <span className="bill-row-value" style={{ color: 'var(--accent-primary)' }}>+{formatCurrency(collection.amount)}</span>
                </div>
              ))
            )}
            <div className="bill-total">
              <span>Total Income</span>
              <span style={{ color: 'var(--accent-primary)' }}>+{formatCurrency(collectionTotals.totalIncome)}</span>
            </div>
          </div>
        </div>

        {refundCollections.length > 0 && (
          <div className="bill-section">
            <h4 className="bill-section-title">Refunds</h4>
            <div className="bill-table">
              {refundCollections.map(collection => (
                <div key={collection.id} className="bill-row">
                  <span className="bill-row-label">{collection.source}</span>
                  <span className="bill-row-value" style={{ color: 'var(--danger)' }}>-{formatCurrency(collection.amount)}</span>
                </div>
              ))}
              <div className="bill-total">
                <span>Total Refunds</span>
                <span style={{ color: 'var(--danger)' }}>-{formatCurrency(collectionTotals.totalRefunds)}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="bill-section">
          <div className="bill-total">
            <span>Net Collection</span>
            <span>{formatCurrency(collectionTotals.netCollection)}</span>
          </div>
        </div>
        
        <div className="bill-section">
          <div className="bill-total">
            <span>Profit</span>
            <span style={{ color: profitData.isProfit ? 'var(--accent-primary)' : 'var(--danger)' }}>
              {profitData.isProfit ? '+' : ''}{formatCurrency(profitData.profit)}
            </span>
          </div>
        </div>
        
        <div className="bill-settlement">
          <div className="bill-settlement-label">Each Person's Share</div>
          <div className="bill-settlement-value">
            Sid: {formatCurrency(profitData.eachShare)} | Vish: {formatCurrency(profitData.eachShare)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            {currentTournament?.club && (
              <img 
                src={getClubLogo(currentTournament.club)} 
                alt={currentTournament.club}
                style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain' }}
              />
            )}
            {!currentTournament?.club && <span className="shuttle-icon">🏸</span>}
            <h1>Badminton Expense</h1>
          </div>
          
          {tournaments.length > 0 && (
            <select 
              className="tournament-select"
              value={currentTournament?.id || ''}
              onChange={handleSelectTournament}
            >
              <option value="" disabled>Select Tournament</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          
          <button className="btn-new" onClick={() => setShowNewTournamentModal(true)}>
            <Plus size={18} />
            New
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {!currentTournament && tournaments.length === 0 ? (
          renderEmptyState()
        ) : !currentTournament ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3 className="empty-state-title">Select a Tournament</h3>
            <p className="empty-state-text">Choose a tournament from the dropdown above or create a new one</p>
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

      {/* Tab Navigation */}
      <nav className="tab-nav">
        <div className="tab-nav-content">
          <button 
            className={`tab-btn ${activeTab === TABS.SETUP ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.SETUP)}
          >
            <Settings />
            Setup
          </button>
          <button 
            className={`tab-btn ${activeTab === TABS.EXPENSES ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.EXPENSES)}
          >
            <Receipt />
            Expenses
          </button>
          <button 
            className={`tab-btn ${activeTab === TABS.COLLECTIONS ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.COLLECTIONS)}
          >
            <Wallet />
            Collections
          </button>
          <button 
            className={`tab-btn ${activeTab === TABS.SUMMARY ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.SUMMARY)}
          >
            <FileText />
            Summary
          </button>
        </div>
      </nav>

      {/* New Tournament Modal */}
      {showNewTournamentModal && (
        <div className="modal-overlay" onClick={() => setShowNewTournamentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
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
                    {CLUBS.map(club => (
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
                <button type="submit" className="btn">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {showBillModal && (
        <div className="modal-overlay" onClick={() => setShowBillModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Tournament Bill</h3>
              <button className="modal-close" onClick={() => setShowBillModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {renderBill()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBillModal(false)}>
                Close
              </button>
              <button className="btn" onClick={() => window.print()}>
                <Printer size={18} style={{ marginRight: 8 }} />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
