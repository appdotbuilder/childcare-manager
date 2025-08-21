import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Utensils, Plus, Clock, User, MessageSquare } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Child, Meal, RecordMealInput, MealType } from '../../../server/src/schema';

interface MealTrackingProps {
  children: Child[];
  todayMeals: Meal[];
  onMealsChange: () => Promise<void>;
}

const mealTypeOptions: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🥐' },
  { value: 'lunch', label: 'Lunch', emoji: '🍽️' },
  { value: 'snack', label: 'Snack', emoji: '🍎' },
  { value: 'dinner', label: 'Dinner', emoji: '🍝' }
];

const consumedAmountOptions = [
  { value: 'none', label: 'None', color: 'bg-red-100 text-red-800' },
  { value: 'some', label: 'Some', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'half', label: 'Half', color: 'bg-orange-100 text-orange-800' },
  { value: 'most', label: 'Most', color: 'bg-blue-100 text-blue-800' },
  { value: 'full', label: 'Full', color: 'bg-green-100 text-green-800' }
];

export function MealTracking({ children, todayMeals, onMealsChange }: MealTrackingProps) {
  const [isRecordingMeal, setIsRecordingMeal] = useState(false);
  const [formData, setFormData] = useState<RecordMealInput>({
    child_id: 0,
    meal_type: 'breakfast',
    description: '',
    consumed_amount: 'full',
    notes: undefined
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.child_id === 0) return;

    setIsRecordingMeal(true);
    try {
      await trpc.recordMeal.mutate({
        ...formData,
        notes: formData.notes || undefined
      });
      await onMealsChange();
      
      // Reset form
      setFormData({
        child_id: 0,
        meal_type: 'breakfast',
        description: '',
        consumed_amount: 'full',
        notes: undefined
      });
    } catch (error) {
      console.error('Failed to record meal:', error);
    } finally {
      setIsRecordingMeal(false);
    }
  };

  // Get child name by ID
  const getChildName = (childId: number): string => {
    const child = children.find((c: Child) => c.id === childId);
    return child ? child.name : `Child ID: ${childId}`;
  };

  // Get meal type display info
  const getMealTypeInfo = (mealType: MealType) => {
    const info = mealTypeOptions.find(option => option.value === mealType);
    return info || { label: mealType, emoji: '🍽️' };
  };

  // Get consumed amount display info
  const getConsumedAmountInfo = (amount: string) => {
    const info = consumedAmountOptions.find(option => option.value === amount);
    return info || { label: amount, color: 'bg-gray-100 text-gray-800' };
  };

  // Group meals by meal type
  const mealsByType = todayMeals.reduce((acc: Record<MealType, Meal[]>, meal: Meal) => {
    if (!acc[meal.meal_type]) {
      acc[meal.meal_type] = [];
    }
    acc[meal.meal_type].push(meal);
    return acc;
  }, {} as Record<MealType, Meal[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            Meal Tracking
          </CardTitle>
          <CardDescription>
            Record meals and track children's eating habits
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Record Meal Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Record New Meal
            </CardTitle>
            <CardDescription>
              Log what and how much a child ate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="child">Select Child</Label>
                <Select 
                  value={formData.child_id.toString()} 
                  onValueChange={(value: string) => 
                    setFormData((prev: RecordMealInput) => ({ 
                      ...prev, 
                      child_id: parseInt(value) || 0 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.length === 0 ? (
                      <SelectItem value="0" disabled>
                        No children registered
                      </SelectItem>
                    ) : (
                      children.map((child: Child) => (
                        <SelectItem key={child.id} value={child.id.toString()}>
                          {child.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meal_type">Meal Type</Label>
                <Select 
                  value={formData.meal_type} 
                  onValueChange={(value: MealType) => 
                    setFormData((prev: RecordMealInput) => ({ ...prev, meal_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.emoji} {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Meal Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., Chicken sandwich, apple slices, milk"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: RecordMealInput) => ({ ...prev, description: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumed_amount">Amount Consumed</Label>
                <Select 
                  value={formData.consumed_amount} 
                  onValueChange={(value: string) => 
                    setFormData((prev: RecordMealInput) => ({ ...prev, consumed_amount: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {consumedAmountOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes..."
                  value={formData.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: RecordMealInput) => ({ 
                      ...prev, 
                      notes: e.target.value || undefined 
                    }))
                  }
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                disabled={formData.child_id === 0 || isRecordingMeal}
                className="w-full"
              >
                {isRecordingMeal ? 'Recording...' : 'Record Meal'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Today's Meals */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Today's Meals
            </CardTitle>
            <CardDescription>
              Meals recorded for {new Date().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayMeals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Utensils className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No meals recorded today</p>
                <p className="text-sm text-gray-400 mt-2">
                  Note: This is using placeholder data. In a real implementation,
                  meal records would be stored in a database.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {mealTypeOptions.map((mealTypeOption) => {
                  const meals = mealsByType[mealTypeOption.value] || [];
                  if (meals.length === 0) return null;

                  return (
                    <div key={mealTypeOption.value} className="space-y-3">
                      <h3 className="font-medium text-lg flex items-center gap-2">
                        <span>{mealTypeOption.emoji}</span>
                        {mealTypeOption.label}
                        <Badge variant="secondary">{meals.length}</Badge>
                      </h3>
                      
                      <div className="space-y-3">
                        {meals.map((meal: Meal) => {
                          const amountInfo = getConsumedAmountInfo(meal.consumed_amount);
                          
                          return (
                            <div key={meal.id} className="border rounded-lg p-4 bg-gray-50">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    {getChildName(meal.child_id)}
                                  </h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {meal.description}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge className={`${amountInfo.color} mb-1`}>
                                    {amountInfo.label}
                                  </Badge>
                                  <p className="text-xs text-gray-500">
                                    {meal.meal_date.toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>

                              {meal.notes && (
                                <>
                                  <Separator className="my-2" />
                                  <p className="text-sm text-gray-600 flex items-start gap-2">
                                    <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    {meal.notes}
                                  </p>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Meal Summary</CardTitle>
          <CardDescription>Overview of meal records for {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="space-y-2">
              <p className="text-2xl font-bold text-purple-600">{todayMeals.length}</p>
              <p className="text-sm text-gray-600">Total Meals</p>
            </div>
            {mealTypeOptions.map((mealType) => {
              const count = mealsByType[mealType.value]?.length || 0;
              return (
                <div key={mealType.value} className="space-y-2">
                  <p className="text-2xl font-bold text-blue-600">{count}</p>
                  <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <span>{mealType.emoji}</span>
                    {mealType.label}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}