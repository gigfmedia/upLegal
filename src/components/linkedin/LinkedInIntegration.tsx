
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Linkedin, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  MapPin, 
  Briefcase,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { useLinkedInProfile } from "@/hooks/useLinkedInProfile";

interface LinkedInIntegrationProps {
  userId: string;
}

export function LinkedInIntegration({ userId }: LinkedInIntegrationProps) {
  const { profile, isLoading, error, connectLinkedIn, refreshProfile, disconnectLinkedIn } = useLinkedInProfile(userId);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectLinkedIn();
    } catch (error) {
      console.error('Failed to connect LinkedIn:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2">Loading LinkedIn profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load LinkedIn profile: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            Connect LinkedIn Profile
          </CardTitle>
          <CardDescription>
            Import your professional information from LinkedIn to enhance your attorney profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="mb-3">By connecting your LinkedIn profile, you can:</p>
            <ul className="list-disc list-inside space-y-1 mb-4">
              <li>Automatically import your professional headline</li>
              <li>Sync your location and industry information</li>
              <li>Display your profile picture</li>
              <li>Show your connection count as social proof</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Linkedin className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : 'Connect LinkedIn'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-blue-600" />
              LinkedIn Profile
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardTitle>
            <CardDescription>
              Connected and synced with your LinkedIn profile
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshProfile}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={disconnectLinkedIn}>
              Disconnect
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Overview */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.profile_picture_url || "/placeholder.svg"} alt={`${profile.first_name} ${profile.last_name}`} />
            <AvatarFallback className="bg-blue-600 text-white text-lg">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold">
              {profile.first_name} {profile.last_name}
            </h3>
            {profile.headline && (
              <p className="text-gray-600 mb-2">{profile.headline}</p>
            )}
            
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              {profile.location && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.industry && (
                <div className="flex items-center">
                  <Briefcase className="h-4 w-4 mr-1" />
                  <span>{profile.industry}</span>
                </div>
              )}
              {profile.connections_count && (
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{profile.connections_count.toLocaleString()} connections</span>
                </div>
              )}
            </div>
            
            {profile.public_profile_url && (
              <div className="mt-3">
                <a 
                  href={profile.public_profile_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  View LinkedIn Profile
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {profile.summary && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Professional Summary</h4>
              <p className="text-gray-700 text-sm leading-relaxed">
                {profile.summary}
              </p>
            </div>
          </>
        )}

        {/* Status */}
        <Separator />
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>Last updated: {new Date(profile.updated_at).toLocaleDateString()}</span>
          <Badge variant="secondary">
            Synced
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
