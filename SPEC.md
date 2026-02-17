# Badminton Tournament Expense Calculator - Specification

## 1. Project Overview

**Project Name:** Badminton Tournament Expense Calculator  
**Type:** Single Page Web Application (React + Vite)  
**Core Functionality:** A tournament expense management app for two organizers (Sid and Vish) to track expenses, collections, and calculate settlements for badminton tournaments under two clubs.  
**Target Users:** Siddharth (Sid) and Vishwesh (Vish) - tournament organizers

---

## 2. UI/UX Specification

### Layout Structure

**Mobile-First Approach (min-width: 320px)**

- **Header:** Fixed top navigation with app title and tournament selector
- **Main Content:** Scrollable container with tab-based navigation
- **Bottom Navigation:** Tab bar for quick access to Setup, Expenses, Collections, Summary
- **Modal Overlays:** For adding/editing entries and viewing bills

**Responsive Breakpoints:**
- Mobile: < 640px (single column)
- Tablet: 640px - 1024px (two columns where applicable)
- Desktop: > 1024px (max-width container: 800px, centered)

### Visual Design

**Color Palette:**
- Background Primary: `#0a0f0d` (very dark green-black)
- Background Secondary: `#141f1a` (dark green)
- Background Card: `#1a2922` (muted green)
- Accent Primary: `#00ff88` (bright neon green)
- Accent Secondary: `#ffdd00` (vibrant yellow)
- Text Primary: `#ffffff`
- Text Secondary: `#8fa89c` (muted green-gray)
- Text Muted: `#5a7066`
- Danger: `#ff4757`
- Success: `#00ff88`
- Border: `#2a3d35`

**Typography:**
- Font Family: `'Outfit', sans-serif` (headings), `'DM Sans', sans-serif` (body)
- Headings: 
  - H1: 28px, weight 700
  - H2: 22px, weight 600
  - H3: 18px, weight 600
- Body: 14px, weight 400
- Small: 12px, weight 400
- Currency Symbol: ₹ (Indian Rupee)

**Spacing System:**
- Base unit: 4px
- XS: 4px, SM: 8px, MD: 16px, LG: 24px, XL: 32px

**Visual Effects:**
- Card shadows: `0 4px 20px rgba(0, 255, 136, 0.08)`
- Border radius: 12px (cards), 8px (buttons), 20px (pills)
- Hover transitions: 0.2s ease
- Tab indicator: Animated slide with accent color

### Components

**1. Header**
- App title with shuttlecock icon (🏸)
- Tournament dropdown selector
- New Tournament button (+)

**2. Tab Navigation**
- 4 tabs: Setup, Expenses, Collections, Summary
- Active tab: Accent color with underline indicator
- Icons for each tab

**3. Tournament Setup Card**
- Tournament name input (text)
- Club selector (Velocity Badminton / Breathe Badminton) - pill buttons
- Date picker
- Save/Create button

**4. Expense Entry Form**
- Category dropdown: Court, Referee, Shuttle, Food, Trophy, Medal, Certificate, Bhaiya, Other
- Amount input (number, ₹ prefix)
- Paid by: Sid / Vish / Both (pill buttons)
- Add button (accent color)

**5. Expense List**
- Each item shows: Category icon, Description, Amount, Payer badge
- Swipe to delete or delete button
- Total at bottom

**6. Collection Entry Form**
- Source dropdown: PlayMatches, UPI, Cash
- Amount input (number, ₹ prefix)
- Type toggle: Income / Refund (negative)
- Add button

**7. Collection List**
- Each item shows: Source icon, Type (Income/Refund badge), Amount
- Total at bottom

**8. Summary Dashboard**
- Total Expenses card (with breakdown: Sid's share, Vish's share)
- Total Collection card
- Profit/Loss card (green if profit, red if loss)
- 50/50 Split card
- Final Settlement card (who owes whom)
- Print/Share Bill button

**9. Bill Modal**
- Tournament header (name, club, date)
- Expense table with payer
- Collection breakdown
- Summary section
- Settlement line
- Print button

**10. Tournament List (Sidebar/Modal)**
- List of saved tournaments
- Date and club for each
- Select / Delete options

