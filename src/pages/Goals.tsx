import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Goal {
  id: string;
  name: string;
  target: string;
  deadline: string;
  progress: number;
  type: 'Distance' | 'Time' | 'Race';
  status: 'In Progress' | 'Completed' | 'Missed';
}

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      name: 'Run a Sub-20 5K',
      target: '19:59',
      deadline: '2024-06-30',
      progress: 65,
      type: 'Time',
      status: 'In Progress'
    },
    {
      id: '2',
      name: 'Complete First Marathon',
      target: '42.2 km',
      deadline: '2024-10-15',
      progress: 30,
      type: 'Race',
      status: 'In Progress'
    },
    {
      id: '3',
      name: 'Monthly Distance Goal',
      target: '200 km',
      deadline: '2024-01-31',
      progress: 100,
      type: 'Distance',
      status: 'Completed'
    }
  ]);

  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'Completed': return 'bg-green-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Missed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: Goal['type']) => {
    switch (type) {
      case 'Distance': return '📏';
      case 'Time': return '⏱️';
      case 'Race': return '🏃';
      default: return '🎯';
    }
  };

  return (
    <div className="page-container">
      <div className="content-container">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Training Goals</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg"
          >
            Add New Goal
          </motion.button>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-2xl mb-2">{getTypeIcon(goal.type)}</span>
                  <h3 className="text-xl font-semibold text-white mt-2">{goal.name}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs text-white ${getStatusColor(goal.status)}`}>
                  {goal.status}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Target</p>
                  <p className="text-white font-medium">{goal.target}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Deadline</p>
                  <p className="text-white font-medium">
                    {new Date(goal.deadline).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white">{goal.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-orange-500 to-pink-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Goals; 