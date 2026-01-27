import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const USERS = [
  { id: 1, name: 'Admin1', pass: 'admin123', role: 'admin' },
  { id: 2, name: 'Standard User', pass: 'user123', role: 'user' },
  { id: 2, name: 'coronet', pass: '#coronet#2026_!', role: 'admin' }
];

const Login = () => {
  const [credentials, setCredentials] = useState({ name: '', pass: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    const user = USERS.find(u => u.name === credentials.name && u.pass === credentials.pass);

    if (user) {
      //localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('user', user.name);
      navigate('/');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.card}>
        <h2 style={{ textAlign: 'center', color: '#333' }}>Dashboard Login</h2>
        {error && <p style={styles.error}>{error}</p>}
        
        <input 
          type="text" 
          placeholder="Username" 
          style={styles.input}
          onChange={(e) => setCredentials({...credentials, name: e.target.value})}
          required
        />
        <input 
          type="password" 
          placeholder="Password" 
          style={styles.input}
          onChange={(e) => setCredentials({...credentials, pass: e.target.value})}
          required
        />
        <button type="submit" style={styles.button}>Login</button>
      </form>
    </div>
  );
};

const styles = {
  container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' },
  card: { padding: '40px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '350px' },
  input: { width: '100%', padding: '12px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  error: { color: 'red', textAlign: 'center', fontSize: '14px' }
};

export default Login;