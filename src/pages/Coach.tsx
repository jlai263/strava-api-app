import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
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
  Filler,
  ArcElement
} from 'chart.js';
import { useAuth } from '../context/AuthContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface Activity {
  id: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date_local: string;
  type: string;
  average_heartrate: number;
}

interface TrainingLoad {
  acute: number;
  chronic: number;
  ratio: number;
  date: string;
}

interface ZoneDistribution {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
}

const Coach = () => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [trainingLoads, setTrainingLoads] = useState<TrainingLoad[]>([]);
  const [zoneDistribution, setZoneDistribution] = useState<ZoneDistribution>({
    zone1: 0,
    zone2: 0,
    zone3: 0,
    zone4: 0,
    zone5: 0
  });

  // Calculate training load from activities
  const calculateTrainingLoad = (activities: Activity[]) => {
    const loads: TrainingLoad[] = [];
    const now = new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Sort activities by date
    const sortedActivities = [...activities]
      .filter(activity => 
        activity.type === 'Run' && // Only include runs
        new Date(activity.start_date_local) >= twoWeeksAgo
      )
      .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime());

    // Create array of dates for the last 14 days
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Find activities for this day
      const dayActivities = sortedActivities.filter(
        activity => activity.start_date_local.split('T')[0] === dateStr
      );

      // Calculate acute (daily) load
      const acute = dayActivities.reduce((sum, activity) => {
        // Training Impulse (TRIMP) calculation
        const duration = activity.moving_time / 3600; // hours
        const intensity = activity.average_heartrate 
          ? (activity.average_heartrate - 60) / (180 - 60) // Normalize HR between rest (60) and max (180)
          : 0.75; // Default intensity if no HR data
        return sum + (duration * intensity * 100); // Scale for readability
      }, 0);

      // Get last 7 days of activities for chronic load
      const sevenDaysAgo = new Date(date);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const last7DaysActivities = sortedActivities.filter(activity => {
        const activityDate = new Date(activity.start_date_local);
        return activityDate >= sevenDaysAgo && activityDate <= date;
      });

      // Calculate chronic (7-day average) load
      const chronic = last7DaysActivities.reduce((sum, activity) => {
        const duration = activity.moving_time / 3600;
        const intensity = activity.average_heartrate 
          ? (activity.average_heartrate - 60) / (180 - 60)
          : 0.75;
        return sum + (duration * intensity * 100 / 7); // Daily average
      }, 0);

      loads.push({
        date: dateStr,
        acute: Math.round(acute),
        chronic: Math.round(chronic),
        ratio: chronic > 0 ? Number((acute / chronic).toFixed(2)) : 0
      });
    }

    return loads;
  };

  // Calculate zone distribution from activities
  const calculateZoneDistribution = (activities: Activity[]) => {
    const zones = { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 };
    let totalTime = 0;

    // Filter for running activities only
    const runActivities = activities.filter(activity => activity.type === 'Run');

    runActivities.forEach(activity => {
      if (!activity.average_heartrate) return;

      const duration = activity.moving_time / 60; // minutes
      totalTime += duration;

      // Using standard heart rate zones based on max HR of 180
      const maxHR = 180;
      const hr = activity.average_heartrate;
      
      // Zone calculations based on % of max HR
      if (hr <= maxHR * 0.6) zones.zone1 += duration;         // < 60% HRmax
      else if (hr <= maxHR * 0.7) zones.zone2 += duration;    // 60-70% HRmax
      else if (hr <= maxHR * 0.8) zones.zone3 += duration;    // 70-80% HRmax
      else if (hr <= maxHR * 0.9) zones.zone4 += duration;    // 80-90% HRmax
      else zones.zone5 += duration;                           // > 90% HRmax
    });

    // Convert to percentages
    if (totalTime > 0) {
      return {
        zone1: Math.round((zones.zone1 / totalTime) * 100),
        zone2: Math.round((zones.zone2 / totalTime) * 100),
        zone3: Math.round((zones.zone3 / totalTime) * 100),
        zone4: Math.round((zones.zone4 / totalTime) * 100),
        zone5: Math.round((zones.zone5 / totalTime) * 100)
      };
    }

    return { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 };
  };

  // Fetch activities and calculate metrics
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching activities...');
        const response = await axios.get('/api/strava/activities', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const activitiesData = response.data;
        console.log('Activities received:', activitiesData.length);
        
        // Filter for running activities only
        const runningActivities = activitiesData.filter(activity => activity.type === 'Run');
        setActivities(runningActivities);

        // Calculate metrics only if we have running activities
        if (runningActivities.length > 0) {
          const loads = calculateTrainingLoad(runningActivities);
          const zones = calculateZoneDistribution(runningActivities);

          setTrainingLoads(loads);
          setZoneDistribution(zones);
        } else {
          setError('No running activities found in the data.');
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
        setError('Failed to load activities. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchActivities();
    }
  }, [accessToken]);

  const trainingLoadData = {
    labels: trainingLoads.map(load => load.date),
    datasets: [
      {
        label: 'Acute Load (Daily)',
        data: trainingLoads.map(load => load.acute),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Chronic Load (Weekly)',
        data: trainingLoads.map(load => load.chronic),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const zoneDistributionData = {
    labels: [
      'Zone 1 - Recovery (50-60% HRmax)',
      'Zone 2 - Aerobic (60-70% HRmax)',
      'Zone 3 - Tempo (70-80% HRmax)',
      'Zone 4 - Threshold (80-90% HRmax)',
      'Zone 5 - VO2 Max (90-100% HRmax)'
    ],
    datasets: [{
      data: [
        zoneDistribution.zone1,
        zoneDistribution.zone2,
        zoneDistribution.zone3,
        zoneDistribution.zone4,
        zoneDistribution.zone5
      ],
      backgroundColor: [
        '#22c55e', // Green for Zone 1
        '#3b82f6', // Blue for Zone 2
        '#f59e0b', // Yellow for Zone 3
        '#f97316', // Orange for Zone 4
        '#ef4444'  // Red for Zone 5
      ],
      borderWidth: 0
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(209, 213, 219)'
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

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgb(209, 213, 219)',
          padding: 20,
          font: {
            size: 12
          }
        }
      }
    }
  };

  const requestAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we have the required data
      if (!activities || activities.length === 0) {
        setError('No activities available for analysis');
        return;
      }

      if (!trainingLoads || trainingLoads.length === 0) {
        setError('No training load data available for analysis');
        return;
      }

      // Get the current training load
      const currentLoad = trainingLoads[trainingLoads.length - 1];

      // Ensure we have valid zone distribution data
      const validZoneDistribution = {
        zone1: zoneDistribution?.zone1 || 0,
        zone2: zoneDistribution?.zone2 || 0,
        zone3: zoneDistribution?.zone3 || 0,
        zone4: zoneDistribution?.zone4 || 0,
        zone5: zoneDistribution?.zone5 || 0,
      };

      // Format activities data, ensuring all required fields are present
      const formattedActivities = activities.map(activity => ({
        date: activity.start_date_local,
        distance: activity.distance || 0,
        duration: activity.moving_time || 0,
        type: activity.type,
        heartrate: activity.average_heartrate || null
      }));

      const analysisData = {
        activities: formattedActivities,
        trainingLoad: {
          acute: currentLoad.acute || 0,
          chronic: currentLoad.chronic || 0,
          ratio: currentLoad.ratio || 0
        },
        zoneDistribution: validZoneDistribution
      };

      console.log('Sending analysis request with data:', analysisData);

      const response = await axios.post('/api/ai/analyze', analysisData);
      
      if (response.data?.choices?.[0]?.message?.content) {
        setAnalysis(response.data.choices[0].message.content);
      } else {
        setAnalysis(response.data.content || response.data);
      }
    } catch (error) {
      console.error('Failed to get AI analysis:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        setError(`Failed to get AI analysis: ${errorMessage}`);
      } else {
        setError('Failed to get AI analysis. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="content-container">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">AI Coach Analysis</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={requestAnalysis}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Get Training Analysis'}
          </motion.button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Training Load Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Training Load</h2>
            <div className="h-[300px]">
              <Line options={chartOptions} data={trainingLoadData} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Acute Load</p>
                <p className="text-xl font-semibold text-white">
                  {Math.round(trainingLoads[trainingLoads.length - 1]?.acute || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Chronic Load</p>
                <p className="text-xl font-semibold text-white">
                  {Math.round(trainingLoads[trainingLoads.length - 1]?.chronic || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">A:C Ratio</p>
                <p className={`text-xl font-semibold ${
                  (trainingLoads[trainingLoads.length - 1]?.ratio || 0) > 1.5 
                    ? 'text-red-500' 
                    : (trainingLoads[trainingLoads.length - 1]?.ratio || 0) < 0.8
                    ? 'text-yellow-500'
                    : 'text-green-500'
                }`}>
                  {(trainingLoads[trainingLoads.length - 1]?.ratio || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Training Zones Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Training Zones Distribution</h2>
            <div className="h-[300px]">
              <Doughnut options={doughnutOptions} data={zoneDistributionData} />
            </div>
          </motion.div>
        </div>

        {/* AI Analysis */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">AI Analysis</h2>
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-gray-300 font-mono text-sm">
                {analysis}
              </pre>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Coach; 