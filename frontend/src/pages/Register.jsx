import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', section: '', role: 'student' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed??');
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Register</h2>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="name" placeholder="Full name" value={form.name} onChange={handleChange} className="w-full border p-2 rounded" required />
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="w-full border p-2 rounded" required />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="w-full border p-2 rounded" required />
        <input name="department" placeholder="Department (e.g. CSE)" value={form.department} onChange={handleChange} className="w-full border p-2 rounded" required />
        <input name="section" placeholder="Section (students only)" value={form.section} onChange={handleChange} className="w-full border p-2 rounded" />
        <select name="role" value={form.role} onChange={handleChange} className="w-full border p-2 rounded">
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <button className="w-full bg-blue-900 text-white py-2 rounded hover:bg-blue-800">Register</button>
      </form>
      <p className="text-sm mt-3">Already have an account? <Link to="/login" className="text-blue-700 underline">Login</Link></p>
    </div>
  );
}
