import { createContext, useContext, useState } from 'react';

const PrivacyContext = createContext({ privacy: false, setPrivacy: () => {} });

export function PrivacyProvider({ children }) {
  const [privacy, setPrivacy] = useState(false);
  return (
    <PrivacyContext.Provider value={{ privacy, setPrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export const usePrivacy = () => useContext(PrivacyContext);
