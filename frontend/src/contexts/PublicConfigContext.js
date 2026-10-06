import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const PublicConfigContext = createContext({
  loading: true,
  regionBlocked: false,
  reload: () => Promise.resolve(),
});

export const PublicConfigProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [regionBlocked, setRegionBlocked] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await axios.get('/api/config');
      setRegionBlocked(false);
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.detail === 'ACCESS_DENIED_REGION') {
        setRegionBlocked(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({ loading, regionBlocked, reload }),
    [loading, regionBlocked, reload]
  );

  return (
    <PublicConfigContext.Provider value={value}>
      {children}
    </PublicConfigContext.Provider>
  );
};

export const usePublicConfig = () => useContext(PublicConfigContext);
