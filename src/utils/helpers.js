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

// Calculate expense totals - including breakdown by payer
export const calculateExpenseTotals = (expenses) => {
  let totalExpenses = 0;
  let sidPaid = 0;
  let vishPaid = 0;
  
  expenses.forEach(expense => {
    const amount = Number(expense.amount) || 0;
    totalExpenses += amount;
    
    if (expense.paidBy === 'Sid') {
      sidPaid += amount;
    } else if (expense.paidBy === 'Vish') {
      vishPaid += amount;
    } else if (expense.paidBy === 'Both') {
      sidPaid += amount / 2;
      vishPaid += amount / 2;
    }
  });
  
  return { totalExpenses, sidPaid, vishPaid };
};

// Calculate collection totals - now separated from refunds
export const calculateCollectionTotals = (collections) => {
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

// Calculate profit and split
export const calculateProfitAndSplit = (totalIncome, totalRefunds, totalExpenses) => {
  const netCollection = totalIncome - totalRefunds;
  const profit = netCollection - totalExpenses;
  const eachShare = profit / 2;
  
  return {
    netCollection,
    profit,
    eachShare,
    isProfit: profit >= 0
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
