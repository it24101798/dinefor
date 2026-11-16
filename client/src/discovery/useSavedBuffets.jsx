import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SavedContext = createContext(null);
const idOf = item => String(item?._id || item?.id || '');

export function SavedBuffetsProvider({ children }) {
  const { token } = useAuth();
  return <SavedSession token={token}>{children}</SavedSession>;
}

function SavedSession({ children, token }) {
  const signedIn = Boolean(token);
  const [loadedToken, setLoadedToken] = useState(token);
  const session = useRef(token);
  session.current = token;
  const [items, setItems] = useState([]);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState(signedIn ? 'loading' : 'ready');
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    setLoadedToken(token);
    setItems([]);
    setPending(false);
    busy.current = false;
    setStatus(signedIn ? 'loading' : 'ready');
    if (!signedIn) return;
    const controller = new AbortController();
    api.get('/users/saved-buffets', { signal: controller.signal }).then(({ data }) => {
      if (!Array.isArray(data)) throw new Error('Invalid saved list');
      if (!controller.signal.aborted) {
        setItems(data);
        setStatus('ready');
      }
    }).catch(() => {
      if (!controller.signal.aborted) setStatus('error');
    });
    return () => controller.abort();
  }, [token, signedIn, attempt]);

  async function toggle(item) {
    const id = idOf(item);
    if (!signedIn || !id || busy.current || status !== 'ready') return;
    busy.current = true;
    setPending(true);
    try {
      const { data } = await api.put(`/users/saved-buffets/${encodeURIComponent(id)}`);
      if (typeof data?.saved !== 'boolean') throw new Error('Invalid saved response');
      if (session.current !== token) return;
      setItems(previous => {
        const remainder = previous.filter(value => idOf(value) !== id);
        return data.saved ? [{ ...item, savedAt: new Date().toISOString() }, ...remainder] : remainder;
      });
      return data.saved;
    } finally {
      if (session.current === token) {
        busy.current = false;
        setPending(false);
      }
    }
  }

  function retry() {
    setStatus('loading');
    setAttempt(value => value + 1);
  }

  return <SavedContext.Provider value={{ items: loadedToken === token ? items : [], pending, status: loadedToken === token ? status : 'loading', signedIn, toggle, retry }}>{children}</SavedContext.Provider>;
}

export function useSavedBuffets() {
  return useContext(SavedContext);
}
