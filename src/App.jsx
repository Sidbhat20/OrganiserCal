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
  Sparkles
} from 'lucide-react';
import * as storage from './utils/storage';
import AIChat from './AIChat';
import { 
  formatCurrency, 
  formatDate, 
  buildTournamentFinancialSnapshot,
  getCategoryIcon,
  getSourceIcon
} from './utils/helpers';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')
).replace(/\/$/, '');

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
  const basePath = import.meta.env.BASE_URL;
  if (club === 'Velocity') return `${basePath}velocity logo.jpg`;
  if (club === 'Breathe') return `${basePath}breathe logo.jpg`;
  return null;
};

function App() {
  console.log('App component mounted');
  // State
  const [tournaments, setTournaments] = useState([]);
  const [currentTournament, setCurrentTournament] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.SETUP);
  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  
  // Form states
  const [tournamentForm, setTournamentForm] = useState({ name: '', club: 'Velocity', date: '' });
  const [expenseForm, setExpenseForm] = useState({
    category: 'Court',
    amount: '',
    paidBy: 'SID',
    splitSidPercent: 50,
    note: ''
  });
  const [collectionForm, setCollectionForm] = useState({ source: 'PlayMatches', amount: '', isRefund: false });
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const billContentRef = useRef(null);

  const loadData = useCallback(() => {
    const allTournaments = storage.getAllTournaments();
    setTournaments(allTournaments);
    const current = storage.getCurrentTournament();
    setCurrentTournament(current);
  }, []);

  // Load data on mount
  useEffect(() => {
    const bootstrap = async () => {
      await storage.initSupabaseSync();
      loadData();
    };

    bootstrap();
  }, [loadData]);

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

    const amount = Number(expenseForm.amount);
    if (!amount || amount <= 0) return;

    const note = expenseForm.note?.trim() || undefined;

    if (expenseForm.paidBy === 'SPLIT') {
      const sidPercent = Number(expenseForm.splitSidPercent) || 50;
      const sidAmount = Number((amount * sidPercent / 100).toFixed(2));
      const vishAmount = Number((amount - sidAmount).toFixed(2));

      storage.addExpense(currentTournament.id, {
        category: expenseForm.category,
        amount: sidAmount,
        paidBy: 'SID',
        note: note ? `${note} (Split ${sidPercent}% / ${100 - sidPercent}%)` : `Split ${sidPercent}% / ${100 - sidPercent}%`
      });

      storage.addExpense(currentTournament.id, {
        category: expenseForm.category,
        amount: vishAmount,
        paidBy: 'VISH',
        note: note ? `${note} (Split ${sidPercent}% / ${100 - sidPercent}%)` : `Split ${sidPercent}% / ${100 - sidPercent}%`
      });
    } else {
      storage.addExpense(currentTournament.id, {
        category: expenseForm.category,
        amount,
        paidBy: expenseForm.paidBy,
        note
      });
    }

    loadData();
    setExpenseForm((prev) => ({ ...prev, amount: '', note: '' }));
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

  const financialSnapshot = useMemo(() => buildTournamentFinancialSnapshot(currentTournament), [currentTournament]);
  const { expenseTotals, collectionTotals, split, categoryEntries, highestCategory, aiContext } = financialSnapshot;

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
              content: 'Analyze tournament and provide: 1) overspending areas, 2) highest expense category, 3) profit margin analysis, 4) top 3 improvement suggestions with numbers.'
            }
          ]
        })
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
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(billContentRef.current)
      .save();
  }, [currentTournament]);

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
              {['SID', 'VISH', 'SPLIT'].map(payer => (
                <button
                  key={payer}
                  type="button"
                  className={`pill-btn ${expenseForm.paidBy === payer ? (payer === 'VISH' ? 'active-secondary' : 'active') : ''}`}
                  onClick={() => setExpenseForm({ ...expenseForm, paidBy: payer })}
                >
                  {payer}
                </button>
              ))}
            </div>
          </div>

          {expenseForm.paidBy === 'SPLIT' && (
            <div className="form-group">
              <label className="form-label">SID Split %</label>
              <input
                type="number"
                min="0"
                max="100"
                className="form-input"
                value={expenseForm.splitSidPercent}
                onChange={(e) => setExpenseForm({ ...expenseForm, splitSidPercent: e.target.value })}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
                VISH gets {Math.max(0, 100 - (Number(expenseForm.splitSidPercent) || 0))}%
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Shuttle box for finals"
              value={expenseForm.note}
              onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
            />
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
                  <span className={`badge badge-${String(expense.paidBy || '').toLowerCase()}`}>{expense.paidBy}</span>
                  {expense.note && <div className="list-item-subtitle">{expense.note}</div>}
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
          <div className={`summary-card-value ${split.isProfit ? 'positive' : 'negative'}`}>
            {split.isProfit ? '+' : ''}{formatCurrency(split.profit)}
          </div>
        </div>

        <div className="summary-card settlement-card">
          <div className="summary-card-label">Final Settlement</div>
          <div className="settlement-text">SID invested: {formatCurrency(expenseTotals.sidInvestment)}</div>
          <div className="settlement-text">VISH invested: {formatCurrency(expenseTotals.vishInvestment)}</div>
          <div className="settlement-text" style={{ marginTop: 8 }}>Total Profit: {formatCurrency(split.profit)}</div>
          <div className="settlement-text" style={{ marginTop: 8 }}>SID should receive: {formatCurrency(split.sidFinal)}</div>
          <div className="settlement-text">VISH should receive: {formatCurrency(split.vishFinal)}</div>
          <div className="settlement-highlight">{split.settlement.message}</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Category Analytics</div>
          <div className="category-pie" style={{
            background: `conic-gradient(
              #FFC107 0deg ${Math.round((categoryEntries[0]?.percent || 0) * 3.6)}deg,
              #28A745 ${Math.round((categoryEntries[0]?.percent || 0) * 3.6)}deg ${Math.round(((categoryEntries[0]?.percent || 0) + (categoryEntries[1]?.percent || 0)) * 3.6)}deg,
              #17A2B8 ${Math.round(((categoryEntries[0]?.percent || 0) + (categoryEntries[1]?.percent || 0)) * 3.6)}deg ${Math.round(((categoryEntries[0]?.percent || 0) + (categoryEntries[1]?.percent || 0) + (categoryEntries[2]?.percent || 0)) * 3.6)}deg,
              #DC3545 ${Math.round(((categoryEntries[0]?.percent || 0) + (categoryEntries[1]?.percent || 0) + (categoryEntries[2]?.percent || 0)) * 3.6)}deg ${Math.round(((categoryEntries[0]?.percent || 0) + (categoryEntries[1]?.percent || 0) + (categoryEntries[2]?.percent || 0) + (categoryEntries[3]?.percent || 0)) * 3.6)}deg,
              #666666 ${Math.round(((categoryEntries[0]?.percent || 0) + (categoryEntries[1]?.percent || 0) + (categoryEntries[2]?.percent || 0) + (categoryEntries[3]?.percent || 0)) * 3.6)}deg 360deg
            )`
          }} />
          <p className="settlement-text" style={{ marginTop: 12 }}>
            Highest: {highestCategory.label} ({formatCurrency(highestCategory.amount)} • {highestCategory.percent}%)
          </p>
          <div className="summary-card-breakdown">
            {categoryEntries.filter(item => item.amount > 0).slice(0, 5).map(item => (
              <span key={item.key}>{item.label}: {item.percent}%</span>
            ))}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">AI Insights</div>
          <button className="btn" onClick={handleAnalyzeTournament} disabled={analysisLoading}>
            <Sparkles size={16} style={{ marginRight: 8 }} />
            {analysisLoading ? 'Analyzing...' : 'Analyze Tournament'}
          </button>
          {aiAnalysis && (
            <div className="ai-analysis-box">
              {aiAnalysis}
            </div>
          )}
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
            <span style={{ color: split.isProfit ? 'var(--accent-primary)' : 'var(--danger)' }}>
              {split.isProfit ? '+' : ''}{formatCurrency(split.profit)}
            </span>
          </div>
        </div>
        
        <div className="bill-settlement">
          <div className="bill-settlement-label">Final Settlement</div>
          <div className="bill-settlement-value">
            SID receives: {formatCurrency(split.sidFinal)} | VISH receives: {formatCurrency(split.vishFinal)}
          </div>
          <div className="bill-settlement-label" style={{ marginTop: 8 }}>{split.settlement.message}</div>
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
            <h1>Baddy Cal</h1>
          </div>

          <div className="header-actions">
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
              <div ref={billContentRef}>{renderBill()}</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBillModal(false)}>
                Close
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadPdf}>
                Download PDF
              </button>
              <button className="btn" onClick={() => window.print()}>
                <Printer size={18} style={{ marginRight: 8 }} />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Widget */}
      <AIChat currentTournament={currentTournament} financialContext={aiContext} />
    </div>
  );
}

export default App;
