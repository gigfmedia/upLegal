
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  User,
  MapPin,
  Briefcase
} from "lucide-react";
import { useLinkedInProfile } from "@/hooks/useLinkedInProfile";
import { useAuth } from "@/contexts/AuthContext";

interface SyncableField {
  key: string;
  label: string;
  icon: React.ReactNode;
  linkedinValue: string | null;
  currentValue: string | null;
  canSync: boolean;
}

export function LinkedInProfileSync() {
  const { user, updateProfile } = useAuth();
  const { profile } = useLinkedInProfile(user?.id || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  if (!profile || !user || user.role !== 'lawyer') {
    return null;
  }

  const syncableFields: SyncableField[] = [
    {
      key: 'location',
      label: 'Location',
      icon: <MapPin className="h-4 w-4" />,
      linkedinValue: profile.location,
      currentValue: user.profile?.location || null,
      canSync: !!profile.location && profile.location !== user.profile?.location
    },
    {
      key: 'bio',
      label: 'Professional Bio',
      icon: <User className="h-4 w-4" />,
      linkedinValue: profile.summary,
      currentValue: user.profile?.bio || null,
      canSync: !!profile.summary && profile.summary !== user.profile?.bio
    }
  ];

  const syncableFieldsAvailable = syncableFields.filter(field => field.canSync);

  const handleSyncField = async (field: SyncableField) => {
    if (!field.linkedinValue || !user) return;

    try {
      setIsSyncing(true);
      
      const updateData: any = {};
      updateData[field.key] = field.linkedinValue;
      
      await updateProfile(updateData);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (error) {
      console.error('Error syncing field:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    if (!user) return;

    try {
      setIsSyncing(true);
      
      const updateData: any = {};
      syncableFieldsAvailable.forEach(field => {
        if (field.linkedinValue) {
          updateData[field.key] = field.linkedinValue;
        }
      });
      
      if (Object.keys(updateData).length > 0) {
        await updateProfile(updateData);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error syncing all fields:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (syncableFieldsAvailable.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            LinkedIn Profile Sync
          </CardTitle>
          <CardDescription>
            Your profile is up to date with your LinkedIn information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All available LinkedIn data has been synced to your attorney profile.
            </AlertDescription>
          </Alert>
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
              <Download className="h-5 w-5 text-blue-600" />
              Sync LinkedIn Data
            </CardTitle>
            <CardDescription>
              Update your attorney profile with information from LinkedIn
            </CardDescription>
          </div>
          <Button 
            onClick={handleSyncAll}
            disabled={isSyncing || syncableFieldsAvailable.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Sync All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {syncSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Profile successfully updated with LinkedIn data!
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {syncableFieldsAvailable.map((field) => (
            <div key={field.key} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {field.icon}
                  <span className="font-medium">{field.label}</span>
                  <Badge variant="secondary" className="ml-2">
                    New data available
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyncField(field)}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    'Sync'
                  )}
                </Button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Current:</span>
                  <p className="text-gray-900 mt-1">
                    {field.currentValue || <span className="text-gray-400">Not set</span>}
                  </p>
                </div>
                <div>
                  <span className="text-green-600">From LinkedIn:</span>
                  <p className="text-gray-900 mt-1">{field.linkedinValue}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
