'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { Settings, Save, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function LimitsTab({ userId }) {
  const [limits, setLimits] = useState({
    rate_limit_per_minute: 60,
    rate_limit_per_hour: 1000,
    rate_limit_per_day: 10000,
    max_request_size: 10,
    enable_rate_limiting: true,
    enable_ip_whitelist: false,
    enable_cors: true,
  });
  const [ipWhitelist, setIpWhitelist] = useState([]);
  const [newIp, setNewIp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUsage, setCurrentUsage] = useState({
    minute: 0,
    hour: 0,
    day: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchLimits();
    fetchCurrentUsage();
  }, [userId]);

  const fetchLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('api_limits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setLimits(data);
        setIpWhitelist(data.ip_whitelist || []);
      }
    } catch (error) {
      console.error('Error fetching limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUsage = async () => {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const oneDayAgo = new Date(now.getTime() - 86400000);

      const { data: minuteData } = await supabase
        .from('api_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneMinuteAgo.toISOString());

      const { data: hourData } = await supabase
        .from('api_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo.toISOString());

      const { data: dayData } = await supabase
        .from('api_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneDayAgo.toISOString());

      setCurrentUsage({
        minute: minuteData?.length || 0,
        hour: hourData?.length || 0,
        day: dayData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching current usage:', error);
    }
  };

  const saveLimits = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('api_limits')
        .upsert({
          user_id: userId,
          ...limits,
          ip_whitelist: ipWhitelist,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      alert('Limits saved successfully!');
    } catch (error) {
      console.error('Error saving limits:', error);
      alert('Failed to save limits');
    } finally {
      setSaving(false);
    }
  };

  const addIpAddress = () => {
    if (newIp && !ipWhitelist.includes(newIp)) {
      setIpWhitelist([...ipWhitelist, newIp]);
      setNewIp('');
    }
  };

  const removeIpAddress = (ip) => {
    setIpWhitelist(ipWhitelist.filter(item => item !== ip));
  };

  const getUsagePercentage = (current, limit) => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return <div className="text-center py-8">Loading limits...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Usage</CardTitle>
          <CardDescription>Real-time API usage against your limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Per Minute</Label>
              <span className={`font-semibold ${getUsageColor(getUsagePercentage(currentUsage.minute, limits.rate_limit_per_minute))}`}>
                {currentUsage.minute} / {limits.rate_limit_per_minute}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  getUsagePercentage(currentUsage.minute, limits.rate_limit_per_minute) >= 90
                    ? 'bg-red-500'
                    : getUsagePercentage(currentUsage.minute, limits.rate_limit_per_minute) >= 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${getUsagePercentage(currentUsage.minute, limits.rate_limit_per_minute)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Per Hour</Label>
              <span className={`font-semibold ${getUsageColor(getUsagePercentage(currentUsage.hour, limits.rate_limit_per_hour))}`}>
                {currentUsage.hour} / {limits.rate_limit_per_hour}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  getUsagePercentage(currentUsage.hour, limits.rate_limit_per_hour) >= 90
                    ? 'bg-red-500'
                    : getUsagePercentage(currentUsage.hour, limits.rate_limit_per_hour) >= 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${getUsagePercentage(currentUsage.hour, limits.rate_limit_per_hour)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Per Day</Label>
              <span className={`font-semibold ${getUsageColor(getUsagePercentage(currentUsage.day, limits.rate_limit_per_day))}`}>
                {currentUsage.day} / {limits.rate_limit_per_day}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  getUsagePercentage(currentUsage.day, limits.rate_limit_per_day) >= 90
                    ? 'bg-red-500'
                    : getUsagePercentage(currentUsage.day, limits.rate_limit_per_day) >= 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${getUsagePercentage(currentUsage.day, limits.rate_limit_per_day)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>Configure API request limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="perMinute">Requests per Minute</Label>
              <Input
                id="perMinute"
                type="number"
                value={limits.rate_limit_per_minute}
                onChange={(e) => setLimits({ ...limits, rate_limit_per_minute: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perHour">Requests per Hour</Label>
              <Input
                id="perHour"
                type="number"
                value={limits.rate_limit_per_hour}
                onChange={(e) => setLimits({ ...limits, rate_limit_per_hour: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perDay">Requests per Day</Label>
              <Input
                id="perDay"
                type="number"
                value={limits.rate_limit_per_day}
                onChange={(e) => setLimits({ ...limits, rate_limit_per_day: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxSize">Max Request Size (MB)</Label>
            <Input
              id="maxSize"
              type="number"
              value={limits.max_request_size}
              onChange={(e) => setLimits({ ...limits, max_request_size: parseInt(e.target.value) || 0 })}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Configure API security options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Rate Limiting</Label>
              <p className="text-sm text-muted-foreground">
                Enforce rate limits on API requests
              </p>
            </div>
            <Switch
              checked={limits.enable_rate_limiting}
              onCheckedChange={(checked) => setLimits({ ...limits, enable_rate_limiting: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable CORS</Label>
              <p className="text-sm text-muted-foreground">
                Allow cross-origin requests
              </p>
            </div>
            <Switch
              checked={limits.enable_cors}
              onCheckedChange={(checked) => setLimits({ ...limits, enable_cors: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>IP Whitelist</Label>
              <p className="text-sm text-muted-foreground">
                Restrict API access to specific IP addresses
              </p>
            </div>
            <Switch
              checked={limits.enable_ip_whitelist}
              onCheckedChange={(checked) => setLimits({ ...limits, enable_ip_whitelist: checked })}
            />
          </div>

          {limits.enable_ip_whitelist && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter IP address (e.g., 192.168.1.1)"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addIpAddress()}
                />
                <Button onClick={addIpAddress}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ipWhitelist.map((ip) => (
                  <Badge key={ip} variant="secondary" className="px-3 py-1">
                    {ip}
                    <button
                      onClick={() => removeIpAddress(ip)}
                      className="ml-2 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
                {ipWhitelist.length === 0 && (
                  <p className="text-sm text-muted-foreground">No IP addresses whitelisted yet</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveLimits} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
