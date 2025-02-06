import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useActivities } from '../context/ActivitiesContext';
import type { Activity } from '../context/ActivitiesContext';
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
  ArcElement,
  TooltipItem,
  ChartType
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

const generateLabels = (chart: ChartJS<ChartType, unknown[], unknown>) => {
  const data = chart.data;
  if (data.labels?.length && data.datasets.length) {
    return data.labels.map((label, i) => {
      const backgroundColor = Array.isArray(data.datasets[0].backgroundColor) 
        ? data.datasets[0].backgroundColor[i]
        : data.datasets[0].backgroundColor;
      return {
        text: `${label} (${Math.round(data.datasets[0].data[i] as number)}%)`,
        fillStyle: backgroundColor,
        hidden: false,
        lineCap: undefined,
        lineDash: undefined,
        lineDashOffset: undefined,
        lineJoin: undefined,
        lineWidth: 0,
        strokeStyle: undefined,
        pointStyle: undefined,
        rotation: undefined,
      };
    });
  }
  return [];
};

const tooltipLabelCallback = (tooltipItem: TooltipItem<ChartType>) => {
  const label = tooltipItem.label?.split(' - ')[0] || '';
  const value = tooltipItem.raw as number;
  return `${label}: ${Math.round(value)}%`;
};

interface ChartContext {
  raw: number;
  label?: string;
}

