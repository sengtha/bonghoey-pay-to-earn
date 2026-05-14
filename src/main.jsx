import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [view, setView] = useState('login'); 
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [points, setPoints] = useState(0);
  const [message, setMessage] = useState('');
  const [gifts, setGifts] = useState([]);

  // Check URL for Magic Link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup') === 'true') {
      setPhone(params.get('phone') || '');
      setView('setup');
    }
  }, []);

  const handleSetup = async () => {
    setMessage("Saving PIN...");
    const res = await fetch('/api/rewards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setup_pin', phone_number: phone, pin })
    });
    if (res.ok) {
      setMessage("PIN Set! Logging in...");
      handleLogin();
    }
  };

  const handleLogin = async () => {
    setMessage("Logging in...");
    const res = await fetch('/api/rewards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', phone_number: phone, pin })
    });
    const data = await res.json();
    if (data.error) {
      setMessage(data.error);
    } else {
      setPoints(data.points);
      setView('dashboard');
      setMessage('');
    }
  };

  const handleRedeem = async () => {
    setMessage("Spinning...");
    const res = await fetch('/api/rewards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem', phone_number: phone, pin })
    });
    const data = await res.json();
    if (data.error) setMessage(data.error);
    else {
      setMessage(`🎉 You won: ${data.reward_won}!`);
      setPoints(data.remaining_points);
    }
  };

  const loadAdmin = async () => {
    const res = await fetch('/api/rewards');
    setGifts(await res.json());
    setView('admin');
  };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' };
  const btnStyle = { width: '100%', padding: '12px', color: 'white', border: 'none', fontWeight: 'bold', marginBottom: '10px' };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      
      {view === 'setup' && (
        <div>
          <h2>Secure Your Wallet</h2>
          <p>Welcome! Set a 4-digit PIN to secure your points.</p>
          <input placeholder="Phone" value={phone} readOnly style={inputStyle}/>
          <input placeholder="Create 4-Digit PIN" type="password" value={pin} onChange={e => setPin(e.target.value)} style={inputStyle}/>
          <button onClick={handleSetup} style={{...btnStyle, background: '#10b981'}}>Save PIN & Enter</button>
        </div>
      )}

      {view === 'login' && (
        <div>
          <h2>User Login</h2>
          <input placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle}/>
          <input placeholder="4-Digit PIN" type="password" value={pin} onChange={e => setPin(e.target.value)} style={inputStyle}/>
          <button onClick={handleLogin} style={{...btnStyle, background: '#3b82f6'}}>Login</button>
          <button onClick={loadAdmin} style={{...btnStyle, background: '#6b7280', marginTop: '20px'}}>Shop Admin Login</button>
          <p style={{color: 'red'}}>{message}</p>
        </div>
      )}

      {view === 'dashboard' && (
        <div>
          <h2>My Rewards Wallet</h2>
          <div style={{ background: '#f3f4f6', padding: '20px', textAlign: 'center', marginBottom: '15px' }}>
            <h1>{points} pts</h1>
          </div>
          <button onClick={handleRedeem} style={{...btnStyle, background: '#8b5cf6'}}>Play Lucky Draw (10 pts)</button>
          <button onClick={() => setView('login')} style={{...btnStyle, background: '#ef4444'}}>Logout</button>
          <p style={{color: '#eab308', fontWeight: 'bold'}}>{message}</p>
        </div>
      )}

      {view === 'admin' && (
        <div>
          <h2>Shop Admin Dashboard</h2>
          <p style={{fontSize: '12px', color: 'red'}}>*Ensure Cloudflare Zero Trust is protecting this view.*</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {gifts.map(g => (
              <li key={g.id} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                <span>{g.name}</span> <strong>{g.inventory} left</strong>
              </li>
            ))}
          </ul>
          <button onClick={() => setView('login')} style={{...btnStyle, background: '#6b7280'}}>Exit Admin</button>
        </div>
      )}

    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
