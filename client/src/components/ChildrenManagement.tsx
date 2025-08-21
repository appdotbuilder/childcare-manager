import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Phone, Mail, AlertTriangle, Calendar, User } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Child, CreateChildInput } from '../../../server/src/schema';

interface ChildrenManagementProps {
  children: Child[];
  onChildrenChange: () => Promise<void>;
}

export function ChildrenManagement({ children, onChildrenChange }: ChildrenManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateChildInput>({
    name: '',
    date_of_birth: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    emergency_contact: '',
    emergency_phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await trpc.createChild.mutate(formData);
      await onChildrenChange();
      setIsAddDialogOpen(false);
      // Reset form
      setFormData({
        name: '',
        date_of_birth: '',
        parent_name: '',
        parent_phone: '',
        parent_email: '',
        emergency_contact: '',
        emergency_phone: ''
      });
    } catch (error) {
      console.error('Failed to create child:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateAge = (birthDate: Date): string => {
    const today = new Date();
    const birth = new Date(birthDate);
    const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + 
                       (today.getMonth() - birth.getMonth());
    
    if (ageInMonths < 12) {
      return `${ageInMonths} months`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      const months = ageInMonths % 12;
      return months > 0 ? `${years}y ${months}m` : `${years} years`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Child Button */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Children Management
            </CardTitle>
            <CardDescription>
              Manage child information and parent contact details
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New Child
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Child</DialogTitle>
                <DialogDescription>
                  Enter the child's information and parent contact details.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  {/* Child Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">Child Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Child's Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateChildInput) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="Enter child's name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_of_birth">Date of Birth *</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={typeof formData.date_of_birth === 'string' ? formData.date_of_birth : formData.date_of_birth.toISOString().split('T')[0]}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateChildInput) => ({ ...prev, date_of_birth: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Parent Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">Parent Information</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="parent_name">Parent's Name *</Label>
                        <Input
                          id="parent_name"
                          value={formData.parent_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateChildInput) => ({ ...prev, parent_name: e.target.value }))
                          }
                          placeholder="Enter parent's name"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="parent_phone">Phone Number *</Label>
                          <Input
                            id="parent_phone"
                            type="tel"
                            value={formData.parent_phone}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData((prev: CreateChildInput) => ({ ...prev, parent_phone: e.target.value }))
                            }
                            placeholder="(555) 123-4567"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="parent_email">Email Address *</Label>
                          <Input
                            id="parent_email"
                            type="email"
                            value={formData.parent_email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData((prev: CreateChildInput) => ({ ...prev, parent_email: e.target.value }))
                            }
                            placeholder="parent@example.com"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Emergency Contact */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">Emergency Contact</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact">Contact Name *</Label>
                        <Input
                          id="emergency_contact"
                          value={formData.emergency_contact}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateChildInput) => ({ ...prev, emergency_contact: e.target.value }))
                          }
                          placeholder="Emergency contact name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_phone">Contact Phone *</Label>
                        <Input
                          id="emergency_phone"
                          type="tel"
                          value={formData.emergency_phone}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateChildInput) => ({ ...prev, emergency_phone: e.target.value }))
                          }
                          placeholder="(555) 987-6543"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Adding...' : 'Add Child'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      {/* Children List */}
      {children.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              No children registered yet. Add the first child to get started!
            </p>
            <p className="text-sm text-gray-400">
              Note: This is using placeholder data from the server. In a real implementation,
              children data would be stored in a database.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child: Child) => (
            <Card key={child.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{child.name}</CardTitle>
                  <Badge variant="outline">
                    <Calendar className="w-3 h-3 mr-1" />
                    {calculateAge(child.date_of_birth)}
                  </Badge>
                </div>
                <CardDescription>
                  Born: {child.date_of_birth.toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Parent Information */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Parent Details
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{child.parent_name}</p>
                    <p className="text-gray-600 flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {child.parent_phone}
                    </p>
                    <p className="text-gray-600 flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {child.parent_email}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Emergency Contact */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Emergency Contact
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{child.emergency_contact}</p>
                    <p className="text-gray-600 flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {child.emergency_phone}
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-xs text-gray-400">
                  Registered: {child.created_at.toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}