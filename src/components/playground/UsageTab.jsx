'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Activity, Clock, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function UsageTab({ userId }) {
  const [usageData, setUsageData] = useState([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    successRate: 0,
    avgResponseTime: 0,
    totalCost: 0,
  });
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [endpointUsage, setEndpointUsage] = useState([]);

  const supabase = createClient();

  useEffect(() => {
    fetchUsageData();
  }, [userId, timeRange]);

  const fetchUsageData = async () => {
    try {
      const daysMap = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[timeRange];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch API logs
      const { data: logs, error } = await supabase
        .from('api_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process data for charts
      const dailyUsage = processUsageByDay(logs || [], days);
      const endpointStats = processEndpointUsage(logs || []);
      const calculatedStats = calculateStats(logs || []);

      setUsageData(dailyUsage);
      setEndpointUsage(endpointStats);
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processUsageByDay = (logs, days) => {
    const dayMap = {};
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      dayMap[dateStr] = { date: dateStr, requests: 0, success: 0, errors: 0 };
    }

    logs.forEach(log => {
      const dateStr = log.created_at.split('T')[0];
      if (dayMap[dateStr]) {
        dayMap[dateStr].requests++;
        if (log.status_code >= 200 && log.status_code < 300) {
          dayMap[dateStr].success++;
        } else {
          dayMap[dateStr].errors++;
        }
      }
    });

    return Object.values(dayMap).map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      requests: day.requests,
      success: day.success,
      errors: day.errors,
    }));
  };

  const processEndpointUsage = (logs) => {
    const endpointMap = {};
    
    logs.forEach(log => {
      if (!endpointMap[log.endpoint]) {
        endpointMap[log.endpoint] = { name: log.endpoint, value: 0 };
      }
      endpointMap[log.endpoint].value++;
    });

    return Object.values(endpointMap).slice(0, 5);
  };

  const calculateStats = (logs) => {
    if (logs.length === 0) {
      return { totalRequests: 0, successRate: 0, avgResponseTime: 0, totalCost: 0 };
    }

    const successCount = logs.filter(log => log.status_code >= 200 && log.status_code < 300).length;
    const totalResponseTime = logs.reduce((sum, log) => sum + (log.response_time || 0), 0);
    const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);

    return {
      totalRequests: logs.length,
      successRate: ((successCount / logs.length) * 100).toFixed(1),
      avgResponseTime: (totalResponseTime / logs.length).toFixed(0),
      totalCost: totalCost.toFixed(2),
    };
  };

  if (loading) {
    return <div className="text-center py-8">Loading usage data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Usage Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">API calls in selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">Successful responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">Average latency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost}</div>
            <p className="text-xs text-muted-foreground">Total API costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Request Timeline</CardTitle>
          <CardDescription>API requests over time</CardDescription>
        </CardHeader>
        <CardContent>
          {usageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="requests" stroke="#8884d8" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="success" stroke="#82ca9d" strokeWidth={2} name="Success" />
                <Line type="monotone" dataKey="errors" stroke="#ff8042" strokeWidth={2} name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No usage data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Endpoint Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Top Endpoints</CardTitle>
            <CardDescription>Most frequently used API endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            {endpointUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={endpointUsage}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {endpointUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No endpoint data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Request Distribution</CardTitle>
            <CardDescription>Success vs Error rate breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {usageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="success" fill="#82ca9d" name="Success" />
                  <Bar dataKey="errors" fill="#ff8042" name="Errors" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No distribution data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
