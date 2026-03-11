import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ScanFace className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">SmartAttend</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">How it Works</a>
          </div>

          {/* Auth Actions */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Log in
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-all shadow-sm hover:shadow"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;