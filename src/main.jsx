import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [view, setView] = useState('customer'); // 'customer' or 'admin'
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [points, setPoints] = useState(0);
  
  // Admin States
  const [gifts, setGifts] = useState([]);
  const [newGiftName, setNewGiftName] = useState('');
  const [newGiftStock, setNewGiftStock] = useState('');

  const checkBalance = async () => {
    setMessage("Checking...");
    const res = await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_balance', phone_number: phone })
    });
    const data = await res.json();
    setPoints(data.points || 0);
    setMessage(data.error ? data.error : "Balance loaded.");
  };

  const handleRedeem = async () => {
    setMessage("Spinning the wheel...");
    const res = await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem', phone_number: phone })
    });
    const data = await res.json();
    
    if (data.error) setMessage(data.error);
    else {
      setMessage(`🎉 You won: ${data.reward_won}!`);
      setPoints(data.remaining_points);
    }
  };

  const loadGifts = async () => {
    const res = await fetch('/api/rewards');
    setGifts(await res.json());
  };

  const handleAddGift = async () => {
    await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_gift', name: newGiftName, inventory: Number(newGiftStock) })
    });
    setNewGiftName('');
    setNewGiftStock('');
    loadGifts(); 
  };

  useEffect(() => {
    if (view === 'admin') loadGifts();
  }, [view]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setView('customer')} style={{ flex: 1, padding: '10px' }}>Customer</button>
        <button onClick={() => setView('admin')} style={{ flex: 1, padding: '10px' }}>Admin</button>
      </div>

      {view === 'customer' ? (
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h2>🎁 Pay-to-Earn Rewards</h2>
          <p style={{ fontSize: '12px', color: '#666' }}>Pay via BongHoey KHQR and put your phone number in the Note.</p>
          
          <input 
            placeholder="Enter Phone Number" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <button onClick={checkBalance} style={{ width: '100%', padding: '10px', background: '#3b82f6', color: 'white', border: 'none', marginBottom: '10px' }}>
            Check Balance
          </button>

          <div style={{ background: '#f3f4f6', padding: '15px', textAlign: 'center', marginBottom: '10px' }}>
            <h3>Your Points: {points}</h3>
          </div>

          <button onClick={handleRedeem} style={{ width: '100%', padding: '15px', background: '#10b981', color: 'white', border: 'none', fontSize: '16px', fontWeight: 'bold' }}>
            Play & Redeem (10 pts)
          </button>
          
          <p style={{ marginTop: '15px', color: '#eab308', fontWeight: 'bold', textAlign: 'center' }}>{message}</p>
        </div>
      ) : (
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h2>🏬 Shop Inventory</h2>
          <div style={{ marginBottom: '20px' }}>
            <input placeholder="Gift Name" value={newGiftName} onChange={e => setNewGiftName(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '5px', boxSizing: 'border-box' }}/>
            <input placeholder="Stock Qty" type="number" value={newGiftStock} onChange={e => setNewGiftStock(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}/>
            <button onClick={handleAddGift} style={{ width: '100%', padding: '10px', background: '#8b5cf6', color: 'white', border: 'none' }}>+ Add Gift</button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {gifts.map(g => (
              <li key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                <span>{g.name}</span>
                <span style={{ fontWeight: 'bold', color: g.inventory > 0 ? '#10b981' : '#ef4444' }}>Stock: {g.inventory}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
