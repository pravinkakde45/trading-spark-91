import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-card/50 backdrop-blur-lg mt-auto">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            © {currentYear} TradePro. All rights reserved to Pravin.
          </p>
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            Professional Trading Platform
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

