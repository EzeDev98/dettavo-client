import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { KeyRound } from 'lucide-react';
import EmptyState from '@shared/components/ui/EmptyState.jsx';
import Spinner from '@shared/components/ui/Spinner.jsx';
import { ROUTES } from '@app/router/routes.js';
import { usePairBrowser } from './systemStatus.js';
import './setup.css';

// The key arrives in the URL fragment (/pair#<key>), which the browser never sends to a server. It is read once
// and removed from the address bar and history straight away.
function takeKeyFromFragment() {
  const key = decodeURIComponent(window.location.hash.slice(1)).trim();
  if (key) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  return key;
}

// Two uses: /pair#<key> pairs this browser, then goes to Projects. Without a key (or when the app shell finds this
// browser unpaired) it shows "Not paired" and how to pair.
export default function PairScreen({ paired = false }) {
  const navigate = useNavigate();
  const pairBrowser = usePairBrowser();
  const [key, setKey] = useState(takeKeyFromFragment);
  const sentKey = useRef(null);
  const { mutate, reset } = pairBrowser;

  // A new link opened on this page only changes the fragment, which does not reload it.
  useEffect(() => {
    const readNewKey = () => {
      const next = takeKeyFromFragment();
      if (next) {
        reset();
        setKey(next);
      }
    };
    window.addEventListener('hashchange', readNewKey);
    return () => window.removeEventListener('hashchange', readNewKey);
  }, [reset]);

  useEffect(() => {
    // StrictMode runs effects twice in dev; each key is sent once.
    if (!key || sentKey.current === key) return;
    sentKey.current = key;
    mutate(key, { onSuccess: () => navigate(ROUTES.projects, { replace: true }) });
  }, [key, mutate, navigate]);

  if (!key && paired) return <Navigate to={ROUTES.projects} replace />;

  if (key && !pairBrowser.isError) {
    return (
      <div className="setup-screen">
        <Spinner label="Pairing this browser" />
      </div>
    );
  }

  const failed = pairBrowser.isError;
  return (
    <div className="setup-screen">
      <div className="setup-screen__body">
        <EmptyState
          icon={KeyRound}
          title={failed ? 'That pairing key did not work' : 'Not paired'}
          description={
            failed
              ? `${pairBrowser.error.message} Open the pairing link again with the current key.`
              : 'This browser is not paired with the local service. Open this address, with the key from the server log or from the file below.'
          }
        />
        <code className="setup-command">{`${window.location.origin}${ROUTES.pair}#<key>`}</code>
        <code className="setup-command">cat ~/Dettavo/pairing.key</code>
      </div>
    </div>
  );
}
