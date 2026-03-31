import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/users';

export default function UserManagement({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'user' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(API_URL);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, formData);
      } else {
        await axios.post(API_URL, formData);
      }
      setFormData({ name: '', email: '', role: 'user' });
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleEdit = (user) => {
    setFormData({ name: user.name, email: user.email, role: user.role });
    setEditingId(user.id);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="side-panel">
      <div className="panel-header">
        <h2>User Management</h2>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>
      
      <form onSubmit={handleSubmit} className="user-form">
        <input 
          type="text" 
          placeholder="Name" 
          value={formData.name} 
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
        <input 
          type="email" 
          placeholder="Email" 
          value={formData.email} 
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
        <select 
          value={formData.role} 
          onChange={(e) => setFormData({...formData, role: e.target.value})}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="submit-btn">
          {editingId ? 'Update User' : 'Add User'}
        </button>
      </form>

      <div className="user-list">
        {users.map(user => (
          <div key={user.id} className="user-item">
            <div className="user-info">
              <strong>{user.name}</strong>
              <span>{user.email} ({user.role})</span>
            </div>
            <div className="user-actions">
              <button onClick={() => handleEdit(user)}>Edit</button>
              <button onClick={() => handleDelete(user.id)} className="delete-btn">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
