import { useEffect, useRef } from 'react';

interface CandlestickChartProps {
  symbol: string;
}

const CandlestickChart = ({ symbol }: CandlestickChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simple chart placeholder - using canvas-based visualization
    if (!chartContainerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = chartContainerRef.current.clientWidth;
    canvas.height = 400;
    canvas.style.width = '100%';
    canvas.style.height = '400px';
    chartContainerRef.current.innerHTML = '';
    chartContainerRef.current.appendChild(canvas);

    // Generate and draw mock candlestick data
    const drawChart = () => {
      const data = [];
      let basePrice = 100;
      
      for (let i = 0; i < 50; i++) {
        const open = basePrice;
        const close = basePrice + (Math.random() - 0.5) * 4;
        const high = Math.max(open, close) + Math.random() * 2;
        const low = Math.min(open, close) - Math.random() * 2;
        data.push({ open, high, low, close });
        basePrice = close;
      }

      // Clear canvas
      ctx.fillStyle = '#1a1f2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const y = (canvas.height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw candlesticks
      const candleWidth = canvas.width / data.length;
      const priceRange = Math.max(...data.map(d => d.high)) - Math.min(...data.map(d => d.low));
      const scale = canvas.height / priceRange;
      const minPrice = Math.min(...data.map(d => d.low));

      data.forEach((candle, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const yHigh = canvas.height - (candle.high - minPrice) * scale;
        const yLow = canvas.height - (candle.low - minPrice) * scale;
        const yOpen = canvas.height - (candle.open - minPrice) * scale;
        const yClose = canvas.height - (candle.close - minPrice) * scale;

        const isUp = candle.close > candle.open;
        ctx.strokeStyle = isUp ? '#10B981' : '#EF4444';
        ctx.fillStyle = isUp ? '#10B981' : '#EF4444';

        // Draw wick
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Draw body
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.abs(yOpen - yClose);
        ctx.fillRect(x - candleWidth / 4, bodyTop, candleWidth / 2, bodyHeight || 1);
      });
    };

    drawChart();

    const handleResize = () => {
      if (chartContainerRef.current) {
        canvas.width = chartContainerRef.current.clientWidth;
        drawChart();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [symbol]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">{symbol} Chart</h2>
        <p className="text-sm text-muted-foreground">1-minute candlesticks</p>
      </div>
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />
    </div>
  );
};

export default CandlestickChart;
