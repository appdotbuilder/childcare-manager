import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Utensils, UserPlus } from 'lucide-react';
import { trpc } from '@/utils/trpc';
// Import types from server schema
import type { Child, Attendance, Meal } from '../../server/src/schema';

// Import components
import { ChildrenManagement } from '@/components/ChildrenManagement';
import { AttendanceTracking } from '@/components/AttendanceTracking';
import { MealTracking } from '@/components/MealTracking';
import { DashboardStats } from '@/components/DashboardStats';

function App() {
  const [children, setChildren] = useState<Child[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<Attendance[]>([]);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [childrenData, attendanceData, mealsData] = await Promise.all([
        trpc.getChildren.query(),
        trpc.getCurrentAttendance.query(),
        trpc.getDailyMeals.query({ date: new Date().toISOString().split('T')[0] })
      ]);
      
      setChildren(childrenData);
      setCurrentAttendance(attendanceData);
      setTodayMeals(mealsData);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh functions for child components
  const refreshChildren = useCallback(async () => {
    try {
      const childrenData = await trpc.getChildren.query();
      setChildren(childrenData);
    } catch (error) {
      console.error('Failed to refresh children:', error);
    }
  }, []);

  const refreshAttendance = useCallback(async () => {
    try {
      const attendanceData = await trpc.getCurrentAttendance.query();
      setCurrentAttendance(attendanceData);
    } catch (error) {
      console.error('Failed to refresh attendance:', error);
    }
  }, []);

  const refreshMeals = useCallback(async () => {
    try {
      const mealsData = await trpc.getDailyMeals.query({ 
        date: new Date().toISOString().split('T')[0] 
      });
      setTodayMeals(mealsData);
    } catch (error) {
      console.error('Failed to refresh meals:', error);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading childcare system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            🏫 Little Learners Childcare
          </h1>
          <p className="text-gray-600">Staff management system for attendance, meals, and child information</p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="children" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Children
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="meals" className="flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              Meals
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <DashboardStats 
              totalChildren={children.length}
              checkedInToday={currentAttendance.length}
              mealsRecorded={todayMeals.length}
            />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks for staff members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => setActiveTab('children')} 
                    variant="outline" 
                    className="h-20 flex flex-col items-center gap-2"
                  >
                    <Users className="w-6 h-6" />
                    Manage Children
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('attendance')} 
                    variant="outline" 
                    className="h-20 flex flex-col items-center gap-2"
                  >
                    <Clock className="w-6 h-6" />
                    Track Attendance
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('meals')} 
                    variant="outline" 
                    className="h-20 flex flex-col items-center gap-2"
                  >
                    <Utensils className="w-6 h-6" />
                    Record Meals
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Currently Checked In */}
            <Card>
              <CardHeader>
                <CardTitle>Currently Checked In</CardTitle>
                <CardDescription>Children present today</CardDescription>
              </CardHeader>
              <CardContent>
                {currentAttendance.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No children currently checked in
                  </p>
                ) : (
                  <div className="space-y-2">
                    {currentAttendance.map((attendance: Attendance) => (
                      <div key={attendance.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div>
                          <p className="font-medium">Child ID: {attendance.child_id}</p>
                          <p className="text-sm text-gray-600">
                            Checked in: {attendance.check_in_time.toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Present
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Children Management Tab */}
          <TabsContent value="children">
            <ChildrenManagement 
              children={children}
              onChildrenChange={refreshChildren}
            />
          </TabsContent>

          {/* Attendance Tracking Tab */}
          <TabsContent value="attendance">
            <AttendanceTracking 
              children={children}
              currentAttendance={currentAttendance}
              onAttendanceChange={refreshAttendance}
            />
          </TabsContent>

          {/* Meal Tracking Tab */}
          <TabsContent value="meals">
            <MealTracking 
              children={children}
              todayMeals={todayMeals}
              onMealsChange={refreshMeals}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;