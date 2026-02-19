import React from 'react';

export default function App() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <h1 style={{ color: '#1a1a1a', marginBottom: '20px' }}>Badminton Expense Calculator</h1>
      <p style={{ color: '#525252', fontSize: '16px', marginBottom: '20px' }}>✓ React is loading!</p>
      
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: '400px'
      }}>
        <p style={{ color: '#1a1a1a', marginBottom: '10px' }}>environment: {import.meta.env.MODE}</p>
        <p style={{ color: '#1a1a1a', marginBottom: '10px' }}>public path: {import.meta.env.BASE_URL}</p>
        <p style={{ color: '#22c55e', fontSize: '14px' }}>If you see this, React is working!</p>
      </div>
    </div>
  );
}
