import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-strava-orange to-pink-500 bg-clip-text text-transparent">
          Strava Visualization
        </h1>
        <div className="bg-black/30 backdrop-blur-md p-8 rounded-xl">
          <p className="text-xl text-center text-gray-300">
            Welcome to your Strava visualization dashboard!
          </p>
        </div>
      </div>
    </div>
  );
}

export default App; 