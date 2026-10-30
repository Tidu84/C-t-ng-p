import React, { useId } from 'react';
import './mangaStreetCharacters.css';

// Small vector drawings: ink contours, flat shadows and hatching, without textures or a render loop.
const ink = '#201e25';
function Drawing({ children, viewBox = '0 0 130 180', mono = false, className = '' }: React.PropsWithChildren<{viewBox?: string; mono?: boolean; className?: string}>) {
  const id = useId().replace(/:/g, '');
  return <svg viewBox={viewBox} className={`w-full h-full overflow-visible ${className}`} aria-hidden="true" style={{filter: mono ? 'grayscale(1)' : undefined}}>
    <defs><pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(24)"><path d="M0 0V5" stroke={ink} strokeWidth=".7" opacity=".3" /></pattern></defs>
    <g stroke={ink} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">{children}</g>
    <path d={viewBox==='0 0 130 180'?'M42 80L48 105L43 121L37 94Z M71 139L77 157L73 164L68 143Z':''} fill={`url(#${id})`} stroke="none" pointerEvents="none" />
  </svg>;
}

function ElderHead({ blink = false, calling = false }: {blink?: boolean;calling?: boolean}) {
  return <g>
    <path d="M47 33L46 48L50 58L60 65L70 60L78 48L75 30Z" fill="#dfb58b" />
    <path d="M68 36L73 43L69 54L61 61L68 60L77 48L75 34Z" fill="#aa7960" stroke="none" />
    <path d="M45 42Q39 39 42 48L48 51M76 42Q82 39 79 48L75 51" fill="#dbab81" />
    <path d="M46 37L43 27L48 21L58 18L72 21L78 29L76 37L69 29L62 33L55 29L50 38" fill="#292a2d" />
    <path d="M45 29L47 20L60 15L73 19L78 29L64 28Z" fill="#9a7049" />
    <path d="M44 29L65 27L83 32L78 36L62 32L45 33Z" fill="#bf9564" />
    <path d="M51 24L62 20L70 23M56 30L70 31" fill="none" strokeWidth=".8" />
    <path d="M49 39L56 37M65 37L73 40" fill="none" strokeWidth="2.1" />
    {blink ? <path d="M50 43L56 44M65 44L71 43" fill="none" /> : <g><path d="M49 43L56 42L54 45M65 42L72 44L67 46" fill="#fff6df" /><path d="M54 42V45M68 43V46" strokeWidth="2.2" /></g>}
    <path d="M61 42L59 51L63 52M49 48L53 50M70 49L73 47M51 54L55 57M68 54L66 58" fill="none" strokeWidth=".8" />
    {calling ? <path d="M57 56Q63 53 68 56L65 61L60 60Z" fill="#482d30" /> : <path d="M56 56L62 57L67 55M59 60L65 60" fill="none" strokeWidth="1" />}
    <path d="M49 34L53 35M68 35L73 36M51 51L54 52M69 51L72 50" fill="none" strokeWidth=".65" />
  </g>;
}

