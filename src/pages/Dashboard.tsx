import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useAuth } from '../context/AuthContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Activity {
  id: string;
  name: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date_local: string;
  type: string;
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
    className="stat-card"
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

const ActivityChart = ({ activities }: { activities: Activity[] }) => {
  // Get last 30 days of activities
  const last30Days = [...activities]
    .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime())
    .slice(-30);

  const data = {
    labels: last30Days.map(activity => 
      new Date(activity.start_date_local).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Distance (km)',
        data: last30Days.map(activity => activity.distance / 1000),
        fill: true,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(209, 213, 219)'
        }
      },
      title: {
        display: true,
        text: 'Last 30 Days Activity',
        color: 'rgb(209, 213, 219)',
        font: {
          size: 16
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgb(209, 213, 219)'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgb(209, 213, 219)'
        }
      }
    }
  };

  return (
    <div className="h-[400px]">
      <Line data={data} options={options} />
    </div>
  );
};

const RecentActivities = ({ activities }: { activities: Activity[] }) => {
  const lastFiveActivities = [...activities]
    .sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white mb-4">Recent Activities</h3>
      {lastFiveActivities.map(activity => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-4"
        >
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-white font-medium">{activity.name}</h4>
              <p className="text-gray-400 text-sm">
                {new Date(activity.start_date_local).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white">{(activity.distance / 1000).toFixed(2)} km</p>
              <p className="text-gray-400 text-sm">
                {Math.floor(activity.moving_time / 60)} mins
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { accessToken } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalDistance: 0,
    totalTime: 0,
    totalElevation: 0,
    activitiesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching activities...');
        
        // Add authorization header
        const response = await axios.get('/api/strava/activities', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        console.log('Activities received:', response.data.length);
        const activitiesData = response.data;
        setActivities(activitiesData);
        
        // Calculate stats
        const stats = activitiesData.reduce((acc: Stats, activity: Activity) => ({
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
        setError('Failed to load activities. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (accessToken) {
      fetchData();
    }
  }, [accessToken]);

  // Background blobs
  const blobs = [
    { color: 'bg-blue-500/20', delay: '' },
    { color: 'bg-purple-500/20', delay: 'animation-delay-2000' },
    { color: 'bg-orange-500/20', delay: 'animation-delay-4000' }
  ];

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-400">Loading your activities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Background Blobs */}
      <div className="blob-container">
        {blobs.map((blob, index) => (
          <div
            key={index}
            className={`blob ${blob.color} animate-blob ${blob.delay}`}
            style={{
              left: `${30 + index * 20}%`,
              top: `${20 + index * 20}%`,
              width: '500px',
              height: '500px',
              marginLeft: '-250px',
              marginTop: '-250px'
            }}
          />
        ))}
      </div>

      <div className="content-container">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

        {/* Activity Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-6"
          >
            <ActivityChart activities={activities} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-6"
          >
            <RecentActivities activities={activities} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 