---

## 3. Functionality Specification

### Data Models

```typescript
interface Tournament {
  id: string;
  name: string;
  club: 'Velocity' | 'Breathe';
  date: string; // ISO date
  createdAt: string;
  expenses: Expense[];
  collections: Collection[];
}

interface Expense {
  id: string;
  category: 'Court' | 'Referee' | 'Shuttle' | 'Food' | 'Trophy' | 'Medal' | 'Certificate' | 'Bhaiya' | 'Other';
  amount: number;
  paidBy: 'Sid' | 'Vish' | 'Both';
  createdAt: string;
}

interface Collection {
  id: string;
  source: 'PlayMatches' | 'UPI' | 'Cash';
  amount: number;
  isRefund: boolean;
  createdAt: string;
}
```

### Core Features

**Tournament Management:**
- Create new tournament with name, club, date
- Select between saved tournaments
- Auto-save to localStorage on any change
- Delete tournament with confirmation

**Expense Tracking:**
- Add expense with category, amount, payer
- List all expenses with running total
- Delete individual expenses
- Calculate per-payer totals

**Collection Tracking:**
- Add collection with source, amount
- Support negative amounts for refunds
- List all collections with running total
- Delete individual collections

**Calculations:**
- Total Expenses = Sum of all expense amounts
- Sid's Expenses = Sum where paidBy is 'Sid' + 50% of 'Both'
- Vish's Expenses = Sum where paidBy is 'Vish' + 50% of 'Both'
- Total Collection = Sum of all (collection amounts - refund amounts)
- Profit = Collection - Expenses
- Each Person's Share = Profit / 2
- Settlement: 
  - If Sid paid more than their share: Vish pays Sid (difference)
  - If Vish paid more than their share: Sid pays Vish (difference)

**Bill Generation:**
- Generate formatted bill with all details
- Print-friendly layout
- Copy to clipboard option

### localStorage Schema

Key: `badminton_expense_calculator`
```json
{
  "tournaments": [...],
  "currentTournamentId": "uuid-string"
}
```

### User Flows

1. **First Visit:** Show empty state with "Create First Tournament" prompt
2. **Create Tournament:** Fill form → Save → Auto-select new tournament
3. **Add Expense:** Fill form → Add → Appears in list with updated totals
4. **Add Collection:** Fill form → Add → Appears in list with updated totals
5. **View Summary:** Navigate to Summary tab → See all calculations
6. **Print Bill:** Click Print → Modal opens → Print or close
7. **Switch Tournament:** Select from dropdown → Data updates

---

## 4. Acceptance Criteria

### Visual Checkpoints
- [ ] Dark theme with #0a0f0d background
- [ ] Neon green (#00ff88) accents on buttons and active states
- [ ] Yellow (#ffdd00) highlights on important numbers
- [ ] Mobile-first responsive layout
- [ ] Tab navigation with smooth transitions
- [ ] Cards have subtle green glow shadow

### Functional Checkpoints
- [ ] Can create a new tournament with name, club, date
- [ ] Can add expenses with category, amount, payer
- [ ] Can add collections with source, amount (including refunds)
- [ ] Can delete expenses and collections
- [ ] Summary shows correct totals for Sid and Vish
- [ ] Profit calculated correctly (Collection - Expenses)
- [ ] 50/50 split calculated correctly
- [ ] Final settlement shows correct direction and amount
- [ ] Bill displays all tournament information
- [ ] Bill is printable
- [ ] Data persists in localStorage across refresh
- [ ] Can switch between multiple tournaments

### Edge Cases
- [ ] Empty tournament (no expenses/collections) shows ₹0 properly
- [ ] Negative profit (loss) handled correctly
- [ ] "Both" payer splits 50/50 correctly
- [ ] Large numbers formatted with commas (e.g., ₹1,23,456)
- [ ] Deleting last tournament handles gracefully

---

## 5. Technical Stack

- **Framework:** React 18+ with Vite
- **Styling:** CSS Modules or Styled Components
- **State Management:** React useState + useEffect
- **Storage:** localStorage
- **Icons:** Lucide React
- **No external UI libraries** - custom components for full control