export function MangaChessWatcher({action,blink,hasGlass,mono}:{action:string;blink:boolean;hasGlass:boolean;mono:boolean}) {
  const seated=['sitting_relax','calling_drink','sitting_down'].includes(action);
  const walking=action==='walking_to_stall'||action==='walking_back';
  const calling=action==='calling_drink';
  const drinking=action==='drinking_sip';
  return <Drawing mono={mono}>
    <g transform={seated?'translate(0 18)':''}>
      <g className={walking?'manga-stride-back':''} style={{transformOrigin:'55px 120px'}}>
        <path d={seated?'M48 111L42 124L47 147L58 149L54 126L63 119Z':'M47 112L47 143L43 163L54 165L61 140L64 116Z'} fill="#494b4e" />
        <path d={seated?'M47 145L46 153L63 154L64 150L55 146Z':'M44 161L40 168L59 170L61 166L53 162Z'} fill="#ad8d58" />
      </g>
      <g className={walking?'manga-stride-front':''} style={{transformOrigin:'68px 120px'}}>
        <path d={seated?'M57 112L78 118L83 146L72 149L66 129L49 126Z':'M61 113L68 141L72 164L83 164L80 137L75 112Z'} fill="#647075" />
        <path d={seated?'M73 145L71 154L89 154L91 150L81 146Z':'M72 162L70 169L90 170L92 166L81 162Z'} fill="#c3a36c" />
        <path d={seated?'M77 149L85 151M75 124L78 137':'M73 166L86 167M71 139L77 144'} fill="none" strokeWidth=".8" />
      </g>
      <path d="M53 57L52 68L64 73L70 65L68 58" fill="#dbab81" />
      <path d="M51 65L38 74L35 89L43 96L43 113L75 115L80 91L78 73L68 65L61 71Z" fill="#eee6d0" />
      <path d="M37 83L45 90L44 107L53 113L43 113L42 94L35 88Z M68 71L74 78L73 106L67 114L75 114L80 90L77 74Z" fill="#b5b3a7" stroke="none" />
      <path d="M50 67L55 76L61 71L68 76L70 67M60 74L60 92M65 89L73 88L72 96L65 97Z M44 102L51 107M64 107L71 104" fill="none" strokeWidth="1" />
      <path d={seated?'M39 88L35 105L48 119L55 116L44 102L46 92Z':'M38 88L34 106L41 127L48 126L43 106L46 91Z'} fill="#dfb58b" />
      <path d={calling?'M75 87L87 73L91 54L98 55L96 78L82 98Z':drinking?'M76 88L85 75L73 58L66 61L75 77L68 89Z':seated?'M75 88L84 99L84 77L74 62L68 65L74 80L72 95Z':'M76 88L84 107L79 124L72 122L76 106L69 92Z'} fill="#dfb58b" />
      {calling&&<path d="M91 56L88 48L90 45L94 50L94 40L97 39L99 51L102 44L105 45L103 57L98 61Z" fill="#dfb58b" />}
      <ElderHead blink={blink} calling={calling} />
      {(hasGlass||drinking)&&<g transform={drinking?'translate(0 -57) rotate(-15 79 119)':''}><path d="M73 112L86 112L84 130L76 130Z" fill="#e6c579" /><path d="M76 115L83 115M79 116V126" stroke="#fff4d5" strokeWidth="1.2" /><path d="M83 108L80 124" stroke="#556d65" /></g>}
      <path d="M48 79L52 84M47 91L50 95M68 81L72 85M47 117L51 119M74 137L77 140" fill="none" strokeWidth=".65" />
    </g>
  </Drawing>;
}

