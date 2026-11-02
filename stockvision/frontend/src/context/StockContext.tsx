import React, { createContext, useContext, useState } from 'react';

interface StockContextType {
  selectedStock: string;
  setSelectedStock: (symbol: string) => void;
  stockName: string;
  setStockName: (name: string) => void;
}

const StockContext = createContext<StockContextType>({
  selectedStock: 'RELIANCE.NS',
  setSelectedStock: () => {},
  stockName: 'Reliance Industries Ltd.',
  setStockName: () => {},
});

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedStock, setSelectedStock] = useState<string>('RELIANCE.NS');
  const [stockName, setStockName] = useState<string>('Reliance Industries Ltd.');

  return (
    <StockContext.Provider value={{ selectedStock, setSelectedStock, stockName, setStockName }}>
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => useContext(StockContext);

