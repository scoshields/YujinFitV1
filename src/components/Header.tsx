import React from 'react';
import { Dumbbell, LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function Header() {
  const { isAuthenticated, logout } = useAuthStore();

  return (
    <header className="bg-black/50 backdrop-blur-sm border-b border-blue-500/10 fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Dumbbell className="w-8 h-8 text-blue-500" />
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-green-400 text-transparent bg-clip-text">
            Yujin Fit
          </span>
        </Link>
        <nav className="flex items-center space-x-6">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-gray-300 hover:text-blue-400 transition-colors">Dashboard</Link>
              <Link to="/workouts" className="text-gray-300 hover:text-blue-400 transition-colors">Workouts</Link>
              <Link to="/partners" className="text-gray-300 hover:text-blue-400 transition-colors">Partners</Link>
              <Link 
                to="/profile" 
                className="flex items-center space-x-2 text-gray-300 hover:text-blue-400 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-300 hover:text-blue-400 transition-colors">
                Sign In
              </Link>
              <Link to="/signup" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}