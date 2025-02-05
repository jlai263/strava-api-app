import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { config } from '../utils/config';

const AnimatedSphere = () => (
  <Sphere args={[1, 32, 32]}>
    <meshStandardMaterial
      color="#ff5500"
      roughness={0.4}
      metalness={0.8}
    />
  </Sphere>
);

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const stravaAuthUrl = config.getStravaAuthUrl();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <AnimatedSphere />
          <OrbitControls
            enableZoom={false}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center p-8 bg-black/30 backdrop-blur-lg rounded-2xl shadow-xl"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold mb-6 bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent"
        >
          Strava Analytics
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-300 mb-8 max-w-md"
        >
          Get deeper insights into your training with AI-powered analytics
        </motion.p>

        <motion.a
          href={stravaAuthUrl}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center px-6 py-3 text-white bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg font-medium shadow-lg hover:from-orange-600 hover:to-pink-600 transition-all"
        >
          <svg
            className="w-5 h-5 mr-2"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.008 13.828h4.172" />
          </svg>
          Connect with Strava
        </motion.a>
      </motion.div>
    </div>
  );
};

export default Login; 