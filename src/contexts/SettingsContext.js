'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const openSettings = useCallback(() => setSettingsModalOpen(true), []);
  const closeSettings = useCallback(() => setSettingsModalOpen(false), []);
  const toggleSettings = useCallback(() => setSettingsModalOpen(prev => !prev), []);

  const value = useMemo(() => ({
    settingsModalOpen,
    setSettingsModalOpen,
    openSettings,
    closeSettings,
    toggleSettings,
  }), [settingsModalOpen, openSettings, closeSettings, toggleSettings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
