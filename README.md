# OrganiserCal - Badminton Tournament Expense Calculator

A mobile-first web application for managing badminton tournament expenses and settlements between two organizers.

## Features

- **Tournament Management** - Create, select, and manage multiple tournaments
- **Expense Tracking** - Track expenses by category (Court, Referee, Shuttle, Food, Trophy, Medal, etc.)
- **Collection Tracking** - Track player payments and refunds
- **Settlement Calculator** - Automatically calculate who owes whom with 50/50 split
- **Bill Generation** - Print-friendly tournament bills
- **Local Storage** - All data persists in your browser

## Tech Stack

- React 18 + Vite
- Lucide React (icons)
- localStorage for data persistence
- Custom CSS (dark theme with neon green accents)

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/Sidbhat20/OrganiserCal.git

# Navigate to project directory
cd OrganiserCal

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

## Usage

1. **Create a Tournament** - Click "New" and enter tournament details (name, club, date)
2. **Add Expenses** - Go to Expenses tab, add costs with payer info (Sid/Vish/Both)
3. **Add Collections** - Go to Collections tab, record player payments
4. **View Summary** - Check profit/loss and settlement details
5. **Generate Bill** - Print or view tournament bill

## Clubs Supported

- Velocity Badminton
- Breathe Badminton

## License

MIT
