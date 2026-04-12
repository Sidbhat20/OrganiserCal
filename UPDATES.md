# Badminton Expense Calculator - AI Chat Feature & Neo-Brutalism UI

## 🎨 Design System Update

The application has been updated with a **Neo-Brutalism** design system featuring:

- **Hard Edges**: All border-radius set to 0
- **Bold Shadows**: Hard offset shadows (3px, 5px, 8px) instead of blur
- **Color Palette**: Yellow (#FFC107), Black (#000000), White (#FFFFFF)
- **Typography**: Instrument Sans & Instrument Serif for editorial feel
- **Grid Background**: 22px subtle grid pattern on body
- **Interactive States**: Hover translates elements (-2px, -2px), Active resets to (0, 0)

### Color Usage
- **Yellow (#FFC107)**: Primary accent, buttons, active states
- **Black (#000000)**: Borders, shadows, text
- **White (#FFFFFF)**: Cards, backgrounds
- **Grays**: Secondary text (#666666), Tertiary (#999999)

### Key Style Features
- 2px solid black borders on all interactive elements
- Card hover effect with transform and shadow increase
- Button active states with reduced shadow and translation reset
- Labels: uppercase, 11px, 700 weight, 1px letter-spacing
- Badges with uppercase text and hard shadows

---

## 🤖 AI Chat Assistant

A built-in AI chat assistant powered by **Azure OpenAI** that helps users understand and manage their tournament expenses.

### Features

✅ **Real-time Expense Analysis**: Get insights about your current tournament finances
✅ **Natural Language Queries**: Ask questions about expenses, collections, collections, and settlements
✅ **Context-Aware Responses**: AI understands your tournament's financial state
✅ **Settlement Calculations Help**: Get clarification on profit split and share calculations
✅ **Mobile-Responsive**: Chat widget adapts to all screen sizes

### How to Use

1. Click the **💬 AI Assistant** button (floating button on bottom-right)
2. The chat panel opens with Neo-brutalist styling
3. Type your question about expenses, collections, or calculations
4. AI responds with helpful guidance using your current tournament data

### Example Questions

- "How much have we spent on court fees?"
- "What's our profit for this tournament?"
- "How much should Sid and Vish get each?"
- "Can you break down the expenses by category?"
- "Are we profitable after refunds?"

---

## 🔧 Azure OpenAI Configuration

### Environment Variables

The app uses the following environment variables (configured in `.env`):

```env
VITE_AZURE_OPENAI_API_KEY=your_api_key
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.services.ai.azure.com
VITE_AZURE_OPENAI_DEPLOYMENT=GPT-5.4
VITE_AZURE_OPENAI_API_VERSION=2024-01-01-preview
```

### Current Configuration

The default `.env` file includes the pre-configured credentials. To update:

1. Open `.env` file
2. Replace `VITE_AZURE_OPENAI_API_KEY` with your Azure OpenAI key
3. Update `VITE_AZURE_OPENAI_ENDPOINT` with your resource endpoint
4. Restart the dev server

### API Details

- **Endpoint**: Azure OpenAI REST API (2024-01-01-preview)
- **Model**: GPT-5.4
- **Max Tokens**: 500 per response
- **Temperature**: 0.7 (balanced creativity and consistency)

---

## 📁 File Structure

### New Files

- `src/AIChat.jsx` - Main chat component with UI and message handling
- `src/utils/azureOpenAI.js` - Azure OpenAI API integration utility
- `.env` - Environment variables with Azure credentials
- `.env.example` - Template for environment configuration

### Modified Files

- `src/App.jsx` - Added AIChat component import and integration
- `src/index.css` - Complete redesign with Neo-brutalism styles
  - Neo-brutalist color variables
  - Hard shadows and border styling
  - Chat widget styles
  - Updated typography system
  - Responsive grid backgrounds

---

## 🎯 UI/UX Improvements

### Neo-Brutalism Benefits

1. **Bold Visual Impact**: High contrast, editorial feeling
2. **Clarity**: No distracting gradients, clear hierarchy
3. **Accessibility**: Bold shadows and borders improve definition
4. **Modern Minimalism**: Stripped-down design with intentional elements

### Interactive Feedback

- **Buttons**: Hover effect with (-2px, -2px) translation and shadow increase
- **Cards**: Subtle hover animation with shadow growth
- **Form Fields**: Focus state with warm yellow background (#fffdf1)
- **Badges**: Hard borders and shadows for prominence

### Chat Widget Features

- **Fixed Position**: Always accessible via floating button
- **Neo-Brutalist Styling**: Yellow header, bold borders
- **Loading Animation**: Animated dots while waiting for AI response
- **Message Bubbles**: Hard borders and shadows matching design system
- **Auto-scroll**: Messages automatically scroll into view

---

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173/OrganiserCal/`

### Build for Production

```bash
npm run build
```

---

## 📝 Notes

- All modern browsers supported (Chrome, Firefox, Safari, Edge)
- Mobile-responsive with special optimizations for screens < 640px
- Print styles remove UI elements for clean bill output
- Chat functionality requires internet connection for Azure OpenAI API
- CORS is handled by the Azure OpenAI service directly

---

## 🐛 Troubleshooting

### Chat Not Working?

1. Check that `.env` file has valid Azure OpenAI credentials
2. Verify internet connection
3. Check browser console for error messages
4. Ensure Azure OpenAI resource is accessible

### Styling Issues?

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check that all CSS variables are properly defined in `:root`

### Performance?

- Chat messages are not persisted (clear on refresh)
- Excellent performance on mobile and desktop
- Lightweight font imports from Google Fonts

---

## 📚 Design System References

- **Neo-Brutalism**: Raw, editorial design with strong geometric forms
- **Instrument Fonts**: Google Fonts open-source typeface designed for screens
- **Color Psychology**: Yellow for action/highlight, Black for structure
- **Shadow System**: Hard shadows show depth without softness

---

**Created**: 2026-04-09
**Last Updated**: 2026-04-09
**Version**: 1.0 with Neo-Brutalism & AI Chat
