import React from 'react';
import './crew.css';
// Three equal-width transparent panels: hotel host, chef, account assistant.
const positions = { host: '0%', chef: '50%', assistant: '100%' };
export default function CrewArt({role='assistant',className=''}) {
 return <span aria-hidden="true" className={`df-crew-art df-crew-${role} ${className}`} style={{backgroundPosition: `${positions[role] || positions.assistant} bottom`}} />;
}
