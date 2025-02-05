import React from 'react';
import { STRAVA_AUTH_ENDPOINT } from './config';

function App() {
  const handleStravaConnect = async () => {
    try {
      const response = await fetch(STRAVA_AUTH_ENDPOINT);
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Failed to initiate Strava auth:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-6">Strava Analytics</h1>
      <p className="text-lg mb-8">Get deeper insights into your training with AI-powered analytics</p>
      <button
        onClick={handleStravaConnect}
        className="bg-[#fc4c02] hover:bg-[#e34402] text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
      >
        Connect with Strava
      </button>
    </div>
  );
}

export default App; 