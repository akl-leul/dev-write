import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Bell, 
  Heart, 
  MessageSquare, 
  Users, 
  FileText, 
  AlertTriangle,
  Send,
  Smartphone
} from 'lucide-react';
import { 
  pushNotificationManager,
  showLikeNotification,
  showCommentNotification,
  showFollowNotification,
  showSystemNotification,
  showPostPublishedNotification
} from '@/utils/pushNotifications';

export const TestNotifications: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `[${timestamp}] ${type.toUpperCase()}: ${message}`]);
  };

  const testBasicNotification = async () => {
    setIsLoading(true);
    try {
      await pushNotificationManager.showNotification({
        title: 'Test Notification',
        body: 'This is a test notification from Chronicle',
        icon: '/favicon-32x32.png',
        tag: 'test',
        data: { type: 'test' }
      });
      addTestResult('Basic notification sent successfully', 'success');
      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      addTestResult('Failed to send test notification', 'error');
      toast.error('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  const testLikeNotification = async () => {
    setIsLoading(true);
    try {
      await showLikeNotification('John Doe', 'My Amazing Post');
      addTestResult('Like notification sent successfully', 'success');
      toast.success('Like notification sent!');
    } catch (error) {
      console.error('Failed to send like notification:', error);
      addTestResult('Failed to send like notification', 'error');
      toast.error('Failed to send like notification');
    } finally {
      setIsLoading(false);
    }
  };

  const testCommentNotification = async () => {
    setIsLoading(true);
    try {
      await showCommentNotification('Jane Smith', 'My Amazing Post', 'This is a great post! Really enjoyed reading it.');
      addTestResult('Comment notification sent successfully', 'success');
      toast.success('Comment notification sent!');
    } catch (error) {
      console.error('Failed to send comment notification:', error);
      addTestResult('Failed to send comment notification', 'error');
      toast.error('Failed to send comment notification');
    } finally {
      setIsLoading(false);
    }
  };

  const testFollowNotification = async () => {
    setIsLoading(true);
    try {
      await showFollowNotification('Mike Johnson');
      addTestResult('Follow notification sent successfully', 'success');
      toast.success('Follow notification sent!');
    } catch (error) {
      console.error('Failed to send follow notification:', error);
      addTestResult('Failed to send follow notification', 'error');
      toast.error('Failed to send follow notification');
    } finally {
      setIsLoading(false);
    }
  };

  const testSystemNotification = async () => {
    setIsLoading(true);
    try {
      await showSystemNotification('System Update', 'Your account settings have been updated successfully.');
      addTestResult('System notification sent successfully', 'success');
      toast.success('System notification sent!');
    } catch (error) {
      console.error('Failed to send system notification:', error);
      addTestResult('Failed to send system notification', 'error');
      toast.error('Failed to send system notification');
    } finally {
      setIsLoading(false);
    }
  };

  const testPostPublishedNotification = async () => {
    setIsLoading(true);
    try {
      await showPostPublishedNotification('My New Article');
      addTestResult('Post published notification sent successfully', 'success');
      toast.success('Post published notification sent!');
    } catch (error) {
      console.error('Failed to send post published notification:', error);
      addTestResult('Failed to send post published notification', 'error');
      toast.error('Failed to send post published notification');
    } finally {
      setIsLoading(false);
    }
  };

  const checkNotificationSupport = async () => {
    try {
      const isSupported = await pushNotificationManager.checkSupport();
      const permission = Notification.permission;
      const subscription = await pushNotificationManager.getSubscription();
      
      addTestResult(`Push notifications supported: ${isSupported}`, 'info');
      addTestResult(`Permission status: ${permission}`, 'info');
      addTestResult(`Subscription active: ${!!subscription}`, 'info');
      
      if (!isSupported) {
        addTestResult('Push notifications are not supported in this browser', 'error');
      } else if (permission === 'denied') {
        addTestResult('Notifications are blocked. Please enable them in browser settings.', 'error');
      } else if (permission === 'granted' && !subscription) {
        addTestResult('Permission granted but not subscribed. Consider subscribing.', 'info');
      } else if (permission === 'default') {
        addTestResult('Permission not requested yet. Request permission first.', 'info');
      }
    } catch (error) {
      console.error('Failed to check notification support:', error);
      addTestResult('Failed to check notification support', 'error');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Support Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Notification Support Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={checkNotificationSupport}
              variant="outline"
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Check Support
            </Button>
            <Button 
              onClick={clearResults}
              variant="ghost"
              size="sm"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Notification */}
            <Button
              onClick={testBasicNotification}
              disabled={isLoading}
              variant="outline"
              className="gap-2 h-auto p-4 flex flex-col items-start"
            >
              <Bell className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Basic Notification</div>
                <div className="text-xs text-muted-foreground">Test basic push notification</div>
              </div>
            </Button>

            {/* Like Notification */}
            <Button
              onClick={testLikeNotification}
              disabled={isLoading}
              variant="outline"
              className="gap-2 h-auto p-4 flex flex-col items-start"
            >
              <Heart className="h-4 w-4 text-red-500" />
              <div className="text-left">
                <div className="font-medium">Like Notification</div>
                <div className="text-xs text-muted-foreground">Test like notification</div>
              </div>
            </Button>

            {/* Comment Notification */}
            <Button
              onClick={testCommentNotification}
              disabled={isLoading}
              variant="outline"
              className="gap-2 h-auto p-4 flex flex-col items-start"
            >
              <MessageSquare className="h-4 w-4 text-green-500" />
              <div className="text-left">
                <div className="font-medium">Comment Notification</div>
                <div className="text-xs text-muted-foreground">Test comment notification</div>
              </div>
            </Button>

            {/* Follow Notification */}
            <Button
              onClick={testFollowNotification}
              disabled={isLoading}
              variant="outline"
              className="gap-2 h-auto p-4 flex flex-col items-start"
            >
              <Users className="h-4 w-4 text-purple-500" />
              <div className="text-left">
                <div className="font-medium">Follow Notification</div>
                <div className="text-xs text-muted-foreground">Test follow notification</div>
              </div>
            </Button>

            {/* System Notification */}
            <Button
              onClick={testSystemNotification}
              disabled={isLoading}
              variant="outline"
              className="gap-2 h-auto p-4 flex flex-col items-start"
            >
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <div className="text-left">
                <div className="font-medium">System Notification</div>
                <div className="text-xs text-muted-foreground">Test system notification</div>
              </div>
            </Button>

            {/* Post Published Notification */}
            <Button
              onClick={testPostPublishedNotification}
              disabled={isLoading}
              variant="outline"
              className="gap-2 h-auto p-4 flex flex-col items-start"
            >
              <FileText className="h-4 w-4 text-orange-500" />
              <div className="text-left">
                <div className="font-medium">Post Published</div>
                <div className="text-xs text-muted-foreground">Test post published notification</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results</span>
              <Badge variant="secondary">{testResults.length} results</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className={`text-sm p-2 rounded font-mono ${
                    result.includes('SUCCESS') 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : result.includes('ERROR')
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <Bell className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> For push notifications to work, you need to:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Use a supported browser (Chrome, Firefox, Edge, Safari)</li>
            <li>Grant notification permission when prompted</li>
            <li>Install the PWA for best results</li>
            <li>Ensure your device supports push notifications</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default TestNotifications;
