import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Line } from '@react-three/drei';
import axios from 'axios';
import { Line as ThreeLineType } from 'three';

interface Activity {
  id: string;
  name: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_latlng: [number, number];
  end_latlng: [number, number];
}

interface Stats {
  totalDistance: number;
  totalTime: number;
  totalElevation: number;
  activitiesCount: number;
}

const StatCard: React.FC<{ title: string; value: string; icon: string }> = ({ title, value, icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-black/30 backdrop-blur-md p-6 rounded-xl"
  >
    <div className="flex items-center space-x-4">
      <div className="p-3 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg">
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <h3 className="text-gray-400 text-sm">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  </motion.div>
);

const Globe = ({ activities }: { activities: Activity[] }) => {
  const routes = activities.map(activity => ({
    start: activity.start_latlng,
    end: activity.end_latlng
  }));

  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      {/* Earth */}
      <Sphere args={[1, 64, 64]}>
        <meshStandardMaterial
          color="#1a237e"
          metalness={0.8}
          roughness={0.5}
        />
      </Sphere>

      {/* Activity Routes */}
      {routes.map((route, index) => {
        if (!route.start || !route.end) return null;
        
        // Convert lat/lng to 3D coordinates
        const start = latLngToVector3(route.start[0], route.start[1]);
        const end = latLngToVector3(route.end[0], route.end[1]);
        
        return (
          <Line
            key={index}
            points={[start, end]}
            color="#ff5500"
            lineWidth={2}
          />
        );
      })}

      <OrbitControls
        enableZoom={true}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </Canvas>
  );
};

// Helper function to convert lat/lng to 3D coordinates
const latLngToVector3 = (lat: number, lng: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(Math.sin(phi) * Math.cos(theta));
  const z = Math.sin(phi) * Math.sin(theta);
  const y = Math.cos(phi);
  return [x, y, z];
};

const Dashboard = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalDistance: 0,
    totalTime: 0,
    totalElevation: 0,
    activitiesCount: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/activities');
        setActivities(response.data);
        
        // Calculate stats
        const stats = response.data.reduce((acc: Stats, activity: Activity) => ({
          totalDistance: acc.totalDistance + activity.distance,
          totalTime: acc.totalTime + activity.moving_time,
          totalElevation: acc.totalElevation + activity.total_elevation_gain,
          activitiesCount: acc.activitiesCount + 1
        }), {
          totalDistance: 0,
          totalTime: 0,
          totalElevation: 0,
          activitiesCount: 0
        });
        
        setStats(stats);
      } catch (error) {
        console.error('Error fetching activities:', error);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="min-h-screen pt-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Distance"
            value={`${(stats.totalDistance / 1000).toFixed(1)} km`}
            icon="🏃"
          />
          <StatCard
            title="Total Time"
            value={`${Math.floor(stats.totalTime / 3600)} hrs`}
            icon="⏱️"
          />
          <StatCard
            title="Total Elevation"
            value={`${stats.totalElevation.toFixed(0)} m`}
            icon="⛰️"
          />
          <StatCard
            title="Activities"
            value={stats.activitiesCount.toString()}
            icon="📊"
          />
        </div>

        {/* Globe Visualization */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="aspect-square max-h-[600px] rounded-2xl overflow-hidden bg-black/30 backdrop-blur-md"
        >
          <Globe activities={activities} />
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard; 