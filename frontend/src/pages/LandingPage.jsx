import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, LineChart, FileText, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import Navbar from '../components/layout/Navbar';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fafafa] overflow-hidden">
      <Navbar />
      
      {/* HERO SECTION */}
      <section className="relative pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest mb-8 animate-bounce">
              <Zap className="w-3 h-3" /> AI-Powered Attendance
            </div>
            
            <h1 className="text-6xl md:text-8xl tracking-tighter leading-none mb-8">
              <span className="text-gradient">Precision Attendance</span> <br/>
              <span className="text-[#64748b]">for Smart Campus.</span>
            </h1>
            
            <p className="max-w-2xl text-xl text-slate-500 mb-10 font-light leading-relaxed">
              Ditch the paper. Our computer vision engine identifies presence in milliseconds, 
              securing your academic integrity automatically.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => navigate('/login')} className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all hover:scale-105 shadow-xl shadow-blue-200 flex items-center gap-2">
                Launch Portal <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO FEATURE GRID */}
      <section className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Card */}
          <div className="md:col-span-2 bento-card rounded-3xl p-10 flex flex-col justify-between overflow-hidden relative">
            <div className="relative z-10">
              <ScanFace className="w-12 h-12 text-blue-600 mb-6" />
              <h3 className="text-3xl font-bold text-slate-900 mb-4">Neural Face Recognition</h3>
              <p className="text-slate-500 text-lg max-w-sm">Industry-leading biometric matching that works even in low-light classrooms.</p>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
               <ScanFace className="w-64 h-64" />
            </div>
          </div>

          <div className="bento-card rounded-3xl p-10 bg-slate-900 text-white border-none">
            <LineChart className="w-12 h-12 text-blue-400 mb-6" />
            <h3 className="text-2xl font-bold mb-4">Live Analytics</h3>
            <p className="text-slate-400">Instant heatmaps of student engagement and absence trends.</p>
          </div>

          <div className="bento-card rounded-3xl p-10">
            <ShieldCheck className="w-12 h-12 text-green-500 mb-6" />
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Anti-Proxy</h3>
            <p className="text-slate-500">Stop students from signing in for their friends using deep-liveness detection.</p>
          </div>

          <div className="md:col-span-2 bento-card rounded-3xl p-10 bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-none">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <h3 className="text-3xl font-bold mb-4">University Ready</h3>
                <p className="text-blue-100">Direct integration with Apogee and student portals.</p>
              </div>
              <FileText className="w-24 h-24 text-white/20" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;