import React, { useState, useEffect } from 'react';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({ name: '', pass: '', role: 'user' });
    const [msg, setMsg] = useState('');

    const fetchUsers = async () => {
        const res = await fetch('http://localhost:5000/api/users');
        setUsers(await res.json());
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        const res = await fetch('http://localhost:5000/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) {
            setForm({ name: '', pass: '', role: 'user' });
            setMsg('User created successfully!');
            fetchUsers();
            setTimeout(() => setMsg(''), 3000);
        }
    };

    const deleteUser = async (id) => {
        if(window.confirm("Delete this user?")) {
            await fetch(`http://localhost:5000/api/users/${id}`, { method: 'DELETE' });
            fetchUsers();
        }
    };

    return (
        <div style={styles.dashboard}>
            {/* Create User Section */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Create New User</h3>
                {msg && <p style={styles.successMsg}>{msg}</p>}
                <form onSubmit={handleCreate} style={styles.formInline}>
                    <input 
                        style={styles.input} 
                        placeholder="Username" 
                        value={form.name} 
                        onChange={e => setForm({...form, name: e.target.value})} 
                        required 
                    />
                    <input 
                        style={styles.input} 
                        type="password" 
                        placeholder="Password" 
                        value={form.pass} 
                        onChange={e => setForm({...form, pass: e.target.value})} 
                        required 
                    />
                    <select 
                        style={styles.select} 
                        value={form.role} 
                        onChange={e => setForm({...form, role: e.target.value})}
                    >
                        <option value="user">Common User</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button type="submit" style={styles.addBtn}>Add User</button>
                </form>
            </div>

            {/* User List Section */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>System Users</h3>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.tableHeader}>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Username</th>
                            <th style={styles.th}>Role</th>
                            <th style={styles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={styles.tableRow}>
                                <td style={styles.td}>#{u.id}</td>
                                <td style={styles.td}><b>{u.name}</b></td>
                                <td style={styles.td}>
                                    <span style={u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser}>
                                        {u.role.toUpperCase()}
                                    </span>
                                </td>
                                <td style={styles.td}>
                                    <button onClick={() => deleteUser(u.id)} style={styles.delBtn}>Remove</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- STYLES ---
const styles = {
    dashboard: { padding: '40px', backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
    card: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
    cardTitle: { margin: '0 0 20px 0', color: '#1a202c', fontSize: '1.2rem' },
    formInline: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    input: { flex: 1, padding: '10px 15px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' },
    select: { padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#fff' },
    addBtn: { backgroundColor: '#3182ce', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
    tableHeader: { textAlign: 'left', borderBottom: '2px solid #edf2f7' },
    th: { padding: '15px', color: '#718096', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase' },
    td: { padding: '15px', borderBottom: '1px solid #edf2f7', color: '#2d3748', fontSize: '15px' },
    tableRow: { transition: 'background 0.2s', ':hover': { backgroundColor: '#f7fafc' } },
    badgeAdmin: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fed7d7', color: '#c53030' },
    badgeUser: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#bee3f8', color: '#2b6cb0' },
    delBtn: { background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' },
    successMsg: { color: '#38a169', marginBottom: '15px', fontSize: '14px', fontWeight: '500' }
};

export default UserList;