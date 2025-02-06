import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { STRAVA_AUTH_ENDPOINT } from './config';
import Dashboard from './pages/Dashboard';
import Activities from './pages/Activities';
import Stats from './pages/Stats';
import Coach from './pages/Coach';
import Training from './pages/Training';
import Goals from './pages/Goals';
import Navbar from './components/Navbar';

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

function LoginPage({ handleStravaConnect, loading, error, blobPositions, isAnimating, mousePosition, windowSize }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Animated background blobs */}
      <div className="blob-container">
        {blobPositions.map((blob, index) => {
          const colors = ['bg-blue-500/40', 'bg-purple-500/40', 'bg-orange-500/40'];
          const delays = ['', 'animation-delay-2000', 'animation-delay-4000'];
          
          return (
            <div 
              key={index}
              className={`blob ${colors[index]} ${isAnimating ? 'animate-blob' : ''} ${delays[index]}`}
              style={{
                transform: `translate(${blob.x + mousePosition.x * windowSize.width * 0.02}px, 
                           ${blob.y + mousePosition.y * windowSize.height * 0.02}px)`,
                left: '50%',
                top: '50%',
                width: `${blob.radius * 2}px`,
                height: `${blob.radius * 2}px`,
                marginLeft: `-${blob.radius}px`,
                marginTop: `-${blob.radius}px`,
                opacity: isAnimating ? 0.8 : 0.4,
                transition: isAnimating ? 'all 0.1s cubic-bezier(0.075, 0.82, 0.165, 1)' : 'opacity 0.3s ease-in',
              }}
            />
          );
        })}
      </div>

      {/* Content */}
      <div className="relative z-10 glass p-8 rounded-2xl max-w-md w-full mx-4">
        <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">
          Strava Analytics
        </h1>
        <p className="text-lg mb-8 text-gray-300">
          Get deeper insights into your training with AI-powered analytics
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <span className="w-3 h-3 bg-green-400 rounded-full"></span>
            <span className="text-gray-300">AI Coach</span>
            <span className="w-3 h-3 bg-blue-400 rounded-full ml-4"></span>
            <span className="text-gray-300">Smart Analytics</span>
            <span className="w-3 h-3 bg-purple-400 rounded-full ml-4"></span>
            <span className="text-gray-300">Race Predictions</span>
          </div>

          <button
            onClick={handleStravaConnect}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Connect with Strava'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isAnimating, setIsAnimating] = useState(false);
  const [blobPositions, setBlobPositions] = useState<Blob[]>(() => {
    const positions: Blob[] = [];
    const radii = [windowSize.width * 0.08, windowSize.width * 0.09, windowSize.width * 0.085];
    
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3;
      const distance = windowSize.width * 0.2;
      positions.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        radius: radii[i]
      });
    }
    return positions;
  });

  // Start animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Remove the generateRandomPositions function and its dependencies
  // Only regenerate positions on window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      // Update blob positions with new window size
      setBlobPositions(prevPositions => {
        return prevPositions.map((blob, i) => ({
          ...blob,
          radius: windowSize.width * [0.08, 0.09, 0.085][i]
        }));
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [windowSize]);

  const updateBlobPositions = useCallback(() => {
    setBlobPositions(prevPositions => {
      const newPositions = [...prevPositions];
      
      // Update positions based on velocity
      for (let i = 0; i < newPositions.length; i++) {
        newPositions[i] = {
          ...newPositions[i],
          x: newPositions[i].x + newPositions[i].vx,
          y: newPositions[i].y + newPositions[i].vy
        };

        // Bounce off the edges
        const boundaryX = windowSize.width * 0.45;
        const boundaryY = windowSize.height * 0.45;

        if (Math.abs(newPositions[i].x) > boundaryX) {
          newPositions[i].vx *= -0.8;
          newPositions[i].x = Math.sign(newPositions[i].x) * boundaryX;
        }
        if (Math.abs(newPositions[i].y) > boundaryY) {
          newPositions[i].vy *= -0.8;
          newPositions[i].y = Math.sign(newPositions[i].y) * boundaryY;
        }

        // Add subtle random movement
        newPositions[i].vx += (Math.random() - 0.5) * 0.05;
        newPositions[i].vy += (Math.random() - 0.5) * 0.05;

        // Limit velocity
        const speed = Math.sqrt(newPositions[i].vx ** 2 + newPositions[i].vy ** 2);
        const maxSpeed = 2;
        const minSpeed = 0.2;
        
        if (speed > maxSpeed) {
          newPositions[i].vx = (newPositions[i].vx / speed) * maxSpeed;
          newPositions[i].vy = (newPositions[i].vy / speed) * maxSpeed;
        } else if (speed < minSpeed) {
          const factor = minSpeed / speed;
          newPositions[i].vx *= factor;
          newPositions[i].vy *= factor;
        }
      }

      // Simplified collision detection
      for (let i = 0; i < newPositions.length; i++) {
        for (let j = i + 1; j < newPositions.length; j++) {
          const dx = newPositions[j].x - newPositions[i].x;
          const dy = newPositions[j].y - newPositions[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = (newPositions[i].radius + newPositions[j].radius) * 1.1;

          if (distance < minDistance) {
            // Simple collision response
            const angle = Math.atan2(dy, dx);
            const moveX = Math.cos(angle) * (minDistance - distance) / 2;
            const moveY = Math.sin(angle) * (minDistance - distance) / 2;

            // Move blobs apart
            newPositions[i].x -= moveX;
            newPositions[i].y -= moveY;
            newPositions[j].x += moveX;
            newPositions[j].y += moveY;

            // Swap velocities
            [newPositions[i].vx, newPositions[j].vx] = [newPositions[j].vx, newPositions[i].vx];
            [newPositions[i].vy, newPositions[j].vy] = [newPositions[j].vy, newPositions[i].vy];
          }
        }
      }

      return newPositions;
    });
  }, [windowSize]);

  useEffect(() => {
    const interval = setInterval(updateBlobPositions, 16);
    return () => clearInterval(interval);
  }, [updateBlobPositions]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;
      const xPos = (clientX - windowSize.width / 2) / (windowSize.width / 2);
      const yPos = (clientY - windowSize.height / 2) / (windowSize.height / 2);
      setMousePosition({ x: xPos, y: yPos });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [windowSize]);

  const handleStravaConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Initiating Strava connection...');
      console.log('Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        VITE_API_URL: import.meta.env.VITE_API_URL,
        VITE_STRAVA_CLIENT_ID: import.meta.env.VITE_STRAVA_CLIENT_ID
      });
      
      const response = await fetch('/api/auth/strava');
      console.log('Raw response:', response);
      
      if (!response.ok) {
        throw new Error(`Failed to connect to Strava: ${response.statusText} (${response.status})`);
      }
      
      const data = await response.json();
      console.log('Auth response data:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.authUrl) {
        console.log('Redirecting to Strava auth URL:', data.authUrl);
        window.location.href = data.authUrl;
      } else {
        throw new Error('Invalid response from server: missing authUrl');
      }
    } catch (error) {
      console.error('Strava connection error:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect with Strava');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <LoginPage 
            handleStravaConnect={handleStravaConnect}
            loading={loading}
            error={error}
            blobPositions={blobPositions}
            isAnimating={isAnimating}
            mousePosition={mousePosition}
            windowSize={windowSize}
          />
        } />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <div>
                <Navbar />
                <Dashboard />
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/activities" 
          element={
            <ProtectedRoute>
              <div>
                <Navbar />
                <Activities />
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/stats" 
          element={
            <ProtectedRoute>
              <div>
                <Navbar />
                <Stats />
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/coach" 
          element={
            <ProtectedRoute>
              <div>
                <Navbar />
                <Coach />
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/training" 
          element={
            <ProtectedRoute>
              <div>
                <Navbar />
                <Training />
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/goals" 
          element={
            <ProtectedRoute>
              <div>
                <Navbar />
                <Goals />
              </div>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App; 