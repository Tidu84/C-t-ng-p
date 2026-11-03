import React from 'react';
import './mangaStreetCharacters.css';

type Frame = readonly [number, number, number, number];
const sheets = {
  watcher: { width:1254, height:1254, frames:[[40,0,400,600],[440,0,410,600],[860,0,380,600],[75,580,395,650],[470,580,390,650],[870,580,370,650]] as Frame[] },
  host: { width:1024, height:1536, frames:[[0,0,512,768],[512,0,512,768],[0,768,512,768],[512,768,512,768]] as Frame[] },
  cyclist: { width:1774, height:887, frames:[[0,0,887,887],[887,0,887,887]] as Frame[] },
  vendor: { width:1774, height:887, frames:[[0,0,887,887],[887,0,887,887]] as Frame[] },
};

// Reuse a single decoded atlas per character. Movement switches two illustrated poses in CSS.
function Sprite({sheet,pose=0,walk=false,mono=false,className=''}:{sheet:keyof typeof sheets;pose?:number;walk?:boolean;mono?:boolean;className?:string}) {
  const atlas=sheets[sheet];
  const poses=walk?[pose,pose+1]:[pose];
  return <span className={`manga-illustration ${walk?'manga-illustration-moving':''} ${className}`} style={{filter:mono?'grayscale(1)':undefined}} aria-hidden="true">
    {poses.map((index,i)=><svg key={index} viewBox={atlas.frames[index].join(' ')} preserveAspectRatio="xMidYMax meet" className={`manga-illustration-frame ${walk?`manga-illustration-step-${i}`:''}`}>
      <image href={`/characters/manga-v2/${sheet}.webp`} width={atlas.width} height={atlas.height} />
    </svg>)}
  </span>;
}

export function MangaChessWatcher({action,mono}:{action:string;blink:boolean;hasGlass:boolean;mono:boolean}) {
  const walk=action==='walking_to_stall'||action==='walking_back';
  const pose=walk?3:action==='drinking_sip'?5:action==='calling_drink'?1:['sitting_relax','sitting_down'].includes(action)?0:2;
  return <Sprite sheet="watcher" pose={pose} walk={walk} mono={mono} />;
}

export function MangaTeaHost({pouring,walking=false,mono}:{pouring:boolean;blink:boolean;walking?:boolean;mono:boolean}) {
  return <Sprite sheet="host" pose={walking?2:pouring?1:0} walk={walking} mono={mono} />;
}

export function MangaCyclist({mono}:{mono:boolean}) {
  return <div className="w-44 h-40 sm:w-52 sm:h-48"><Sprite sheet="cyclist" walk mono={mono} /></div>;
}

export function MangaStreetVendor({mono}:{mono:boolean}) {
  return <div className="w-44 h-40 sm:w-52 sm:h-48"><Sprite sheet="vendor" walk mono={mono} /></div>;
}
