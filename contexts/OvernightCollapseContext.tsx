import React, { createContext, useContext, useState, ReactNode } from 'react';

interface OvernightCollapseContextType {
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
  resetToCollapsed: () => void;
}

const OvernightCollapseContext = createContext<OvernightCollapseContextType | undefined>(undefined);

export function OvernightCollapseProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <OvernightCollapseContext.Provider
      value={{
        isExpanded,
        setExpanded: setIsExpanded,
        resetToCollapsed: () => setIsExpanded(false),
      }}
    >
      {children}
    </OvernightCollapseContext.Provider>
  );
}

export const useOvernightCollapse = () => {
  const context = useContext(OvernightCollapseContext);
  if (!context) {
    throw new Error('useOvernightCollapse must be used within OvernightCollapseProvider');
  }
  return context;
};
