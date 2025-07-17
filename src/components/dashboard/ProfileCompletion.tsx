
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  AlertCircle, 
  User, 
  FileText, 
  Camera,
  Star,
  Award,
  CreditCard
} from "lucide-react";

interface ProfileCompletionProps {
  user: any;
}

export function ProfileCompletion({ user }: ProfileCompletionProps) {
  const completionItems = [
    {
      id: 'basic_info',
      title: 'Basic Information',
      description: 'Name, email, and contact details',
      completed: !!(user.name && user.email),
      icon: User
    },
    {
      id: 'profile_photo',
      title: 'Profile Photo',
      description: 'Professional headshot',
      completed: false,
      icon: Camera
    },
    {
      id: 'specialties',
      title: 'Legal Specialties',
      description: 'Areas of expertise',
      completed: !!(user.profile?.specialties?.length > 0),
      icon: Award
    },
    {
      id: 'bio',
      title: 'Professional Bio',
      description: 'Detailed professional background',
      completed: !!(user.profile?.bio && user.profile.bio.length > 50),
      icon: FileText
    },
    {
      id: 'hourly_rate',
      title: 'Hourly Rate',
      description: 'Set your consultation rates',
      completed: !!(user.profile?.hourlyRate && user.profile.hourlyRate > 0),
      icon: CreditCard
    },
    {
      id: 'portfolio',
      title: 'Project Portfolio',
      description: 'Showcase your best work',
      completed: false,
      icon: Star
    }
  ];

  const completedCount = completionItems.filter(item => item.completed).length;
  const completionPercentage = (completedCount / completionItems.length) * 100;

  const nextSteps = [
    {
      title: "Add Professional Photo",
      description: "Upload a professional headshot to build trust with clients",
      priority: "high"
    },
    {
      title: "Create Portfolio",
      description: "Add 2-3 case studies to showcase your expertise",
      priority: "high"
    },
    {
      title: "Get Verified",
      description: "Submit documents for professional verification",
      priority: "medium"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Profile Completion */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Completion</CardTitle>
          <CardDescription>
            Complete your profile to attract more clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">
                {completedCount}/{completionItems.length} completed
              </span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
            <p className="text-sm text-gray-600">
              {completionPercentage.toFixed(0)}% complete
            </p>
          </div>
          
          <div className="space-y-3 mt-6">
            {completionItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {item.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <item.icon className="h-4 w-4 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.completed ? 'text-gray-900' : 'text-gray-600'}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>
            Recommended actions to improve your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {nextSteps.map((step, index) => (
              <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium">{step.title}</h4>
                    <Badge variant={step.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                      {step.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{step.description}</p>
                </div>
                <Button size="sm" variant="outline">
                  Start
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profile Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Performance</CardTitle>
          <CardDescription>
            How your profile is performing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Profile Views</span>
              <span className="text-sm font-medium">1,247 this month</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Contact Requests</span>
              <span className="text-sm font-medium">23 this month</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Response Rate</span>
              <span className="text-sm font-medium">95%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Client Rating</span>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">4.8/5</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
