import { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import WatchlistCard from '@/components/WatchlistCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

interface PortfolioStats {
  balance: number;
  equity: number;
  margin: number;
  pnl: number;
  pnlPercent: number;
}

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState<PortfolioStats>({
    balance: 10000,
    equity: 12350,
    margin: 2000,
    pnl: 2350,
    pnlPercent: 23.5,
  });

  const watchlistSymbols = ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN'];

  return (
    <div className="min-h-screen bg-background">
      <TopNav balance={portfolio.balance} />
      
      <main className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to your trading hub</p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                ${portfolio.balance.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Available funds</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equity</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                ${portfolio.equity.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total portfolio value</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margin Used</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                ${portfolio.margin.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {((portfolio.margin / portfolio.balance) * 100).toFixed(1)}% of balance
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">P&L</CardTitle>
              {portfolio.pnl >= 0 ? (
                <TrendingUp className="h-4 w-4 text-buy" />
              ) : (
                <TrendingDown className="h-4 w-4 text-sell" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-mono ${portfolio.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                {portfolio.pnl >= 0 ? '+' : ''}{portfolio.pnl >= 0 ? '$' : '-$'}
                {Math.abs(portfolio.pnl).toLocaleString()}
              </div>
              <p className={`text-xs ${portfolio.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                {portfolio.pnl >= 0 ? '+' : ''}{portfolio.pnlPercent.toFixed(2)}% today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Watchlist */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Watchlist</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlistSymbols.map((symbol) => (
              <WatchlistCard key={symbol} symbol={symbol} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