const Coach = () => {
  const { activities, isLoading, error } = useActivities();
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

  useEffect(() => {
    if (activities && activities.length > 0) {
      // Calculate training loads
      const loads = calculateTrainingLoad(activities);
      setTrainingLoads({
        acute: loads.acute,
        chronic: loads.chronic,
        ratio: loads.chronic > 0 ? loads.acute / loads.chronic : 0
      });

      // Calculate zone distribution
      const zones = calculateZoneDistribution(activities);
      setZoneDistribution(zones);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error loading activities: {error}</div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">No activities found. Start training to see your stats!</div>
      </div>
    );
  }

  // Prepare chart data
  const trainingLoadData = {
    labels: ['7-Day Load', '28-Day Load'],
    datasets: [
      {
        label: 'Training Load',
        data: [trainingLoads.acute, trainingLoads.chronic],
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)', // blue-500 with opacity
          'rgba(16, 185, 129, 0.5)', // green-500 with opacity
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const zoneDistributionData = {
    labels: [
      'Zone 1 - Recovery',
      'Zone 2 - Aerobic Base',
      'Zone 3 - Aerobic Power',
      'Zone 4 - Threshold',
      'Zone 5 - VO2 Max',
    ],
    datasets: [{
      data: [
        zoneDistribution.zone1,
        zoneDistribution.zone2,
        zoneDistribution.zone3,
        zoneDistribution.zone4,
        zoneDistribution.zone5,
      ],
      backgroundColor: [
        'rgba(156, 163, 175, 0.8)', // gray-400
        'rgba(96, 165, 250, 0.8)',  // blue-400
        'rgba(74, 222, 128, 0.8)',  // green-400
        'rgba(250, 204, 21, 0.8)',  // yellow-400
        'rgba(248, 113, 113, 0.8)', // red-400
      ],
      borderColor: [
        'rgb(156, 163, 175)',
        'rgb(96, 165, 250)',
        'rgb(74, 222, 128)',
        'rgb(250, 204, 21)',
        'rgb(248, 113, 113)',
      ],
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgb(209, 213, 219)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgb(209, 213, 219)',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgb(255, 255, 255)',
        bodyColor: 'rgb(209, 213, 219)',
        padding: 12,
        displayColors: false,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgb(209, 213, 219)',
          padding: 20,
          font: {
            size: 12
          },
          generateLabels: generateLabels
        }
      },
      tooltip: {
        callbacks: {
          label: tooltipLabelCallback
        }
      }
    }
  };

  // Add training load line graph data
  const trainingLoadLineData = {
    labels: [...activities]
      .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime())
      .map(activity => new Date(activity.start_date_local).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'UTC'
      })),
    datasets: [
      {
        label: 'Acute Load (7-day)',
        data: [...activities]
          .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime())
          .map((_, index, array) => {
            const currentDate = new Date(array[index].start_date_local);
            const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            const activitiesInRange = array.filter(activity => {
              const activityDate = new Date(activity.start_date_local);
              return activityDate >= sevenDaysAgo && activityDate <= currentDate;
            });
            return calculateTrainingLoad(activitiesInRange).acute;
          }),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: false,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Chronic Load (28-day)',
        data: [...activities]
          .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime())
          .map((_, index, array) => {
            const currentDate = new Date(array[index].start_date_local);
            const twentyEightDaysAgo = new Date(currentDate.getTime() - 28 * 24 * 60 * 60 * 1000);
            const activitiesInRange = array.filter(activity => {
              const activityDate = new Date(activity.start_date_local);
              return activityDate >= twentyEightDaysAgo && activityDate <= currentDate;
            });
            return calculateTrainingLoad(activitiesInRange).chronic;
          }),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: false,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'A:C Ratio',
        data: [...activities]
          .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime())
          .map((_, index, array) => {
            const currentDate = new Date(array[index].start_date_local);
            const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twentyEightDaysAgo = new Date(currentDate.getTime() - 28 * 24 * 60 * 60 * 1000);
            
            const acuteActivities = array.filter(activity => {
              const activityDate = new Date(activity.start_date_local);
              return activityDate >= sevenDaysAgo && activityDate <= currentDate;
            });
            
            const chronicActivities = array.filter(activity => {
              const activityDate = new Date(activity.start_date_local);
              return activityDate >= twentyEightDaysAgo && activityDate <= currentDate;
            });
            
            const acute = calculateTrainingLoad(acuteActivities).acute;
            const chronic = calculateTrainingLoad(chronicActivities).chronic;
            return chronic > 0 ? Number((acute / chronic).toFixed(2)) : 0;
          }),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const trainingLoadChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgb(209, 213, 219)',
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 20,
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgb(209, 213, 219)',
        },
        title: {
          display: true,
          text: 'Training Load',
          color: 'rgb(209, 213, 219)',
        },
        min: 0,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'rgb(209, 213, 219)',
        },
        title: {
          display: true,
          text: 'A:C Ratio',
          color: 'rgb(209, 213, 219)',
        },
        min: 0,
        suggestedMax: 2.0,
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(209, 213, 219)',
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
  };

  // Update the heart rate zone chart options
  const zoneChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgb(255, 255, 255)',
          padding: 20,
          font: {
            size: 12
          },
          generateLabels: generateLabels
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgb(255, 255, 255)',
        bodyColor: 'rgb(255, 255, 255)',
        callbacks: {
          label: tooltipLabelCallback
        }
      }
    }
  };

  const zoneDistributionOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgb(255, 255, 255)',
          generateLabels: generateLabels
        }
      },
      title: {
        display: true,
        text: 'Zone Distribution',
        color: 'rgb(255, 255, 255)',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: tooltipLabelCallback
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

        {/* Training Load Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Training Load</h2>
            <div className="h-[400px]">
              <Line options={trainingLoadChartOptions} data={trainingLoadLineData} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-gray-300 text-sm">7-Day Load</p>
                <p className="text-xl font-semibold text-white">
                  {Math.round(trainingLoads.acute)}
                </p>
                <p className="text-gray-400 text-xs">Acute Training Load</p>
              </div>
              <div className="text-center">
                <p className="text-gray-300 text-sm">28-Day Load</p>
                <p className="text-xl font-semibold text-white">
                  {Math.round(trainingLoads.chronic)}
                </p>
                <p className="text-gray-400 text-xs">Chronic Training Load</p>
              </div>
              <div className="text-center">
                <p className="text-gray-300 text-sm">A:C Ratio</p>
                <p className={`text-xl font-semibold ${
                  trainingLoads.ratio > 1.5 ? 'text-red-500' :
                  trainingLoads.ratio < 0.8 ? 'text-yellow-500' :
                  'text-green-500'
                }`}>
                  {trainingLoads.ratio.toFixed(2)}
                </p>
                <p className="text-gray-400 text-xs">
                  {trainingLoads.ratio > 1.5 ? 'High Risk' :
                   trainingLoads.ratio < 0.8 ? 'Detraining' :
                   'Optimal Range'}
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-300">
                <span className="font-medium">Training Load Guide:</span>
                <br />
                • Acute Load (7-day): Recent training stress
                <br />
                • Chronic Load (28-day): Long-term training adaptation
                <br />
                • A:C Ratio: Values between 0.8-1.5 indicate optimal training load
                <br />
                • Above 1.5: High risk of overtraining
                <br />
                • Below 0.8: Potential detraining
              </p>
            </div>
          </motion.div>

          {/* Heart Rate Zone Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Heart Rate Zone Distribution</h2>
            <div className="h-[300px]">
              <Doughnut options={zoneChartOptions} data={zoneDistributionData} />
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {Object.entries(zoneDistribution).map(([zone, percentage], index) => (
                <div key={zone} className="text-center">
                  <div className={`w-full h-2 rounded-full mb-2 ${
                    index === 0 ? 'bg-gray-400' :
                    index === 1 ? 'bg-blue-400' :
                    index === 2 ? 'bg-green-400' :
                    index === 3 ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`} />
                  <p className="text-sm font-medium text-gray-300">Zone {index + 1}</p>
                  <p className="text-xs text-gray-400">{percentage.toFixed(1)}%</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-300">
                <span className="font-medium">Heart Rate Zones:</span>
                <br />
                • Zone 1 (50-60%): Recovery/Easy
                <br />
                • Zone 2 (60-70%): Aerobic Base
                <br />
                • Zone 3 (70-80%): Aerobic Power
                <br />
                • Zone 4 (80-90%): Lactate Threshold
                <br />
                • Zone 5 (90-100%): VO2 Max
              </p>
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