export function MangaTeaHost({pouring,blink,mono}:{pouring:boolean;blink:boolean;mono:boolean}) {
  return <Drawing mono={mono}>
    <path d="M50 126L48 161L57 164L63 130M66 129L68 162L77 162L77 125" fill="#293b42" />
    <path d="M48 160L44 167L60 168L60 163M68 161L67 168L84 168L82 164L76 160" fill="#343037" />
    <path d="M49 53L48 65L39 73L37 101L43 124L79 124L84 83L77 70L67 65L66 55" fill="#516d72" />
    <path d="M73 72L80 79L77 118L81 122L85 83L77 70Z" fill="#2e4b53" stroke="none" />
    <path d="M49 65L57 74L65 68L72 75L68 65M44 95L52 99M76 99L70 105" fill="none" />
    <path d="M48 70L51 91L69 91L71 72M50 86L45 134L80 134L71 86Z" fill="#d6b88e" />
    <path d="M69 91L75 131L80 134L71 86Z" fill="#a5805e" stroke="none" />
    <path d="M53 107L69 107L67 120L55 120Z M54 126L53 132M72 123L74 131" fill="none" strokeWidth="1" />
    <path d="M40 81L32 99L37 115L45 111L40 99L46 84Z" fill="#e5c2a2" />
    <path d={pouring?'M80 82L90 96L106 89L110 96L88 107L73 89Z':'M80 82L90 97L100 77L107 81L96 108L88 109L73 90Z'} fill="#e5c2a2" />
    <path d="M48 31L44 44L49 57L59 64L69 59L77 45L72 29Z" fill="#edcbae" />
    <path d="M67 34L72 41L69 53L61 61L69 58L77 45L73 32Z" fill="#c1957e" stroke="none" />
    <path d="M46 42Q40 39 43 49L48 51" fill="#edcbae" />
    <path d="M43 43L40 27L46 18L58 14L71 18L79 29L77 45L71 32L64 35L61 25L54 34L51 27L47 42Z" fill="#28272e" />
    <path d="M68 16Q64 4 75 5Q85 7 80 18L76 23" fill="#28272e" />
    <path d="M46 25L54 21M65 22L73 27M70 12L76 10" fill="none" stroke="#a8a1a0" strokeWidth=".75" />
    <path d="M48 39L55 37M65 38L72 40" fill="none" strokeWidth="1.6" />
    {blink?<path d="M49 44L55 44M65 44L71 44" fill="none" />:<g><path d="M48 43L55 41L54 46L50 46Z M64 42L72 44L69 47L65 46Z" fill="#fff4e1" /><path d="M53 42V45M67 43V46" strokeWidth="2" /></g>}
    <path d="M60 44L58 51L62 51M55 56L62 57L66 54M57 60L62 61" fill="none" strokeWidth=".8" />
    <path d="M46 34L48 36M71 49L73 47M49 51L52 53M57 78L60 83" strokeWidth=".65" fill="none" />
    {pouring?<g transform="rotate(25 109 93)"><path d="M103 84L116 84L119 102L100 102Z" fill="#9b5748" /><path d="M104 84L105 80L114 80L115 84M102 88Q92 87 96 97L101 98M117 92L126 88L123 96L119 97" fill="none" /><path d="M105 87V97" stroke="#e1b898" /></g>:<path d="M100 80L98 72L100 69L104 74L106 66L109 67L110 77L106 84Z" fill="#edcbae" />}
    {pouring&&<path d="M125 96Q127 108 123 119" stroke="#e2c582" strokeWidth="1.8" strokeDasharray="3 3" className="animate-tea-flow" fill="none" />}
  </Drawing>;
}

export function MangaCyclist({mono}:{mono:boolean}) {
  return <div className="w-44 h-32 sm:w-52 sm:h-36"><Drawing mono={mono} viewBox="0 0 260 185">
    <ellipse cx="132" cy="177" rx="106" ry="5" fill="#151821" opacity=".25" stroke="none" />
    {[49,211].map(x=><g key={x}><circle cx={x} cy="137" r="35" fill="#e9dfc7" fillOpacity=".08" strokeWidth="4" /><g className="manga-wheel" style={{transformOrigin:`${x}px 137px`}}>{[0,45,90,135].map(a=><path key={a} d={`M${x-32} 137H${x+32}`} transform={`rotate(${a} ${x} 137)`} stroke="#bdb7ab" strokeWidth=".9" />)}</g><circle cx={x} cy="137" r="3" fill="#ddd3bc" /></g>)}
    <path d="M49 137L105 83L127 137L49 137L185 85L211 137M105 83L185 85M100 79L119 79M184 85L181 70L197 66" fill="none" stroke="#385d64" strokeWidth="4" />
    <path d="M101 83L117 105L143 125L136 132L106 112L87 90" fill="#3e4857" className="manga-pedal-back" />
    <path d="M94 75L109 81L123 111L113 139L102 138L109 113L92 96Z" fill="#566276" className="manga-pedal-front" />
    <path d="M102 137L117 139L119 144L98 143Z" fill="#ded7c6" />
    <path d="M91 79L102 46L121 29L141 42L125 67L110 85Z" fill="#a35743" />
    <path d="M103 47L112 44L105 69L110 82L99 81L94 75Z" fill="#6d3e38" stroke="none" />
    <path d="M122 45L146 61L174 69L174 76L142 72L115 56Z" fill="#d9b393" />
    <path d="M128 30L132 22L143 23L145 34L138 40Z" fill="#d9b393" />
    <path d="M131 12L145 10L154 19L152 31L144 38L138 34L134 24Z" fill="#e3bea0" />
    <path d="M129 24L125 12L132 14L130 5L140 9L147 6L155 15L153 23L146 18L140 22L137 17L134 26Z" fill="#28272e" />
    <path d="M143 26L149 25M147 29L152 30L149 32M143 34L147 35M116 47L120 51M103 58L106 53M99 91L104 95" fill="none" strokeWidth=".9" />
    <path d="M90 45L102 37L111 44L103 70L89 68Z" fill="#d4bd8e" /><path d="M94 47L101 48M91 57L98 59" fill="none" />
  </Drawing></div>;
}

