import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import CandlestickChart from '@/components/CandlestickChart';
import Orderbook from '@/components/Orderbook';
import OrderForm from '@/components/OrderForm';
import TradeFeed from '@/components/TradeFeed';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Market = () => {
  const [searchParams] = useSearchParams();
  const [symbol, setSymbol] = useState(searchParams.get('symbol') || 'AAPL');
  const balance = 10000;

  return (
    <div className="min-h-screen bg-background">
      <TopNav balance={balance} />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{symbol}</h1>
          <p className="text-muted-foreground">Real-time market data and trading</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart & Trade Feed */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card border-border/50 p-6">
              <CandlestickChart symbol={symbol} />
            </Card>
            
            <Card className="glass-card border-border/50 p-6">
              <h3 className="text-lg font-bold mb-4">Recent Trades</h3>
              <TradeFeed symbol={symbol} />
            </Card>
          </div>

          {/* Right Column - Orderbook & Trade Panel */}
          <div className="space-y-6">
            <Card className="glass-card border-border/50 p-6">
              <h3 className="text-lg font-bold mb-4">Order Book</h3>
              <Orderbook symbol={symbol} />
            </Card>

            <Card className="glass-card border-border/50 p-6">
              <Tabs defaultValue="buy" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="buy" className="data-[state=active]:bg-buy data-[state=active]:text-buy-foreground">
                    Buy
                  </TabsTrigger>
                  <TabsTrigger value="sell" className="data-[state=active]:bg-sell data-[state=active]:text-sell-foreground">
                    Sell
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="buy">
                  <OrderForm symbol={symbol} side="buy" balance={balance} />
                </TabsContent>
                <TabsContent value="sell">
                  <OrderForm symbol={symbol} side="sell" balance={balance} />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Market;
