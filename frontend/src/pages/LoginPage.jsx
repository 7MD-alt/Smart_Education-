import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, ArrowRight, Lock, User } from 'lucide-react';
import { loginUser } from '../api';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  

const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
        const data = await loginUser(username, password);

        // This checks the 'role' field we built in your Django database
        if (data.role === 'ADMIN' || data.role === 'TEACHER') {
            navigate('/teacher-dashboard');
        } else if (data.role === 'STUDENT') {
            navigate('/student-dashboard'); 
        } else {
            navigate('/'); 
        }
    } catch (err) {
        setError('Unauthorized credentials. Access denied.');
    }
  };
  

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
      <div className="w-full max-w-[1100px] h-[700px] bg-[#0f172a]/50 backdrop-blur-2xl border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Visual Side */}
        <div className="hidden md:flex w-1/2 p-16 flex-col justify-between bg-gradient-to-b from-blue-600/10 to-transparent">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/30">
                <ScanFace className="text-white w-6 h-6" />
              </div>
              <span className="text-white font-bold text-2xl tracking-tighter">SmartAttend</span>
            </div>
            <h2 className="text-5xl font-bold text-gradient-dark leading-tight">
              The Portal to <br/> Your Dashboard.
            </h2>
          </div>
          
          <div className="float-anim">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
              <p className="text-blue-400 font-mono text-sm mb-2"># SYSTEM_STATUS</p>
              <p className="text-slate-300 font-light italic">"Facial recognition nodes online. Waiting for authentication..."</p>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white/5">
          <div className="max-w-sm mx-auto w-full">
            <h3 className="text-3xl font-bold text-white mb-2">Welcome Back</h3>
            <p className="text-slate-400 mb-10">Please enter your university ID.</p>

            {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl mb-6 text-sm">{error}</div>}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="Username"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="Password"
                />
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold mt-6 shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                Sign In <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;