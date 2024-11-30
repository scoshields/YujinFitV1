import { supabase } from '../lib/supabase';
import type { WorkoutExercise, WorkoutStats } from '../types/workout';

export async function getWorkoutStats(): Promise<WorkoutStats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get all workouts for the current week
  const { data: workouts, error: workoutsError } = await supabase
    .from('daily_workouts')
    .select(`
      *,
      exercises (
        id,
        exercise_sets (
          completed
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('is_shared', false);

  if (workoutsError) throw workoutsError;

  const totalWorkouts = workouts?.length || 0;
  const completedWorkouts = workouts?.filter(w => w.completed).length || 0;

  const exerciseCompletion = workouts?.reduce((acc, workout) => {
    const totalSets = workout.exercises?.reduce((sets, ex) => 
      sets + (ex.exercise_sets?.length || 0), 0) || 0;
    const completedSets = workout.exercises?.reduce((sets, ex) => 
      sets + (ex.exercise_sets?.filter(set => set.completed)?.length || 0), 0) || 0;
    return {
      total: acc.total + totalSets,
      completed: acc.completed + completedSets
    };
  }, { total: 0, completed: 0 });

  // Get partner's stats from yesterday
  // Get partner data
  const { data: partnerRelation, error: partnerError } = await supabase
    .from('workout_partners')
    .select('partner_id')
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single();

  if (partnerError && partnerError.code !== 'PGRST116') throw partnerError;

  let partnerStats = null;
  if (partnerRelation?.partner_id) {
  const { data: partnerData, error: partnerError } = await supabase
    .from('weekly_workouts')
    .select(`
      users!weekly_workouts_user_id_fkey (
        id,
        name
      ),
      daily_workouts!weekly_workout_id (
        completed,
        exercises (
          exercise_sets (
            completed
          )
        )
      )
    `)
    .eq('user_id', partnerRelation.partner_id)
    .eq('status', 'accepted')
    .single();

    if (partnerData) {
      const partnerWorkouts = partnerData.daily_workouts || [];
      const partnerCompletedWorkouts = partnerWorkouts.filter(w => w.completed).length;
      const partnerTotalSets = partnerWorkouts.reduce((total, workout) => 
        total + (workout.exercises?.reduce((sets, ex) => 
          sets + (ex.exercise_sets?.length || 0), 0) || 0), 0);
      const partnerCompletedSets = partnerWorkouts.reduce((total, workout) => 
        total + (workout.exercises?.reduce((sets, ex) => 
          sets + (ex.exercise_sets?.filter(set => set.completed)?.length || 0), 0) || 0), 0);

      partnerStats = {
        name: partnerData.users.name,
        completedWorkouts: partnerCompletedWorkouts,
        completionRate: Math.round((partnerCompletedSets / (partnerTotalSets || 1)) * 100)
      };
    }
  }

  const stats: WorkoutStats = {
    weeklyWorkouts: totalWorkouts,
    completedWorkouts,
    completionRate: Math.round((completedWorkouts / (totalWorkouts || 1)) * 100),
    exerciseCompletion: {
      total: exerciseCompletion?.total || 0,
      completed: exerciseCompletion?.completed || 0,
      rate: Math.round((exerciseCompletion?.completed || 0) / (exerciseCompletion?.total || 1) * 100)
    },
    partner: partnerStats
  };

  return stats;
}

export async function getCurrentWeekWorkouts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const { data, error } = await supabase
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
          completed
        )
      )
    `)
    .or(`user_id.eq.${user.id},shared_with.cs.{${user.id}},weekly_workout_id.is.null`)
    .gte('date', startOfWeek.toISOString())
    .order('date', { ascending: false });

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function generateWorkout(
  duration: number,
  difficulty: 'easy' | 'medium' | 'hard',
  exercises: WorkoutExercise[],
  sharing?: {
    isShared: boolean;
    sharedWith?: string[];
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create workout title from selected body parts
  const bodyPartsTitle = exercises
    .map(ex => ex.bodyPart)
    .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
    .join('/');
  
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  });

  // Get exercises for all selected body parts
  const selectedExercises = [];
  
  for (const exercise of exercises) {
    const { data: availableExercises, error: exercisesError } = await supabase
      .from('available_exercises')
      .select('*')
      .eq('main_muscle_group', exercise.bodyPart);

    if (exercisesError) throw exercisesError;
    if (!availableExercises?.length) {
      throw new Error(`No exercises found for ${exercise.bodyPart}`);
    }

    // Randomly select exercises for this body part
    const exercisesForBodyPart = availableExercises
      .sort(() => 0.5 - Math.random())
      .slice(0, 2) // Select 2 exercises per body part
      .map(ex => ({
      name: ex.name,
      targetSets: Math.floor(Math.random() * 2) + 3,
      targetReps: `${Math.floor(Math.random() * 4) + 8}-${Math.floor(Math.random() * 4) + 10}`,
      bodyPart: ex.main_muscle_group,
      notes: `Equipment: ${ex.primary_equipment}, Grip: ${ex.grip_style || 'Any'}`
      }));

    selectedExercises.push(...exercisesForBodyPart);
  }

  // Create daily workout
  const { data: dailyWorkout, error: dayError } = await supabase
    .from('daily_workouts')
    .insert({
      user_id: user.id,
      date: new Date().toISOString(),
      title: `${bodyPartsTitle} (${formattedDate})`,
      duration,
      difficulty: difficulty,
      is_shared: sharing?.isShared ?? false,
      shared_with: sharing?.sharedWith || [],
      completed: false,
      is_favorite: false
    })
    .select()
    .single();

  if (dayError) throw dayError;
  if (!dailyWorkout) throw new Error('Failed to create workout');

  // Insert exercises and their sets
  for (const exercise of selectedExercises) {
    // Insert exercise
    const { data: exerciseData, error: exerciseError } = await supabase
      .from('exercises')
      .insert({
        daily_workout_id: dailyWorkout.id,
        name: exercise.name,
        target_sets: exercise.targetSets,
        target_reps: exercise.targetReps,
        body_part: exercise.bodyPart,
        notes: exercise.notes || ''
      })
      .select()
      .single();

    if (exerciseError) throw exerciseError;
    if (!exerciseData) throw new Error('Failed to create exercise');

    // Create exercise sets
    const exerciseSets = Array.from(
      { length: exercise.targetSets },
      (_, i) => ({
        exercise_id: exerciseData.id,
        set_number: i + 1,
        weight: 0,
        reps: 0,
        completed: false
      })
    );

    const { error: setsError } = await supabase
      .from('exercise_sets')
      .insert(exerciseSets);

    if (setsError) throw new Error(`Failed to create exercise sets: ${setsError.message}`);
  }

  // Return the complete workout data
  const { data: completeWorkout, error: fetchError } = await supabase
    .from('daily_workouts')
    .select(`
      *,
      exercises (
        *,
        exercise_sets (*)
      ),
      weekly_workout:weekly_workouts (*)
    `)
    .eq('id', dailyWorkout.id)
    .single();

  if (fetchError) throw fetchError;
  if (!completeWorkout) throw new Error('Failed to fetch complete workout');
  
  return completeWorkout;
}

