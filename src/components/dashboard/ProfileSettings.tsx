
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  MapPin, 
  Briefcase, 
  Users, 
  CheckCircle,
  Edit,
  Linkedin
} from "lucide-react";
import { useLinkedInProfile } from "@/hooks/useLinkedInProfile";
import { useAuth } from "@/contexts/AuthContext";

export function ProfileSettings() {
  const { user } = useAuth();
  const { profile: linkedInProfile } = useLinkedInProfile(user?.id || '');

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Basic Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Your basic profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={linkedInProfile?.profile_picture_url || "/placeholder.svg"} 
                alt={user.name} 
              />
              <AvatarFallback className="bg-blue-600 text-white text-lg">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <p className="text-gray-600">{user.email}</p>
              <Badge variant="secondary" className="mt-2">
                {user.role === 'lawyer' ? 'Attorney' : 'Client'}
              </Badge>
            </div>

            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* LinkedIn Profile Data */}
      {linkedInProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-blue-600" />
              LinkedIn Profile Data
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardTitle>
            <CardDescription>
              Information synced from your LinkedIn profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Professional Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Professional Details</h4>
                <div className="space-y-3">
                  {linkedInProfile.headline && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Headline</label>
                      <p className="text-gray-900">{linkedInProfile.headline}</p>
                    </div>
                  )}
                  
                  {linkedInProfile.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{linkedInProfile.location}</span>
                    </div>
                  )}
                  
                  {linkedInProfile.industry && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span>{linkedInProfile.industry}</span>
                    </div>
                  )}
                  
                  {linkedInProfile.connections_count && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>{linkedInProfile.connections_count.toLocaleString()} connections</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-gray-900">
                      {linkedInProfile.first_name} {linkedInProfile.last_name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Profile</label>
                    <p className="text-gray-900">{user.profile?.location || 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Summary */}
            {linkedInProfile.summary && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Professional Summary</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {linkedInProfile.summary}
                  </p>
                </div>
              </>
            )}

            {/* Sync Status */}
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">
                Last synced: {new Date(linkedInProfile.updated_at).toLocaleDateString()}
              </span>
              <Badge variant="secondary">
                LinkedIn Connected
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attorney Profile Settings */}
      {user.role === 'lawyer' && (
        <Card>
          <CardHeader>
            <CardTitle>Attorney Profile Settings</CardTitle>
            <CardDescription>
              Manage your professional attorney profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Specialties</label>
                <p className="text-gray-900">
                  {user.profile?.specialties?.join(", ") || "Not specified"}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Hourly Rate</label>
                <p className="text-gray-900">
                  ${user.profile?.hourlyRate || 0}/hour
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Location</label>
                <p className="text-gray-900">
                  {user.profile?.location || linkedInProfile?.location || "Not specified"}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Verification Status</label>
                <div className="flex items-center gap-2">
                  {user.profile?.verified ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Verified</span>
                    </>
                  ) : (
                    <Badge variant="outline">Pending Verification</Badge>
                  )}
                </div>
              </div>
            </div>

            {user.profile?.bio && (
              <div>
                <label className="text-sm font-medium text-gray-500">Bio</label>
                <p className="text-gray-700 mt-1">
                  {user.profile.bio}
                </p>
              </div>
            )}

            <div className="pt-4">
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
