'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { Send, Copy, CheckCircle2, Code, FileJson } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TestingTab({ userId }) {
  const [endpoint, setEndpoint] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState('{\n  \n}');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchApiKeys();
  }, [userId]);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      setApiKeys(data || []);
      if (data && data.length > 0) {
        setSelectedKey(data[0].key);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const sendRequest = async () => {
    setLoading(true);
    setResponse(null);

    const startTime = performance.now();

    try {
      let parsedHeaders = {};
      try {
        parsedHeaders = JSON.parse(headers);
      } catch (e) {
        throw new Error('Invalid JSON in headers');
      }

      // Add API key to headers
      if (selectedKey) {
        parsedHeaders['Authorization'] = `Bearer ${selectedKey}`;
      }

      const options = {
        method,
        headers: parsedHeaders,
      };

      if (method !== 'GET' && method !== 'HEAD') {
        try {
          options.body = body;
        } catch (e) {
          throw new Error('Invalid JSON in body');
        }
      }

      const res = await fetch(endpoint, options);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      let responseData;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }

      const responseHeaders = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        data: responseData,
        time: responseTime,
        size: new Blob([JSON.stringify(responseData)]).size,
      });

      // Log the request
      await supabase.from('api_logs').insert({
        user_id: userId,
        method,
        endpoint,
        status_code: res.status,
        response_time: responseTime,
        request_body: method !== 'GET' ? body : null,
      });

    } catch (error) {
      setResponse({
        status: 0,
        statusText: 'Error',
        error: error.message,
        time: Math.round(performance.now() - startTime),
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCurlCommand = () => {
    let curl = `curl -X ${method}`;
    
    try {
      const parsedHeaders = JSON.parse(headers);
      Object.entries(parsedHeaders).forEach(([key, value]) => {
        curl += ` \\\n  -H "${key}: ${value}"`;
      });
    } catch (e) {}

    if (selectedKey) {
      curl += ` \\\n  -H "Authorization: Bearer ${selectedKey}"`;
    }

    if (method !== 'GET' && body) {
      curl += ` \\\n  -d '${body}'`;
    }

    curl += ` \\\n  "${endpoint}"`;

    return curl;
  };

  const generateJavaScriptCode = () => {
    let code = `fetch('${endpoint}', {\n  method: '${method}',\n  headers: ${headers}`;
    
    if (selectedKey) {
      const parsedHeaders = JSON.parse(headers);
      parsedHeaders['Authorization'] = `Bearer ${selectedKey}`;
      code = `fetch('${endpoint}', {\n  method: '${method}',\n  headers: ${JSON.stringify(parsedHeaders, null, 2)}`;
    }

    if (method !== 'GET' && body) {
      code += `,\n  body: ${body}`;
    }

    code += `\n})\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error('Error:', error));`;

    return code;
  };

  const generatePythonCode = () => {
    let code = `import requests\n\n`;
    code += `url = "${endpoint}"\n`;
    code += `headers = ${headers.replace(/"/g, "'")}`;

    if (selectedKey) {
      code += `\nheaders["Authorization"] = "Bearer ${selectedKey}"`;
    }

    if (method !== 'GET' && body) {
      code += `\ndata = ${body}`;
    }

    code += `\n\nresponse = requests.${method.toLowerCase()}(url, headers=headers`;
    
    if (method !== 'GET' && body) {
      code += `, json=data`;
    }

    code += `)\nprint(response.json())`;

    return code;
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Request Tester</CardTitle>
          <CardDescription>Test your API endpoints in real-time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key Selection */}
          {apiKeys.length > 0 && (
            <div className="space-y-2">
              <Label>API Key</Label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an API key" />
                </SelectTrigger>
                <SelectContent>
                  {apiKeys.map((key) => (
                    <SelectItem key={key.id} value={key.key}>
                      {key.name} ({key.key.substring(0, 12)}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Method and Endpoint */}
          <div className="flex gap-2">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="https://api.example.com/endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="flex-1"
            />
            <Button onClick={sendRequest} disabled={loading || !endpoint}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send'}
            </Button>
          </div>

          {/* Headers */}
          <div className="space-y-2">
            <Label>Headers (JSON)</Label>
            <Textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              className="font-mono text-sm"
              rows={4}
            />
          </div>

          {/* Body */}
          {method !== 'GET' && method !== 'HEAD' && (
            <div className="space-y-2">
              <Label>Body (JSON)</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-sm"
                rows={6}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response */}
      {response && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Response</CardTitle>
              <div className="flex items-center gap-4">
                <Badge variant={response.status >= 200 && response.status < 300 ? 'default' : 'destructive'}>
                  {response.status} {response.statusText}
                </Badge>
                <span className="text-sm text-muted-foreground">{response.time}ms</span>
                {response.size && (
                  <span className="text-sm text-muted-foreground">{(response.size / 1024).toFixed(2)} KB</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="body">
              <TabsList>
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
              </TabsList>
              <TabsContent value="body" className="mt-4">
                {response.error ? (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                    <p className="font-semibold mb-2">Error:</p>
                    <p>{response.error}</p>
                  </div>
                ) : (
                  <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-96">
                    <code className="text-sm">
                      {typeof response.data === 'string' 
                        ? response.data 
                        : JSON.stringify(response.data, null, 2)}
                    </code>
                  </pre>
                )}
              </TabsContent>
              <TabsContent value="headers" className="mt-4">
                <pre className="p-4 bg-muted rounded-lg overflow-auto">
                  <code className="text-sm">
                    {JSON.stringify(response.headers, null, 2)}
                  </code>
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
          <CardDescription>Copy code snippets for your application</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>
            <TabsContent value="curl" className="mt-4">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-auto">
                  <code className="text-sm">{generateCurlCommand()}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyCode(generateCurlCommand())}
                >
                  {copiedCode ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="javascript" className="mt-4">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-auto">
                  <code className="text-sm">{generateJavaScriptCode()}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyCode(generateJavaScriptCode())}
                >
                  {copiedCode ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="python" className="mt-4">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-auto">
                  <code className="text-sm">{generatePythonCode()}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyCode(generatePythonCode())}
                >
                  {copiedCode ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
