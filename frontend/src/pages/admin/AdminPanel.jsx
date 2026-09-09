import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, clearToken } from '../../api.js';
import FlowImagesTab from './FlowImagesTab.jsx';
import PlansTab from './PlansTab.jsx';
import PartnersTab from './PartnersTab.jsx';
import StudentsTab from './StudentsTab.jsx';

const TABS = [
  { id: 'images', label: 'Flow Images' },
  { id: 'plans', label: 'Plans & Prices' },
  { id: 'partners', label: 'Partners' },
  { id: 'students', label: 'Students' },
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('images');

  useEffect(() => {
    if (!getToken('admin')) navigate('/admin/login');
  }, []);

  const logout = () => { clearToken('admin'); navigate('/admin/login'); };

  return (
    <div className="panel">
      <aside className="sidebar">
        <div className="logo"><span className="logo-mark">S</span><span>Admin</span></div>
        <div className="mt-24" style={{ width: '100%' }}>
          {TABS.map((t) => (
            <div
              key={t.id}
              className={`side-link ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </div>
          ))}
          <div className="side-link" onClick={logout}>Logout</div>
        </div>
      </aside>
      <main className="panel-main">
        {tab === 'images' && <FlowImagesTab />}
        {tab === 'plans' && <PlansTab />}
        {tab === 'partners' && <PartnersTab />}
        {tab === 'students' && <StudentsTab />}
      </main>
    </div>
  );
}
