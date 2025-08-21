import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Clock, LogIn, LogOut, User, MessageSquare } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Child, Attendance, CheckInInput, CheckOutInput } from '../../../server/src/schema';

interface AttendanceTrackingProps {
  children: Child[];
  currentAttendance: Attendance[];
  onAttendanceChange: () => Promise<void>;
}

export function AttendanceTracking({ children, currentAttendance, onAttendanceChange }: AttendanceTrackingProps) {
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckIn = async () => {
    if (!selectedChildId) return;
    
    setIsCheckingIn(true);
    try {
      const checkInData: CheckInInput = {
        child_id: parseInt(selectedChildId),
        notes: checkInNotes || undefined
      };
      
      await trpc.checkInChild.mutate(checkInData);
      await onAttendanceChange();
      
      // Reset form
      setSelectedChildId('');
      setCheckInNotes('');
    } catch (error) {
      console.error('Failed to check in child:', error);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async (attendanceId: number) => {
    setIsCheckingOut(true);
    try {
      const checkOutData: CheckOutInput = {
        attendance_id: attendanceId,
        notes: checkOutNotes || undefined
      };
      
      await trpc.checkOutChild.mutate(checkOutData);
      await onAttendanceChange();
      
      // Reset notes
      setCheckOutNotes('');
    } catch (error) {
      console.error('Failed to check out child:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Get children not currently checked in
  const availableForCheckIn = children.filter((child: Child) => 
    !currentAttendance.some((attendance: Attendance) => 
      attendance.child_id === child.id && !attendance.check_out_time
    )
  );

  // Get child name by ID
  const getChildName = (childId: number): string => {
    const child = children.find((c: Child) => c.id === childId);
    return child ? child.name : `Child ID: ${childId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Attendance Tracking
          </CardTitle>
          <CardDescription>
            Check children in and out, and track current attendance status
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Check In Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <LogIn className="w-4 h-4" />
              Check In Child
            </CardTitle>
            <CardDescription>
              Register a child's arrival for the day
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="child-select">Select Child</Label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a child to check in" />
                </SelectTrigger>
                <SelectContent>
                  {availableForCheckIn.length === 0 ? (
                    <SelectItem value="none" disabled>
                      {children.length === 0 
                        ? "No children registered" 
                        : "All children are already checked in"
                      }
                    </SelectItem>
                  ) : (
                    availableForCheckIn.map((child: Child) => (
                      <SelectItem key={child.id} value={child.id.toString()}>
                        {child.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkin-notes">Check-in Notes (Optional)</Label>
              <Textarea
                id="checkin-notes"
                placeholder="Any special notes for today..."
                value={checkInNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCheckInNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleCheckIn}
              disabled={!selectedChildId || isCheckingIn}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {isCheckingIn ? 'Checking In...' : 'Check In Child'}
            </Button>

            {availableForCheckIn.length === 0 && children.length > 0 && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">✅ All registered children are checked in!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Currently Checked In */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <User className="w-4 h-4" />
              Currently Present
            </CardTitle>
            <CardDescription>
              Children checked in today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentAttendance.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No children currently checked in</p>
                <p className="text-sm text-gray-400 mt-2">
                  Note: This is using placeholder data. In a real implementation,
                  attendance would be stored in a database.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentAttendance.map((attendance: Attendance) => (
                  <div key={attendance.id} className="border rounded-lg p-4 bg-green-50 border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{getChildName(attendance.child_id)}</h4>
                        <p className="text-sm text-gray-600">
                          Arrived: {attendance.check_in_time.toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Present
                      </Badge>
                    </div>

                    {attendance.notes && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 flex items-start gap-2">
                          <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {attendance.notes}
                        </p>
                      </div>
                    )}

                    <Separator className="my-3" />

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`checkout-notes-${attendance.id}`}>
                          Check-out Notes (Optional)
                        </Label>
                        <Textarea
                          id={`checkout-notes-${attendance.id}`}
                          placeholder="Any notes for check-out..."
                          value={checkOutNotes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                            setCheckOutNotes(e.target.value)
                          }
                          rows={2}
                        />
                      </div>
                      <Button 
                        onClick={() => handleCheckOut(attendance.id)}
                        disabled={isCheckingOut}
                        variant="outline"
                        className="w-full border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {isCheckingOut ? 'Checking Out...' : 'Check Out'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance Summary</CardTitle>
          <CardDescription>Overview of attendance for {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-2">
              <p className="text-2xl font-bold text-blue-600">{children.length}</p>
              <p className="text-sm text-gray-600">Total Enrolled</p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-green-600">{currentAttendance.length}</p>
              <p className="text-sm text-gray-600">Currently Present</p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-yellow-600">
                {children.length - currentAttendance.length}
              </p>
              <p className="text-sm text-gray-600">Not Yet Arrived</p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-purple-600">
                {children.length > 0 ? Math.round((currentAttendance.length / children.length) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-600">Attendance Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}