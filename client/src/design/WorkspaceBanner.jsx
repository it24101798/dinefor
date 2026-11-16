import CrewArt from './CrewArt';
import React from 'react';
import {Ribbon} from './ReferenceUI';
export default function WorkspaceBanner({eyebrow='DINEFOR WORKSPACE',title,description,artwork,children}){
 return <header className={`df-workspace-banner ${artwork?'has-art':''}`}><div className="df-workspace-copy"><p className="df-kicker">{eyebrow}</p><h1>{title}</h1>{description&&<p>{description}</p>}{children}</div>{artwork&&<div className="df-workspace-art"><Ribbon/>{artwork === "/images/characters/account-concierge.png" ? <CrewArt role="assistant"/> : <img src={artwork} alt=""/>}</div>}</header>;
}
