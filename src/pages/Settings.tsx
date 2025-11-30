import { useState } from 'react';
import TopNav from '@/components/TopNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const Settings = () => {
  const balance = 10000;
  const [sandboxMode, setSandboxMode] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const handleSaveApiKeys = () => {
    if (apiKey && apiSecret) {
      toast.success('API keys saved successfully');
    } else {
      toast.error('Please fill in all API fields');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav balance={balance} />
      
      <main className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your trading preferences and API configuration</p>
        </div>

        <div className="space-y-6">
          {/* Sandbox Mode */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Trading Mode</CardTitle>
              <CardDescription>
                Enable sandbox mode to trade with virtual money
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sandbox-mode" className="text-base">
                    Sandbox Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {sandboxMode 
                      ? 'Currently trading with virtual money' 
                      : 'Currently trading with real money'}
                  </p>
                </div>
                <Switch
                  id="sandbox-mode"
                  checked={sandboxMode}
                  onCheckedChange={(checked) => {
                    setSandboxMode(checked);
                    toast.info(
                      checked 
                        ? 'Switched to sandbox mode' 
                        : 'Switched to live trading mode'
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* API Configuration */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Connect to your broker's API (required for live trading)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="text"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-secret">API Secret</Label>
                <Input
                  id="api-secret"
                  type="password"
                  placeholder="Enter your API secret"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="font-mono"
                />
              </div>
              <Button 
                onClick={handleSaveApiKeys}
                className="bg-primary hover:bg-primary-glow text-primary-foreground"
              >
                Save API Keys
              </Button>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your trading account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Account Type</Label>
                  <p className="text-lg font-medium">
                    {sandboxMode ? 'Demo Account' : 'Live Account'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Account Status</Label>
                  <p className="text-lg font-medium text-buy">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
