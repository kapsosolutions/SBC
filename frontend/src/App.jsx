import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Scan from './pages/Scan.jsx';
import Verify from './pages/Verify.jsx';
import Contact from './pages/Contact.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminPanel from './pages/admin/AdminPanel.jsx';
import PartnerLogin from './pages/partner/PartnerLogin.jsx';
import PartnerPanel from './pages/partner/PartnerPanel.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/contact" element={<Contact />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminPanel />} />

      <Route path="/partner/login" element={<PartnerLogin />} />
      <Route path="/partner" element={<PartnerPanel />} />

      <Route path="*" element={<Home />} />
    </Routes>
  );
}