export async function deleteWorkout(workoutId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Delete exercise sets first
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id')
    .eq('daily_workout_id', workoutId);

  if (exercises?.length) {
    const exerciseIds = exercises.map(ex => ex.id);
    const { error: setsError } = await supabase
      .from('exercise_sets')
      .delete()
      .in('exercise_id', exerciseIds);

    if (setsError) throw setsError;
  }

  // Delete exercises
  const { error: exercisesError } = await supabase
    .from('exercises')
    .delete()
    .eq('daily_workout_id', workoutId);

  if (exercisesError) throw exercisesError;

  // Finally delete the workout
  const { error } = await supabase
    .from('daily_workouts')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getFavoriteWorkouts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
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
          completed
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('is_favorite', true)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addWorkoutToWeek(workoutId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the workout template
  const { data: template, error: templateError } = await supabase
    .from('daily_workouts')
    .select(`
      *,
      exercises (
        name,
        target_sets,
        target_reps,
        body_part,
        notes
      )
    `)
    .eq('id', workoutId)
    .single();

  if (templateError) throw templateError;
  if (!template) throw new Error('Workout not found');

  // Create new workout from template
  const { data: newWorkout, error: workoutError } = await supabase
    .from('daily_workouts')
    .insert({
      user_id: user.id,
      title: template.title,
      duration: template.duration,
      difficulty: template.difficulty,
      date: new Date().toISOString(),
      is_shared: false,
      shared_with: [],
      completed: false,
      is_favorite: false
    })
    .select()
    .single();

  if (workoutError) throw workoutError;

  // Create exercises
  for (const exercise of template.exercises) {
    const { data: newExercise, error: exerciseError } = await supabase
      .from('exercises')
      .insert({
        daily_workout_id: newWorkout.id,
        name: exercise.name,
        target_sets: exercise.target_sets,
        target_reps: exercise.target_reps,
        body_part: exercise.body_part,
        notes: exercise.notes
      })
      .select()
      .single();

    if (exerciseError) throw exerciseError;

    // Create exercise sets
    const exerciseSets = Array.from(
      { length: exercise.target_sets },
      (_, i) => ({
        exercise_id: newExercise.id,
        set_number: i + 1,
        weight: 0,
        reps: 0,
        completed: false
      })
    );

    const { error: setsError } = await supabase
      .from('exercise_sets')
      .insert(exerciseSets);

    if (setsError) throw setsError;
  }

  return newWorkout;
}
export async function updateExerciseSet(
  exerciseId: string,
  setNumber: number,
  weight: number,
  reps: number,
  completed: boolean
) {
  const { error } = await supabase
    .from('exercise_sets')
    .upsert({
      exercise_id: exerciseId,
      set_number: setNumber,
      weight,
      reps,
      completed
    })
    .select()
    .single();

  if (error) throw error;

  // Check if all sets are completed to update the exercise status
  const { data: sets, error: setsError } = await supabase
    .from('exercise_sets')
    .select('completed')
    .eq('exercise_id', exerciseId);

  if (setsError) throw setsError;

  const allSetsCompleted = sets?.every(set => set.completed);

  if (allSetsCompleted) {
    const { error: exerciseError } = await supabase
      .from('exercises')
      .update({ completed: true })
      .eq('id', exerciseId);

    if (exerciseError) throw exerciseError;
  }

  return {
    allSetsCompleted
  };
}

export async function completeWorkout(workoutId: string) {
  const { error } = await supabase
    .from('daily_workouts')
    .update({
      completed: true,
      completed_at: new Date().toISOString()
    })
    .eq('id', workoutId);

  if (error) throw error;

  // Check if all workouts in the week are completed
  const { data: weeklyWorkout, error: weekError } = await supabase
    .from('daily_workouts')
    .select('completed')
    .eq('weekly_workout_id', (
      await supabase
        .from('daily_workouts')
        .select('weekly_workout_id')
        .eq('id', workoutId)
        .single()
    ).data?.weekly_workout_id);

  if (weekError) throw weekError;

  const allWorkoutsCompleted = weeklyWorkout?.every(w => w.completed);

  if (allWorkoutsCompleted) {
    const { error: weekUpdateError } = await supabase
      .from('weekly_workouts')
      .update({ status: 'completed' })
      .eq('id', weeklyWorkout[0].weekly_workout_id);

    if (weekUpdateError) throw weekUpdateError;
  }

  return {
    allWorkoutsCompleted
  };
}

export async function toggleFavorite(workoutId: string, isFavorite: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('daily_workouts')
    .update({ is_favorite: isFavorite })
    .eq('id', workoutId)
    .eq('user_id', user.id);

  if (error) throw error;
}