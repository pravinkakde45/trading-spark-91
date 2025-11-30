import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { CandlestickIcon } from './CandlestickIcon';

interface TopNavProps {
  balance: number;
}

const TopNav = ({ balance }: TopNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail') || 'trader@example.com';

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/market', label: 'Market' },
    { path: '/orders', label: 'Orders' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="border-b border-border/50 bg-card/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              <CandlestickIcon className="h-6 w-6 text-primary" size={24} />
              <span className="text-xl font-bold">TradePro</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    className={location.pathname === item.path ? 'bg-primary/10 text-primary' : ''}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm">
              <div className="text-muted-foreground">Balance</div>
              <div className="font-mono font-bold text-primary">
                ${balance.toLocaleString()}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <User className="h-4 w-4" />
                <span className="text-sm">{userEmail.split('@')[0]}</span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
