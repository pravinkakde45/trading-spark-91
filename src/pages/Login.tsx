import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { TrendingUp } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock authentication
    if (email && password) {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', email);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      navigate('/dashboard');
    } else {
      toast.error('Please fill in all fields');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-8">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">TradePro</h1>
          </div>
          <h2 className="text-2xl font-bold">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-muted-foreground">
            {isLogin 
              ? 'Enter your credentials to access your account' 
              : 'Start trading with our advanced platform'}
          </p>
        </div>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>{isLogin ? 'Login' : 'Sign Up'}</CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Access your trading dashboard' 
                : 'Create a new trading account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="trader@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input border-border/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input border-border/50"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-glow text-primary-foreground"
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary-glow transition-colors"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Sandbox mode enabled - No real money involved
        </p>
      </div>
    </div>
  );
};

export default Login;
