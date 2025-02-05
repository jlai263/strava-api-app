import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  workouts: {
    day: string;
    description: string;
    type: string;
    duration: string;
  }[];
}

const Training = () => {
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const mockTrainingPlans: TrainingPlan[] = [
    {
      id: '1',
      name: '5K Training Plan',
      description: 'A 8-week plan to improve your 5K time',
      duration: '8 weeks',
      difficulty: 'Intermediate',
      workouts: [
        { day: 'Monday', description: 'Easy Recovery Run', type: 'Recovery', duration: '30-40 min' },
        { day: 'Tuesday', description: '8x400m Intervals', type: 'Speed', duration: '45-60 min' },
        { day: 'Wednesday', description: 'Rest or Cross-Training', type: 'Rest', duration: '0-30 min' },
        { day: 'Thursday', description: 'Tempo Run', type: 'Tempo', duration: '40-50 min' },
        { day: 'Friday', description: 'Easy Run', type: 'Recovery', duration: '30 min' },
        { day: 'Saturday', description: 'Long Run', type: 'Endurance', duration: '60-75 min' },
        { day: 'Sunday', description: 'Rest Day', type: 'Rest', duration: '0 min' }
      ]
    }
  ];

  const renderWorkoutCard = (workout: TrainingPlan['workouts'][0]) => {
    const getWorkoutColor = (type: string) => {
      switch (type.toLowerCase()) {
        case 'speed': return 'from-red-500 to-pink-500';
        case 'tempo': return 'from-orange-500 to-red-500';
        case 'endurance': return 'from-blue-500 to-indigo-500';
        case 'recovery': return 'from-green-500 to-emerald-500';
        default: return 'from-gray-500 to-slate-500';
      }
    };

    return (
      <motion.div
        key={workout.day}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/30 backdrop-blur-md p-4 rounded-xl"
      >
        <div className={`w-full h-2 rounded-full bg-gradient-to-r ${getWorkoutColor(workout.type)} mb-3`} />
        <h3 className="text-lg font-semibold text-white">{workout.day}</h3>
        <p className="text-gray-300">{workout.description}</p>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-400">{workout.type}</span>
          <span className="text-gray-400">{workout.duration}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          {/* Training Plans Sidebar */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6"
            >
              <h2 className="text-xl font-semibold text-white mb-4">Training Plans</h2>
              <div className="space-y-3">
                {mockTrainingPlans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedPlan?.id === plan.id
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                        : 'glass text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-sm opacity-75">{plan.duration} • {plan.difficulty}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Workout Schedule */}
          <div className="md:col-span-5">
            {selectedPlan ? (
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6"
                >
                  <h2 className="text-2xl font-semibold text-white mb-2">{selectedPlan.name}</h2>
                  <p className="text-gray-300 mb-4">{selectedPlan.description}</p>
                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 glass rounded-full text-sm text-gray-300">
                      {selectedPlan.duration}
                    </span>
                    <span className="px-3 py-1 glass rounded-full text-sm text-gray-300">
                      {selectedPlan.difficulty}
                    </span>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedPlan.workouts.map(renderWorkoutCard)}
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-6 text-center"
              >
                <p className="text-gray-300">Select a training plan to view the schedule</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Training; 