export function MangaStreetVendor({mono}:{mono:boolean}) {
  return <div className="w-44 h-40 sm:w-52 sm:h-44"><Drawing mono={mono} viewBox="0 0 200 190">
    <ellipse cx="101" cy="183" rx="83" ry="4" fill="#171821" opacity=".2" stroke="none" />
    <g className="manga-stride-back" style={{transformOrigin:'99px 122px'}}><path d="M91 116L90 146L80 177L91 179L105 146L109 119Z" fill="#3c4552" /><path d="M81 175L75 181L95 182L96 177Z" fill="#c4ac84" /></g>
    <g className="manga-stride-front" style={{transformOrigin:'104px 123px'}}><path d="M101 118L113 148L113 179L125 179L125 144L116 117Z" fill="#535c68" /><path d="M114 177L112 183L135 183L132 179L123 177Z" fill="#c4ac84" /></g>
    <path d="M87 63L77 80L83 119L119 121L122 81L109 64Z" fill="#87758b" /><path d="M81 81L88 89L85 117L81 113L77 82Z M112 75L117 91L113 119L119 120L122 81Z" fill="#5d536a" stroke="none" />
    <path d="M89 68L99 78L107 69M95 80L99 113M88 101L93 105M109 105L115 98" fill="none" strokeWidth=".9" />
    <path d="M82 79L73 91L62 71L68 67L79 78L86 75M119 82L132 92L139 72L145 74L140 104L130 106L114 91" fill="#cba487" />
    <path d="M98 54L95 67L102 73L110 66L108 53" fill="#cba487" />
    <path d="M88 34L88 47L95 59L106 62L116 51L118 34Z" fill="#d8b295" /><path d="M107 38L110 53L103 60L109 58L116 51L117 37Z" fill="#ae846f" stroke="none" />
    <path d="M90 43L97 41M107 42L113 43M101 43L99 51L103 51M97 56L105 55M92 50L95 52M109 50L113 48" fill="none" strokeWidth="1" />
    <path d="M86 42L83 28L97 22L116 28L120 43L113 35L108 38L103 32L94 38Z" fill="#343036" />
    <path d="M101 10L69 35Q98 43 134 35Z" fill="#dfc894" /><path d="M101 13L84 35M101 13L116 36M72 35L130 35" fill="none" stroke="#85714f" strokeWidth=".8" />
    <g className="manga-yoke" style={{transformOrigin:'103px 72px'}}><path d="M19 78Q99 60 181 78" fill="none" stroke="#7c6140" strokeWidth="3.5" />
      {[30,169].map(x=><g key={x}><path d={`M${x} 77L${x-18} 132M${x} 77L${x+17} 132`} fill="none" strokeWidth="1" /><path d={`M${x-23} 131L${x-17} 154Q${x} 162 ${x+17} 154L${x+23} 131Z`} fill="#b99962" /><ellipse cx={x} cy="131" rx="23" ry="6" fill="#d7c08b" />{[-12,-5,3,11].map(dx=><path key={dx} d={`M${x+dx} 137L${x+dx+2} 154`} stroke="#755c42" strokeWidth=".7" />)}<path d={`M${x-18} 143H${x+19}M${x-16} 149H${x+17}`} stroke="#755c42" strokeWidth=".8" /></g>)}
    </g>
  </Drawing></div>;
}
