import { createContext, useContext } from 'react';

const BootDataContext = createContext({ nfts: [], loreMap: {}, account: null });

export function BootDataProvider({ nfts, loreMap, account, children }) {
  return (
    <BootDataContext.Provider value={{ nfts, loreMap, account }}>
      {children}
    </BootDataContext.Provider>
  );
}

export function useBootData() {
  return useContext(BootDataContext);
}
