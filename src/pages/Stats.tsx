import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Activity {
  id: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date_local: string;
  type: string;
}

const Stats = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await axios.get(`/api/stats?range=${timeRange}`);
        setActivities(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [timeRange]);

  const prepareChartData = () => {
    const sortedActivities = [...activities].sort(
      (a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );

    const labels = sortedActivities.map(activity => {
      const date = new Date(activity.start_date_local);
      return timeRange === 'year'
        ? date.toLocaleDateString('en-US', { month: 'short' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const distances = sortedActivities.map(activity => activity.distance / 1000);
    const elevations = sortedActivities.map(activity => activity.total_elevation_gain);

    return { labels, distances, elevations };
  };

  const { labels, distances, elevations } = prepareChartData();

  const distanceData = {
    labels,
    datasets: [
      {
        label: 'Distance (km)',
        data: distances,
        fill: true,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const elevationData = {
    labels,
    datasets: [
      {
        label: 'Elevation (m)',
        data: elevations,
        backgroundColor: '#ec4899',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#fff',
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#fff',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#fff',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Time Range Selector */}
        <div className="mb-8 flex justify-center space-x-4">
          {(['week', 'month', 'year'] as const).map(range => (
            <motion.button
              key={range}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-2 rounded-lg font-medium ${
                timeRange === range
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                  : 'bg-black/30 text-gray-300 hover:bg-black/40'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </motion.button>
          ))}
        </div>

        {/* Charts */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/30 backdrop-blur-md p-6 rounded-xl"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Distance Over Time</h2>
            <Line data={distanceData} options={chartOptions} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/30 backdrop-blur-md p-6 rounded-xl"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Elevation Gain</h2>
            <Bar data={elevationData} options={chartOptions} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Stats; 