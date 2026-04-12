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
  Medals: 'medals',
};

const normalizePayer = (paidBy) => {
  const value = String(paidBy || '').trim().toUpperCase();
  if (value === 'SIDDHARTH') return 'SID';
  if (value === 'VISHWESH') return 'VISH';
  if (value === 'SID' || value === 'VISH' || value === 'SPLIT') return value;
  return 'VISH';
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
    sidInvestment: 0,
    vishInvestment: 0,
    categoryBreakdown: {
      court: 0,
      shuttle: 0,
      referee: 0,
      food: 0,
      medals: 0,
      others: 0,
    },
  };

  expenses.forEach((expense) => {
    const amount = roundTo2(expense.amount);
    if (amount <= 0) return;

    const paidBy = normalizePayer(expense.paidBy);
    const categoryKey = CATEGORY_KEYS[expense.category] || 'others';

    totals.totalExpenses += amount;
    totals.categoryBreakdown[categoryKey] += amount;

    if (paidBy === 'SID') {
      totals.sidInvestment += amount;
      return;
    }

    if (paidBy === 'VISH') {
      totals.vishInvestment += amount;
      return;
    }

    const splitSid = roundTo2(expense?.split?.sidAmount);
    const splitVish = roundTo2(expense?.split?.vishAmount);
    if (splitSid + splitVish > 0) {
      totals.sidInvestment += splitSid;
      totals.vishInvestment += splitVish;
    } else {
      const half = roundTo2(amount / 2);
      totals.sidInvestment += half;
      totals.vishInvestment += roundTo2(amount - half);
    }
  });

  totals.totalExpenses = roundTo2(totals.totalExpenses);
  totals.sidInvestment = roundTo2(totals.sidInvestment);
  totals.vishInvestment = roundTo2(totals.vishInvestment);

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
  vishInvestment,
}) => {
  const collection = roundTo2(totalCollection);
  const expenses = roundTo2(totalExpenses);
  const sidInvest = roundTo2(sidInvestment);
  const vishInvest = roundTo2(vishInvestment);

  const profit = roundTo2(collection - expenses);
  const sidShare = roundTo2(profit / 2);
  const vishShare = roundTo2(profit / 2);

  const sidFinal = roundTo2(sidInvest + sidShare);
  const vishFinal = roundTo2(vishInvest + vishShare);

  const amountVishPaysSidRaw = sidFinal > sidInvest ? roundTo2(sidFinal - sidInvest) : 0;
  const amountSidPaysVishRaw = vishFinal > vishInvest ? roundTo2(vishFinal - vishInvest) : 0;

  let amountVishPaysSid = 0;
  let amountSidPaysVish = 0;
  let settlementMessage = 'No settlement needed';

  if (sidFinal > vishFinal) {
    amountVishPaysSid = roundTo2(sidFinal - vishFinal);
    settlementMessage = `Vishwesh pays Siddharth ${formatCurrency(amountVishPaysSid)}`;
  } else if (vishFinal > sidFinal) {
    amountSidPaysVish = roundTo2(vishFinal - sidFinal);
    settlementMessage = `Siddharth pays Vishwesh ${formatCurrency(amountSidPaysVish)}`;
  }

  const settlement = {
    from: amountVishPaysSid > 0 ? 'VISH' : amountSidPaysVish > 0 ? 'SID' : null,
    to: amountVishPaysSid > 0 ? 'SID' : amountSidPaysVish > 0 ? 'VISH' : null,
    amount: amountVishPaysSid > 0 ? amountVishPaysSid : amountSidPaysVish,
    message: settlementMessage,
  };

  return {
    profit,
    isProfit: profit >= 0,
    sidShare,
    vishShare,
    sidFinal,
    vishFinal,
    amountVishPaysSidRaw,
    amountSidPaysVishRaw,
    amountVishPaysSid,
    amountSidPaysVish,
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

  const split = calculateProfitAndSplit({
    totalCollection: collectionTotals.netCollection,
    totalExpenses: expenseTotals.totalExpenses,
    sidInvestment: expenseTotals.sidInvestment,
    vishInvestment: expenseTotals.vishInvestment,
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
      sidInvestment: expenseTotals.sidInvestment,
      vishInvestment: expenseTotals.vishInvestment,
      sidShare: split.sidShare,
      vishShare: split.vishShare,
      sidFinal: split.sidFinal,
      vishFinal: split.vishFinal,
      amountVishPaysSid: split.amountVishPaysSid,
      amountSidPaysVish: split.amountSidPaysVish,
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
    'Medals': '🥇',
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
