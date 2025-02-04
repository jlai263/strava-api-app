import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/activities', label: 'Activities' },
    { path: '/stats', label: 'Statistics' },
  ];

  return (
    <nav className="fixed w-full bg-black/30 backdrop-blur-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent"
            >
              Strava Viz
            </motion.div>
          </Link>

          {isAuthenticated && (
            <div className="flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative"
                >
                  <motion.span
                    className={`text-sm font-medium ${
                      location.pathname === item.path
                        ? 'text-orange-500'
                        : 'text-gray-300 hover:text-white'
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    {item.label}
                  </motion.span>
                  {location.pathname === item.path && (
                    <motion.div
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-orange-500"
                      layoutId="navbar-indicator"
                    />
                  )}
                </Link>
              ))}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-pink-500 rounded-md hover:from-orange-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Logout
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 
