import React from 'react';
import { Link } from 'react-router-dom';
import CrewArt from './CrewArt';
import { Ribbon } from './ReferenceUI';
import '../auth/account.css';

export default function AuthLayout({ children, signIn = false, recovery = false }) {
  return <main className="df07">
    <div className="df07-shell">
      {signIn && <div className="df07-hero"><Ribbon /><img src="/images/home/nila-kavin.png" alt="" /></div>}
      <div className="df07-content">{children}</div>
      <aside className="df07-help"><CrewArt role="assistant" /><div>
        <strong>{recovery ? 'Check your inbox' : 'Need help?'}</strong>
        <p>{recovery ? 'Check your spam folder if your code hasn’t arrived.' : 'Get help signing in or managing your account.'}</p>
        {!recovery && <Link to="/help">Visit Help</Link>}
      </div></aside>
    </div>
  </main>;
}
