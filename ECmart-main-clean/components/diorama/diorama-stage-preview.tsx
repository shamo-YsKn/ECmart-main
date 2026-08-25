import { getDioramaStage } from "@/lib/diorama-stages"
import { cn } from "@/lib/utils"

function StageArtwork({ atmosphere }: { atmosphere: string }) {
  if (atmosphere === "campus") {
    return (
      <>
        <rect width="640" height="360" fill="#dcebf3" />
        <rect y="244" width="640" height="116" fill="#b7c99a" />
        <rect x="130" y="128" width="380" height="142" rx="8" fill="#d9d4c8" stroke="#53636a" strokeWidth="6" />
        <rect x="166" y="166" width="62" height="45" fill="#78a9c2" /><rect x="252" y="166" width="62" height="45" fill="#78a9c2" /><rect x="338" y="166" width="62" height="45" fill="#78a9c2" /><rect x="424" y="166" width="50" height="45" fill="#78a9c2" />
        <rect x="286" y="215" width="68" height="55" fill="#596a70" />
        <text x="320" y="115" textAnchor="middle" fontSize="25" fontWeight="800" fill="#405057">MURORAN IT</text>
      </>
    )
  }
  if (atmosphere === "cape") {
    return (
      <>
        <rect width="640" height="360" fill="#cde9f7" />
        <rect y="210" width="640" height="150" fill="#4b9dbd" />
        <path d="M0 275 C110 225 175 230 245 260 C185 292 165 325 142 360 H0 Z" fill="#66855b" />
        <path d="M0 315 C110 265 160 278 205 300 L145 360 H0 Z" fill="#4f6650" />
        <rect x="93" y="174" width="9" height="88" fill="#f4f1e6" /><path d="M73 180 H121 L111 162 H83 Z" fill="#f4f1e6" stroke="#68777b" strokeWidth="4" />
        <circle cx="520" cy="85" r="30" fill="#f5d470" />
      </>
    )
  }
  if (atmosphere === "bridge") {
    return (
      <>
        <rect width="640" height="360" fill="#c7dce8" />
        <rect y="228" width="640" height="132" fill="#4d8ca5" />
        <path d="M65 238 H580" stroke="#f1f0e7" strokeWidth="12" />
        <path d="M150 82 V244 M495 82 V244" stroke="#ecebe4" strokeWidth="14" />
        <path d="M150 95 C245 175 400 175 495 95" fill="none" stroke="#ecebe4" strokeWidth="7" />
        {Array.from({ length: 11 }, (_, i) => <path key={i} d={`M${165 + i * 31} ${112 + Math.abs(5 - i) * 8} V235`} stroke="#ecebe4" strokeWidth="3" />)}
      </>
    )
  }
  if (atmosphere === "factory-night") {
    return (
      <>
        <rect width="640" height="360" fill="#172936" />
        <rect y="250" width="640" height="110" fill="#24353d" />
        <rect x="80" y="182" width="120" height="92" fill="#65757a" /><rect x="215" y="143" width="150" height="131" fill="#55666d" /><rect x="390" y="196" width="170" height="78" fill="#718087" />
        <rect x="122" y="74" width="24" height="140" fill="#89969a" /><rect x="300" y="60" width="20" height="112" fill="#89969a" /><rect x="465" y="98" width="18" height="116" fill="#89969a" />
        <path d="M95 190 H510 M180 157 H530 M245 118 H470" stroke="#b3bec0" strokeWidth="9" fill="none" />
        {[105,150,245,290,345,415,460,515].map((x) => <circle key={x} cx={x} cy="218" r="6" fill="#f2c96d" />)}
      </>
    )
  }
  if (atmosphere === "mountain") {
    return (
      <>
        <rect width="640" height="360" fill="#d6e6ef" />
        <path d="M0 300 L130 165 L215 252 L325 126 L455 265 L545 190 L640 288 V360 H0 Z" fill="#688264" />
        <path d="M0 322 L160 235 L252 305 L385 210 L510 310 L640 260 V360 H0 Z" fill="#506c58" />
        <g fill="#d8d0b9">{Array.from({ length: 18 }, (_, i) => <rect key={i} x={30 + (i % 9) * 67} y={295 + Math.floor(i / 9) * 25} width="38" height="18" />)}</g>
        <path d="M322 126 V58" stroke="#596a70" strokeWidth="8" /><path d="M300 72 H344 M307 91 H337" stroke="#596a70" strokeWidth="6" />
      </>
    )
  }
  if (atmosphere === "harbor") {
    return (
      <>
        <rect width="640" height="360" fill="#d2e7f2" />
        <rect y="222" width="640" height="138" fill="#4d91aa" />
        <rect x="0" y="255" width="640" height="18" fill="#8c8b82" />
        <path d="M95 250 V115 H110 V250 M110 125 L195 177 M195 177 V250" fill="none" stroke="#53666d" strokeWidth="10" />
        <path d="M360 252 V145 H374 V252 M374 154 L460 205 M460 205 V252" fill="none" stroke="#53666d" strokeWidth="10" />
        <path d="M230 244 H330 L350 264 H212 Z" fill="#efe7d2" stroke="#596970" strokeWidth="5" />
      </>
    )
  }
  return (
    <>
      <rect width="640" height="360" fill="#eadfc9" />
      <rect y="252" width="640" height="108" fill="#c9b692" />
      <rect x="72" y="90" width="190" height="145" rx="8" fill="#8a765b" />
      <rect x="92" y="111" width="150" height="16" fill="#d8c9ad" />
      <rect x="92" y="151" width="150" height="16" fill="#d8c9ad" />
      <rect x="92" y="191" width="150" height="16" fill="#d8c9ad" />
      <path d="M380 255 V110 M330 255 V160 M430 255 V175" stroke="#697277" strokeWidth="18" />
      <circle cx="380" cy="95" r="35" fill="#c7a04a" stroke="#536168" strokeWidth="6" />
    </>
  )
}

export function DioramaStagePreview({ stageId, className, showLabel = true }: { stageId: string; className?: string; showLabel?: boolean }) {
  const stage = getDioramaStage(stageId)
  if (!stage) return null
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <svg viewBox="0 0 640 360" className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${stage.label}のジオラマ背景プレビュー`}>
        <StageArtwork atmosphere={stage.atmosphere} />
      </svg>
      {showLabel && <div className="absolute inset-x-0 bottom-0 bg-black/45 px-3 py-2 text-sm font-black text-white backdrop-blur-[2px]">{stage.emoji} {stage.label}</div>}
    </div>
  )
}
