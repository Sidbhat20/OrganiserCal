// Format number as Indian Rupees
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

const roundTo2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const CATEGORY_KEYS = {
  Court: 'court',
  Shuttle: 'shuttle',
  Referee: 'referee',
  Food: 'food',
};

// Format date for display
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Calculate expense totals with payer and category analytics.
export const calculateExpenseTotals = (expenses = []) => {
  const totals = {
    totalExpenses: 0,
    categoryBreakdown: {
      court: 0,
      shuttle: 0,
      referee: 0,
      food: 0,
      others: 0,
    },
  };

  expenses.forEach((expense) => {
    const amount = roundTo2(expense.amount);
    if (amount <= 0) return;

    const categoryKey = CATEGORY_KEYS[expense.category] || 'others';

    totals.totalExpenses += amount;
    totals.categoryBreakdown[categoryKey] += amount;
  });

  totals.totalExpenses = roundTo2(totals.totalExpenses);

  Object.keys(totals.categoryBreakdown).forEach((key) => {
    totals.categoryBreakdown[key] = roundTo2(totals.categoryBreakdown[key]);
  });

  return totals;
};

// Calculate collection totals - now separated from refunds
export const calculateCollectionTotals = (collections = []) => {
  let totalIncome = 0;
  let totalRefunds = 0;
  
  collections.forEach(collection => {
    const amount = Number(collection.amount) || 0;
    if (collection.isRefund) {
      totalRefunds += amount;
    } else {
      totalIncome += amount;
    }
  });
  
  const netCollection = totalIncome - totalRefunds;
  return { totalIncome, totalRefunds, netCollection };
};

export const calculateProfitAndSplit = ({
  totalCollection,
  totalExpenses,
  sidInvestment,
}) => {
  const collection = roundTo2(totalCollection);
  const expenses = roundTo2(totalExpenses);
  const sidInvest = roundTo2(sidInvestment);

  const profit = roundTo2(collection - expenses);
  const profitShareEach = roundTo2(profit / 2);

  const sidFinal = roundTo2(sidInvest + profitShareEach);
  const vishFinal = roundTo2(profitShareEach);
  const amountVishweshPaysSiddharth = sidFinal;

  const settlement = {
    from: 'VISH',
    to: 'SID',
    amount: amountVishweshPaysSiddharth,
    message: `Vishwesh should pay Siddharth ${formatCurrency(amountVishweshPaysSiddharth)}`,
  };

  return {
    profit,
    isProfit: profit >= 0,
    profitShareEach,
    sidFinal,
    vishFinal,
    amountVishweshPaysSiddharth,
    settlement,
  };
};

export const buildTournamentFinancialSnapshot = (tournament) => {
  const safeTournament = tournament || {
    name: '',
    date: '',
    club: 'Velocity',
    expenses: [],
    collections: [],
  };

  const expenseTotals = calculateExpenseTotals(safeTournament.expenses || []);
  const collectionTotals = calculateCollectionTotals(safeTournament.collections || []);
  const sidInvestment = roundTo2(safeTournament.sidInvestment || 0);

  const split = calculateProfitAndSplit({
    totalCollection: collectionTotals.netCollection,
    totalExpenses: expenseTotals.totalExpenses,
    sidInvestment,
  });

  const categoryEntries = Object.entries(expenseTotals.categoryBreakdown)
    .map(([key, amount]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      amount,
      percent: expenseTotals.totalExpenses > 0
        ? roundTo2((amount / expenseTotals.totalExpenses) * 100)
        : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const highestCategory = categoryEntries[0] || { key: 'others', label: 'Others', amount: 0, percent: 0 };

  return {
    tournament: {
      name: safeTournament.name,
      date: safeTournament.date,
      club: safeTournament.club,
      sidInvestment,
    },
    expenseTotals,
    collectionTotals,
    split,
    categoryEntries,
    highestCategory,
    aiContext: {
      totalExpenses: expenseTotals.totalExpenses,
      totalCollection: collectionTotals.netCollection,
      totalIncome: collectionTotals.totalIncome,
      totalRefunds: collectionTotals.totalRefunds,
      profit: split.profit,
      sidInvestment,
      profitShareEach: split.profitShareEach,
      amountVishweshPaysSiddharth: split.amountVishweshPaysSiddharth,
      settlement: split.settlement,
      categoryBreakdown: expenseTotals.categoryBreakdown,
      highestCategory: {
        name: highestCategory.label,
        amount: highestCategory.amount,
        percent: highestCategory.percent,
      },
    },
  };
};

// Category icons mapping
export const getCategoryIcon = (category) => {
  const icons = {
    'Court': '🏸',
    'Referee': '👨‍⚖️',
    'Shuttle': '🎯',
    'Food': '🍕',
    'Trophy': '🏆',
    'Medal': '🥇',
    'Certificate': '📜',
    'Bhaiya': '👤',
    'Other': '📦'
  };
  return icons[category] || '📦';
};

// Source icons mapping
export const getSourceIcon = (source) => {
  const icons = {
    'PlayMatches': '🎮',
    'UPI': '📱',
    'Cash': '💵'
  };
  return icons[source] || '💰';
};

// Club colors
export const getClubColor = (club) => {
  return club === 'Velocity' ? '#22c55e' : '#f59e0b';
};
