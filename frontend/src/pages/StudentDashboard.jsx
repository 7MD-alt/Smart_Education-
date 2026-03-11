import React, { useState } from 'react';
import { User, Camera, Calendar, LogOut, Bell, CheckCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Sub-component for the Profile Tab
const ProfileSection = ({ user, setUser }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target.result);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Photo Card */}
        <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] text-center backdrop-blur-md">
          <div className="relative inline-block mb-6 group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-600/30 ring-8 ring-blue-600/10">
              <img src={selectedImage || user.photoUrl} alt="Reference" className="w-full h-full object-cover" />
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-xl cursor-pointer hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/40">
              <Camera className="w-5 h-5 text-white" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
            </label>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Reference Photo</h3>
          <p className="text-sm text-slate-500 leading-relaxed px-4">
            This photo is used by the AI to verify your identity during attendance.
          </p>
        </div>

        {/* Info Card */}
        <div className="md:col-span-2 p-8 bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-md">
          <h3 className="text-xl font-bold text-white mb-6">Profile Details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-widest font-bold">Full Name</label>
                <input 
                  type="text" 
                  value={user.fullName}
                  onChange={(e) => setUser({...user, fullName: e.target.value})}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 px-4 text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-widest font-bold">Student ID</label>
                <div className="w-full bg-slate-800/30 border border-white/5 rounded-xl py-3 px-4 text-slate-400 cursor-not-allowed">
                  {user.id}
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-slate-500 uppercase tracking-widest font-bold">Major / Filière</label>
              <input 
                type="text" 
                value={user.major}
                onChange={(e) => setUser({...user, major: e.target.value})}
                className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 px-4 text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl mt-4 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState({
    username: localStorage.getItem('username') || 'Student',
    fullName: 'Ahmed Charifi Alaoui',
    id: 'M12345',
    major: 'Intelligence Artificielle',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed' // Nicer placeholder
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#020617] flex font-sans text-slate-200">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900/50 border-r border-white/5 p-6 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-blue-600 p-2 rounded-xl">
              <CheckCircle className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tighter text-white">SmartAttend</span>
          </div>
          
          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <Calendar className="w-5 h-5" /> Overview
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <User className="w-5 h-5" /> My Profile
            </button>
          </nav>
        </div>

        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-400 transition-colors">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-mesh">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome, {user.username}</h1>
            <p className="text-slate-500">You are currently in your {user.major} semester.</p>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl relative cursor-pointer">
            <Bell className="w-5 h-5 text-slate-400" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats Bento */}
            <div className="lg:col-span-2 p-8 bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-md">
              <h3 className="text-xl font-semibold mb-6">Attendance Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                  <p className="text-slate-400 text-sm mb-1">Total Attendance</p>
                  <p className="text-4xl font-bold text-blue-400">92%</p>
                </div>
                <div className="p-6 bg-purple-600/10 border border-purple-500/20 rounded-2xl">
                  <p className="text-slate-400 text-sm mb-1">Total Absences</p>
                  <p className="text-4xl font-bold text-purple-400">03</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] text-white shadow-xl shadow-blue-900/20">
              <Zap className="w-10 h-10 mb-4 opacity-50 text-white" />
              <h3 className="text-xl font-bold mb-2">Upcoming Session</h3>
              <p className="text-blue-100 mb-6">NLP Laboratory - 14:00</p>
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl font-semibold transition-all active:scale-95">
                View Schedule
              </button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && <ProfileSection user={user} setUser={setUser} />}
      </main>
    </div>
  );
};

export default StudentDashboard;