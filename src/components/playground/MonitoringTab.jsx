'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MonitoringTab({ userId }) {
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [healthMetrics, setHealthMetrics] = useState({
    uptime: 99.9,
    avgLatency: 0,
    errorRate: 0,
    requestsPerSecond: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchRecentLogs();
    calculateHealthMetrics();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchRecentLogs();
        calculateHealthMetrics();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [userId, filterStatus, autoRefresh]);

  const fetchRecentLogs = async () => {
    try {
      let query = supabase
        .from('api_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterStatus !== 'all') {
        if (filterStatus === 'success') {
          query = query.gte('status_code', 200).lt('status_code', 300);
        } else if (filterStatus === 'error') {
          query = query.or('status_code.gte.400,status_code.lt.200');
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecentLogs(data || []);
    } catch (error) {
      console.error('Error fetching recent logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthMetrics = async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const { data: recentData, error } = await supabase
        .from('api_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', fiveMinutesAgo.toISOString());

      if (error) throw error;

      if (recentData && recentData.length > 0) {
        const totalRequests = recentData.length;
        const errorCount = recentData.filter(log => log.status_code >= 400 || log.status_code < 200).length;
        const totalLatency = recentData.reduce((sum, log) => sum + (log.response_time || 0), 0);
        const requestsPerSecond = totalRequests / 300; // 5 minutes = 300 seconds

        setHealthMetrics({
          uptime: ((totalRequests - errorCount) / totalRequests * 100).toFixed(2),
          avgLatency: (totalLatency / totalRequests).toFixed(0),
          errorRate: ((errorCount / totalRequests) * 100).toFixed(2),
          requestsPerSecond: requestsPerSecond.toFixed(2),
        });
      }
    } catch (error) {
      console.error('Error calculating health metrics:', error);
    }
  };

  const getStatusBadge = (statusCode) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge variant="success" className="bg-green-500">Success</Badge>;
    } else if (statusCode >= 400 && statusCode < 500) {
      return <Badge variant="warning" className="bg-yellow-500">Client Error</Badge>;
    } else if (statusCode >= 500) {
      return <Badge variant="destructive">Server Error</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'text-blue-500',
      POST: 'text-green-500',
      PUT: 'text-yellow-500',
      DELETE: 'text-red-500',
      PATCH: 'text-purple-500',
    };
    return colors[method] || 'text-gray-500';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading monitoring data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Real-time Monitoring</h2>
        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="success">Success Only</SelectItem>
              <SelectItem value="error">Errors Only</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-muted-foreground">
              {autoRefresh ? 'Auto-refreshing' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Health Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthMetrics.uptime}%</div>
            <p className="text-xs text-muted-foreground">Last 5 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthMetrics.avgLatency}ms</div>
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className={`h-4 w-4 ${parseFloat(healthMetrics.errorRate) > 5 ? 'text-red-500' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthMetrics.errorRate}%</div>
            <p className="text-xs text-muted-foreground">Failed requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthMetrics.requestsPerSecond}</div>
            <p className="text-xs text-muted-foreground">Requests/second</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Live API request log (last 50 requests)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-xs text-muted-foreground font-mono w-20">
                        {formatTimestamp(log.created_at)}
                      </span>
                      <Badge variant="outline" className={`${getMethodColor(log.method)} font-semibold w-16 justify-center`}>
                        {log.method}
                      </Badge>
                      <span className="text-sm font-mono truncate max-w-md">
                        {log.endpoint}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {log.response_time}ms
                      </span>
                      {getStatusBadge(log.status_code)}
                      <span className="text-sm font-semibold w-12 text-right">
                        {log.status_code}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Status Summary</CardTitle>
          <CardDescription>Overview of request statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {recentLogs.filter(log => log.status_code >= 200 && log.status_code < 300).length}
                </p>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <AlertCircle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {recentLogs.filter(log => log.status_code >= 400 && log.status_code < 500).length}
                </p>
                <p className="text-sm text-muted-foreground">Client Errors</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {recentLogs.filter(log => log.status_code >= 500).length}
                </p>
                <p className="text-sm text-muted-foreground">Server Errors</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
