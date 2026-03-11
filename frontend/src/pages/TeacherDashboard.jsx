import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, BookOpen, Users, LogOut, Plus, Play, Square, CheckCircle, Bell, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../api'; // Ensure this path is correct

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [liveAttendance, setLiveAttendance] = useState([]); 

  // --- CAMERA & AI STATE ---
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Mock data for UI
  const modules = [
    { id: 1, name: 'Natural Language Processing', code: 'NLP-01', students: 32, progress: 85 },
    { id: 2, name: 'Deep Learning Basics', code: 'DL-04', students: 28, progress: 70 },
    { id: 3, name: 'Embedded Systems', code: 'ES-02', students: 25, progress: 90 }
  ];

  // 1. TOGGLE CAMERA ON/OFF
  const toggleCamera = async () => {
    if (!isScanning) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsScanning(true);
      } catch (err) {
        console.error("Camera access denied:", err);
        alert("Please allow camera permissions in your browser to start the AI Scanner.");
      }
    } else {
      const stream = videoRef.current?.srcObject;
      const tracks = stream?.getTracks();
      tracks?.forEach(track => track.stop());
      setIsScanning(false);
    }
  };

  // 2. THE AI FRAME CAPTURE LOOP
  useEffect(() => {
    let frameInterval;
    if (isScanning) {
      // Take a picture every 2 seconds and send it to Django
      frameInterval = setInterval(async () => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          
          // Draw video frame to hidden canvas
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64 image
          const base64Image = canvas.toDataURL('image/jpeg', 0.8);
          
          try {
            // Send the image to your Django AI endpoint
            await API.post('recognize_frame/', { image: base64Image });
          } catch (error) {
            console.error("Failed to process frame", error);
          }
        }
      }, 2000); 
    }
    return () => clearInterval(frameInterval);
  }, [isScanning]);

  // 3. THE LIVE FEED POLLER (Gets the list of detected students)
  useEffect(() => {
    const checkLiveScanner = setInterval(async () => {
      try {
        const response = await API.get('attendance/');
        setLiveAttendance(response.data.slice(-5).reverse());
      } catch (err) {
        // Silent fail if backend is unreachable
      }
    }, 3000);

    return () => clearInterval(checkLiveScanner);
  }, []);

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
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </button>
            <button onClick={() => setActiveTab('modules')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'modules' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <BookOpen className="w-5 h-5" /> My Modules
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
            <h1 className="text-3xl font-bold text-white tracking-tight">Professor Portal</h1>
            <p className="text-slate-500 font-light">Welcome back, Dr. Alaoui</p>
          </div>
          <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all relative">
            <Bell className="w-5 h-5 text-slate-400" />
            <span className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full"></span>
          </button>
        </header>

        {/* TOP SECTION: SCANNER & STATS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          
          {/* Real-time Scanner Card */}
          <div className="lg:col-span-2 p-8 bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Live AI Scanner</h3>
                <span className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${isScanning ? 'text-green-400 animate-pulse' : 'text-slate-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-green-400' : 'bg-slate-500'}`}></div> 
                  {isScanning ? 'AI Scanner Active' : 'Scanner Offline'}
                </span>
              </div>
              
              {/* THE WEBCAM FEED */}
              <div className="w-full bg-[#020617] rounded-2xl overflow-hidden mb-6 relative aspect-video border border-white/10 flex items-center justify-center shadow-inner">
                {!isScanning && <p className="text-slate-500 absolute z-10 flex flex-col items-center gap-2"><CameraOffIcon /> Camera is offline</p>}
                
                {/* Visible Video Component */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${!isScanning && 'hidden'}`}
                ></video>
                
                {/* Hidden Canvas used for taking silent screenshots */}
                <canvas ref={canvasRef} className="hidden"></canvas>
              </div>
              
              {/* This list updates automatically when Python saves a face to the DB */}
              <div className="space-y-3 mb-8">
                {liveAttendance.length > 0 ? (
                  liveAttendance.map((record, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 animate-slideIn">
                      <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">{record.student_first_name} {record.student_last_name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic text-sm py-4">Waiting for first detection...</p>
                )}
              </div>
            </div>

            <button 
              onClick={toggleCamera}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                isScanning 
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
              }`}
            >
              {isScanning ? (
                <><Square className="w-5 h-5 fill-current" /> Stop AI Scanner</>
              ) : (
                <><Play className="w-5 h-5 fill-current" /> Start AI Scanner</>
              )}
            </button>
          </div>

          {/* Stats Card */}
          <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[32px] text-white flex flex-col justify-between shadow-xl shadow-indigo-900/20">
            <h3 className="text-xl font-bold">Daily Insight</h3>
            <div className="space-y-2">
              <p className="text-5xl font-black">94%</p>
              <p className="text-indigo-100 text-sm opacity-80 leading-relaxed">Average presence recorded across all active AI nodes today.</p>
            </div>
          </div>
        </div>

        {/* MODULES LIST */}
        <h3 className="text-xl font-bold mb-6">Your Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => (
            <div key={mod.id} className="p-6 bg-white/5 border border-white/10 rounded-[24px] hover:border-blue-500/50 transition-all group cursor-pointer backdrop-blur-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-600/20 p-3 rounded-xl group-hover:bg-blue-600 transition-all">
                  <BookOpen className="w-6 h-6 text-blue-400 group-hover:text-white" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{mod.code}</span>
              </div>
              <h4 className="text-lg font-bold text-white mb-1">{mod.name}</h4>
              <p className="text-slate-500 text-sm mb-6">{mod.students} Students Enrolled</p>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${mod.progress}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

// Simple icon for offline camera state
const CameraOffIcon = () => (
  <svg xmlns="http://www.w3.org/-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M2 2l20 20"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><path d="M13.54 13.54a2 2 0 1 1-2.83-2.83"/><path d="M2 12s3-7 10-7a9.7 9.7 0 0 1 2.53.34"/><path d="M22 12s-3 7-10 7a9.7 9.7 0 0 1-2.53-.34"/></svg>
);

export default TeacherDashboard;