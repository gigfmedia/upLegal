
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  DollarSign,
  MessageSquare,
  Calendar,
  FileText
} from "lucide-react";

interface ProfileOverviewProps {
  user: any;
  stats: any;
  recentActivity: any[];
}

export function ProfileOverview({ user, stats, recentActivity }: ProfileOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance This Month</CardTitle>
          <CardDescription>Your key metrics and performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Response Time</span>
                <Badge variant="secondary">{stats.responseTime}</Badge>
              </div>
              <Progress value={85} className="h-2" />
              <p className="text-xs text-gray-500">Faster than 85% of attorneys</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Client Satisfaction</span>
                <Badge variant="default">98%</Badge>
              </div>
              <Progress value={98} className="h-2" />
              <p className="text-xs text-gray-500">Excellent client feedback</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Project Success</span>
                <Badge variant="default">{stats.successRate}%</Badge>
              </div>
              <Progress value={stats.successRate} className="h-2" />
              <p className="text-xs text-gray-500">Above platform average</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest client interactions and transactions</CardDescription>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {activity.type === 'project_completed' && (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  )}
                  {activity.type === 'proposal_sent' && (
                    <FileText className="h-8 w-8 text-blue-500" />
                  )}
                  {activity.type === 'contract_signed' && (
                    <DollarSign className="h-8 w-8 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-sm text-gray-500">Client: {activity.client}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {activity.amount && (
                    <p className="text-sm font-medium text-green-600">
                      +${activity.amount.toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-12">
              <MessageSquare className="mr-3 h-4 w-4" />
              Check Messages
            </Button>
            <Button variant="outline" className="justify-start h-12">
              <Calendar className="mr-3 h-4 w-4" />
              Schedule Meeting
            </Button>
            <Button variant="outline" className="justify-start h-12">
              <FileText className="mr-3 h-4 w-4" />
              Create Proposal
            </Button>
            <Button variant="outline" className="justify-start h-12">
              <TrendingUp className="mr-3 h-4 w-4" />
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
