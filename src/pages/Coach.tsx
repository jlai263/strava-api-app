import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useActivities, Activity } from '../context/ActivitiesContext';
import { calculateTrainingLoad, calculateZoneDistribution } from '../utils/trainingMetrics';
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

const Coach = () => {
  const { activities, loading, error } = useActivities();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [trainingLoads, setTrainingLoads] = useState({
    acute: 0,
    chronic: 0,
    ratio: 0
  });
  const [zoneDistribution, setZoneDistribution] = useState({
    zone1: 0,
    zone2: 0,
    zone3: 0,
    zone4: 0,
    zone5: 0
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Calculate metrics when activities change
  useEffect(() => {
    if (activities.length > 0) {
      // Filter for running activities only
      const runningActivities = activities.filter(activity => activity.type === 'Run');
      
      if (runningActivities.length > 0) {
        const loads = calculateTrainingLoad(runningActivities);
        const zones = calculateZoneDistribution(runningActivities);

        setTrainingLoads(loads);
        setZoneDistribution(zones);
      }
    }
  }, [activities]);

  const getAnalysis = async () => {
    try {
      setAnalyzing(true);
      setAnalysisError(null);
      
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activities,
          trainingLoad: trainingLoads,
          zoneDistribution
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI analysis');
      }

      const data = await response.json();
      setAnalysis(data.choices[0].message.content);
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError('Failed to get AI analysis. Please try again later.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-400">Loading activities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const trainingLoadData = {
    labels: Object.keys(trainingLoads),
    datasets: [
      {
        label: 'Acute Load (Daily)',
        data: Object.values(trainingLoads),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Chronic Load (Weekly)',
        data: Object.values(trainingLoads),
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
      data: Object.values(zoneDistribution),
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

  return (
    <div className="page-container">
      <div className="content-container">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">AI Coach Analysis</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={getAnalysis}
            disabled={analyzing}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 disabled:opacity-50"
          >
            {analyzing ? 'Analyzing...' : 'Get Training Analysis'}
          </motion.button>
        </div>

        {analysisError && (
          <div className="mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {analysisError}
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
                  {Math.round(trainingLoads.acute)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Chronic Load</p>
                <p className="text-xl font-semibold text-white">
                  {Math.round(trainingLoads.chronic)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">A:C Ratio</p>
                <p className={`text-xl font-semibold ${
                  trainingLoads.ratio > 1.5 ? 'text-red-500' : trainingLoads.ratio < 0.8 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {trainingLoads.ratio.toFixed(2)}
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