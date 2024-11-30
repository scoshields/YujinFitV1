import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Dumbbell, TrendingUp, Target, Award, Calendar } from 'lucide-react';
import { WeeklyProgress } from '../components/partners/WeeklyProgress';
import { ActivityTracker } from '../components/partners/ActivityTracker';

interface ExerciseComparison {
  name: string;
  userWeight: number;
  partnerWeight: number;
  date: string;
}

const SAMPLE_EXERCISES: ExerciseComparison[] = [
  { name: 'Bench Press', userWeight: 185, partnerWeight: 175, date: '2024-03-18' },
  { name: 'Squats', userWeight: 225, partnerWeight: 235, date: '2024-03-19' },
  { name: 'Deadlift', userWeight: 275, partnerWeight: 265, date: '2024-03-20' },
];

export function PartnerComparison() {
  const { partnerId } = useParams();
  
  // TODO: Fetch actual partner data based on partnerId
  const partnerData = {
    name: 'Alex Chen',
    weeklyWorkouts: 3,
    totalWeight: 2200,
    completionRate: 75,
    streak: 4,
  };

  const userData = {
    weeklyWorkouts: 4,
    totalWeight: 2450,
    completionRate: 85,
    streak: 5,
  };

  const stats = [
    { 
      icon: <Dumbbell className="w-6 h-6 text-blue-500" />,
      label: 'Weekly Workouts',
      user: userData.weeklyWorkouts,
      partner: partnerData.weeklyWorkouts
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-green-400" />,
      label: 'Total Weight (lbs)',
      user: userData.totalWeight,
      partner: partnerData.totalWeight
    },
    {
      icon: <Target className="w-6 h-6 text-orange-400" />,
      label: 'Completion Rate',
      user: `${userData.completionRate}%`,
      partner: `${partnerData.completionRate}%`
    },
    {
      icon: <Award className="w-6 h-6 text-purple-400" />,
      label: 'Current Streak',
      user: userData.streak,
      partner: partnerData.streak
    }
  ];

  return (
    <div className="min-h-screen bg-black pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-4 mb-8">
          <Link 
            to="/partners"
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Partners</span>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Progress with {partnerData.name}</h1>
            <p className="text-gray-400">Compare your workout progress and stay motivated together</p>
          </div>
        </div>

        <div className="mb-12">
          <ActivityTracker partnerId={partnerId || ''} partnerName={partnerData.name} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-blue-500/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-white/5 rounded-lg">
                  {stat.icon}
                </div>
                <h3 className="text-lg font-medium text-white">{stat.label}</h3>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-400 mb-1">You</p>
                  <p className="text-2xl font-bold text-white">{stat.user}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1">{partnerData.name}</p>
                  <p className="text-2xl font-bold text-white">{stat.partner}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-blue-500/10">
            <h2 className="text-xl font-semibold text-white mb-6">Weekly Progress</h2>
            <WeeklyProgress 
              userData={[65, 72, 85, 90]} 
              partnerData={[70, 75, 80, 85]} 
            />
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-blue-500/10">
            <h2 className="text-xl font-semibold text-white mb-6">Recent Exercise Comparisons</h2>
            <div className="space-y-4">
              {SAMPLE_EXERCISES.map((exercise, index) => (
                <div key={index} className="p-4 bg-white/5 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-white">{exercise.name}</h3>
                    <span className="text-sm text-gray-400">
                      <Calendar className="w-4 h-4 inline-block mr-1" />
                      {new Date(exercise.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-400">You</p>
                      <p className="text-xl font-bold text-white">{exercise.userWeight} lbs</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{partnerData.name}</p>
                      <p className="text-xl font-bold text-white">{exercise.partnerWeight} lbs</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}