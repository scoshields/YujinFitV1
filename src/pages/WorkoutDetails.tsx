import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Save, Clock, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Exercise {
  name: string;
  target_sets: number;
  target_reps: string;
  sets: ExerciseSet[];
}

interface ExerciseSet {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

interface WorkoutData {
  id: string;
  title: string;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  date: string;
  exercises: Exercise[];
  completed: boolean;
}

export function WorkoutDetails() {
  const { workoutId } = useParams();
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkout = async () => {
      if (!workoutId) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data: workoutData, error: workoutError } = await supabase
          .from('daily_workouts')
          .select(`
            *,
            exercises (
              id,
              name,
              target_sets,
              target_reps,
              body_part,
              exercise_sets (
                id,
                set_number,
                weight,
                reps,
                completed
              )
            )
          `)
          .eq('id', workoutId)
          .single();

        if (workoutError) throw workoutError;
        if (!workoutData) throw new Error('Workout not found');

        const formattedExercises = workoutData.exercises.map(ex => ({
          name: ex.name,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
          sets: ex.exercise_sets.map(set => ({
            setNumber: set.set_number,
            weight: set.weight,
            reps: set.reps,
            completed: set.completed
          }))
        }));

        setWorkout({
          id: workoutData.id,
          title: workoutData.title,
          duration: `${workoutData.duration} min`,
          difficulty: workoutData.difficulty,
          date: new Date(workoutData.date).toLocaleDateString(),
          exercises: formattedExercises,
          completed: workoutData.completed
        });

        setExercises(formattedExercises);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workout');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkout();
  }, [workoutId]);

  const handleSetUpdate = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: number) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].sets[setIndex][field] = value;
    setExercises(newExercises);
  };

  const toggleSet = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].sets[setIndex].completed = 
      !newExercises[exerciseIndex].sets[setIndex].completed;
    setExercises(newExercises);
  };

  const handleSave = () => {
    // TODO: Save workout progress to backend
    console.log('Saving workout progress:', {
      workoutId,
      exercises: exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets
      }))
    });
  };

  const difficultyColors = {
    easy: 'text-green-400',
    medium: 'text-orange-400',
    hard: 'text-red-400'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-400">Loading workout details...</div>
        </div>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="min-h-screen bg-black pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-red-400">{error || 'Workout not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-4 mb-8">
          <Link 
            to="/workouts"
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Workouts</span>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{workout.title}</h1>
            <div className="flex items-center space-x-4 text-gray-400">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{workout?.duration}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Trophy className={`w-4 h-4 ${difficultyColors[workout?.difficulty || 'medium']}`} />
                <span className="capitalize">{workout?.difficulty}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="mt-4 md:mt-0 flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-green-400 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Save className="w-5 h-5" />
            <span>Save Progress</span>
          </button>
        </div>

        <div className="space-y-6">
          {exercises.map((exercise, index) => (
            <div
              key={index} 
              className="p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-blue-500/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Dumbbell className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{exercise.name}</h3>
                    <p className="text-gray-400">
                      Target: {exercise.target_sets} sets × {exercise.target_reps} reps
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                {Array.from({ length: exercise.target_sets }, (_, i) => ({
                  setNumber: i + 1,
                  weight: exercise.sets?.[i]?.weight || 0,
                  reps: exercise.sets?.[i]?.reps || 0,
                  completed: exercise.sets?.[i]?.completed || false
                })).map((set, setIndex) => (
                  <div
                    key={setIndex}
                    className={`p-4 rounded-lg border transition-colors ${
                      set.completed
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-blue-500/20 bg-white/5'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-400">Set {set.setNumber}</span>
                        <div className="flex items-center space-x-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                              Weight (lbs)
                            </label>
                            <input
                              type="number"
                              value={set.weight || ''}
                              onChange={(e) => handleSetUpdate(
                                index,
                                setIndex,
                                'weight',
                                parseInt(e.target.value) || 0
                              )}
                              className="w-24 px-3 py-2 bg-white/5 border border-blue-500/20 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                              Reps
                            </label>
                            <input
                              type="number"
                              value={set.reps || ''}
                              onChange={(e) => handleSetUpdate(
                                index,
                                setIndex,
                                'reps',
                                parseInt(e.target.value) || 0
                              )}
                              className="w-24 px-3 py-2 bg-white/5 border border-blue-500/20 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSet(index, setIndex)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          set.completed ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                        }`}
                      >
                        {set.completed ? 'Completed' : 'Mark Complete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}