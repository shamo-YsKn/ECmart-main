import type { MuroranSpot } from "@/lib/mural-spots"

function Gear({ x, y, r, opacity = 0.35 }: { x: number; y: number; r: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <circle r={r} fill="none" stroke="#344853" strokeWidth="6" />
      <circle r={r * 0.35} fill="none" stroke="#344853" strokeWidth="5" />
      {Array.from({ length: 8 }, (_, index) => (
        <rect key={index} x={-4} y={-r - 8} width="8" height="13" rx="2" fill="#344853" transform={`rotate(${index * 45})`} />
      ))}
    </g>
  )
}

function SkyGradient({ id, night = false }: { id: string; night?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      {night ? (
        <>
          <stop offset="0" stopColor="#172635" />
          <stop offset="0.58" stopColor="#38495b" />
          <stop offset="1" stopColor="#846f5d" />
        </>
      ) : (
        <>
          <stop offset="0" stopColor="#cce7ee" />
          <stop offset="0.64" stopColor="#f2e9d9" />
          <stop offset="1" stopColor="#ead7bd" />
        </>
      )}
    </linearGradient>
  )
}

export function MuralBackground({ spot }: { spot: MuroranSpot }) {
  const gid = `mural-${spot.id.replace(/[^a-z0-9-]/gi, "")}`
  const night = spot.theme === "port" || spot.theme === "mountain" || spot.theme === "industrial"

  return (
    <svg viewBox="0 0 1000 560" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <SkyGradient id={`${gid}-sky`} night={night} />
        <linearGradient id={`${gid}-ground`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#81756a" />
          <stop offset="0.5" stopColor="#a59a8c" />
          <stop offset="1" stopColor="#736a62" />
        </linearGradient>
      </defs>
      <rect width="1000" height="560" fill={`url(#${gid}-sky)`} />

      {spot.theme === "university" && (
        <>
          <rect y="372" width="1000" height="188" fill="#c8b594" />
          <path d="M80 370 V236 H430 V370 M108 263 H402 M145 236 V195 H365 V236" fill="#ddd6ca" stroke="#59666b" strokeWidth="8" />
          {Array.from({ length: 8 }, (_, index) => <rect key={index} x={120 + index * 37} y="282" width="23" height="39" rx="3" fill="#83a8b6" opacity=".75" />)}
          <path d="M690 342 V151 H710 V342 M677 167 H723 L700 95 Z" fill="#d7d7d5" stroke="#536269" strokeWidth="6" />
          <path d="M700 95 C725 126 738 155 728 178 M700 95 C675 126 662 155 672 178" fill="none" stroke="#d95f1e" strokeWidth="7" />
          <Gear x={550} y={275} r={52} opacity={0.22} />
          <Gear x={880} y={245} r={34} opacity={0.18} />
          <path d="M0 418 H1000" stroke="#6d665f" strokeWidth="9" />
        </>
      )}

      {spot.theme === "university-tech" && (
        <>
          {/*
            室工大 第2壁画「研究エリア」。
            参考イメージの3Dジオラマ構図を、そのまま立体化せず、
            壁画として読みやすいパノラマ型の2Dイラストへ整理。
            左=機械・ロボット / 中央=建築 / 右=化学。
          */}

          {/* 室蘭の遠景：海・白鳥大橋・丘・工場 */}
          <rect y="208" width="1000" height="180" fill="#79a8bd" opacity=".62" />
          <path d="M0 246 C150 220 255 236 374 224 C514 208 655 234 1000 214 V342 H0 Z" fill="#4f8fa7" opacity=".8" />
          <path d="M0 205 C105 164 166 174 242 207 C322 235 390 213 452 178 C535 132 632 148 708 199 C802 262 892 171 1000 190 V268 H0 Z" fill="#78936c" opacity=".86" />

          {/* 白鳥大橋 */}
          <g opacity=".86">
            <path d="M32 217 H365" stroke="#eef1ed" strokeWidth="8" />
            <path d="M105 219 V119 M288 219 V104" stroke="#eef1ed" strokeWidth="9" />
            <path d="M105 130 C158 165 224 170 288 115" fill="none" stroke="#eef1ed" strokeWidth="5" />
            {Array.from({ length: 6 }, (_, index) => {
              const x = 127 + index * 27
              return <path key={index} d={`M${x} ${143 + Math.abs(2.5 - index) * 8} V216`} stroke="#eef1ed" strokeWidth="2.5" />
            })}
          </g>

          {/* 工場のシルエット */}
          <g opacity=".72">
            <rect x="724" y="181" width="196" height="82" fill="#64747a" />
            <rect x="755" y="135" width="18" height="128" fill="#75858a" />
            <rect x="828" y="119" width="16" height="144" fill="#75858a" />
            <rect x="888" y="157" width="14" height="106" fill="#75858a" />
            <path d="M711 226 H949 M744 196 H921" stroke="#89989c" strokeWidth="8" />
          </g>

          {/* 中景：室工大キャンパス。時計塔を中央軸にする */}
          <g>
            <path d="M285 326 V226 H475 V326 M525 326 V226 H715 V326" fill="#ddd9cf" stroke="#52636a" strokeWidth="7" />
            <path d="M475 326 V185 H525 V326" fill="#e5e0d4" stroke="#52636a" strokeWidth="7" />
            <rect x="487" y="214" width="26" height="30" rx="4" fill="#8aa8b3" stroke="#52636a" strokeWidth="4" />
            <circle cx="500" cy="202" r="12" fill="#f2eee2" stroke="#52636a" strokeWidth="4" />
            <path d="M500 190 V202 L507 207" stroke="#52636a" strokeWidth="3" strokeLinecap="round" />
            {Array.from({ length: 5 }, (_, index) => (
              <rect key={`l-${index}`} x={306 + index * 31} y="251" width="19" height="27" rx="2" fill="#84a9b7" opacity=".84" />
            ))}
            {Array.from({ length: 5 }, (_, index) => (
              <rect key={`r-${index}`} x={546 + index * 31} y="251" width="19" height="27" rx="2" fill="#84a9b7" opacity=".84" />
            ))}
            <path d="M500 326 C455 347 422 363 386 389 M500 326 C545 347 578 363 614 389" fill="none" stroke="#d8cbb4" strokeWidth="20" strokeLinecap="round" />
          </g>

          {/* 研究分野を3つの連続した前景パネルに分ける */}
          <path d="M0 365 H330 L312 522 H0 Z" fill="#687d87" fillOpacity=".88" stroke="#43565e" strokeWidth="7" />
          <path d="M330 365 H670 L690 522 H312 Z" fill="#c6ad78" fillOpacity=".88" stroke="#695d49" strokeWidth="7" />
          <path d="M670 365 H1000 V522 H690 Z" fill="#6d8d68" fillOpacity=".9" stroke="#435e48" strokeWidth="7" />

          {/* 左：機械・ロボット */}
          <g transform="translate(32 363)">
            <Gear x={56} y={101} r={34} opacity={0.78} />
            <Gear x={126} y={125} r={24} opacity={0.64} />
            <rect x="150" y="58" width="112" height="80" rx="7" fill="#83939a" stroke="#344853" strokeWidth="6" />
            <rect x="172" y="77" width="60" height="32" fill="#315a68" opacity=".9" />
            <path d="M230 58 V34" stroke="#344853" strokeWidth="8" />
            <g transform="translate(36 9)">
              <circle cx="0" cy="0" r="17" fill="#c9a24b" stroke="#344853" strokeWidth="6" />
              <path d="M15 -2 L72 -31 L101 -4 L77 28 L123 53" fill="none" stroke="#d0d4d2" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="72" cy="-31" r="10" fill="#c9a24b" stroke="#344853" strokeWidth="5" />
              <circle cx="77" cy="28" r="10" fill="#c9a24b" stroke="#344853" strokeWidth="5" />
              <path d="M119 48 l22 -8 l-7 22 z" fill="#c9a24b" stroke="#344853" strokeWidth="4" />
            </g>
            <path d="M150 140 H270" stroke="#dbe2e3" strokeWidth="4" strokeDasharray="13 8" />
          </g>

          {/* 中央：建築。木造フレーム + 建物模型 + 製図 */}
          <g transform="translate(346 372)">
            <g stroke="#775f3d" strokeWidth="6" fill="none" strokeLinejoin="round">
              <path d="M18 104 V28 H132 V104 M18 28 L75 0 L132 28 M44 104 V45 H106 V104" />
              <path d="M18 52 H132 M18 78 H132 M44 45 L75 22 L106 45" />
              <path d="M18 28 L132 104 M132 28 L18 104" opacity=".45" />
            </g>
            <g transform="translate(154 36)">
              <path d="M0 72 V18 H118 V72 H78 V45 H42 V72 Z" fill="#e9e4d7" stroke="#5d6b70" strokeWidth="5" />
              <rect x="13" y="31" width="24" height="18" fill="#86aebd" /><rect x="81" y="31" width="24" height="18" fill="#86aebd" />
              <path d="M0 18 L58 0 L118 18" fill="#d5d1c8" stroke="#5d6b70" strokeWidth="5" />
            </g>
            <path d="M82 132 H270 L241 157 H47 Z" fill="#e7dfcc" stroke="#695d49" strokeWidth="5" />
            <path d="M102 138 L148 148 M133 135 L176 149 M193 137 L224 145" stroke="#71838a" strokeWidth="3" />
          </g>

          {/* 右：化学。大型フラスコ、試験管、分子、顕微鏡 */}
          <g transform="translate(699 352)">
            <path d="M52 15 H84 V62 L31 142 Q21 160 44 165 H110 Q133 160 123 142 L72 62 V15 H104" fill="#a8dce4" fillOpacity=".55" stroke="#49646d" strokeWidth="6" />
            <path d="M43 128 Q78 112 115 129" fill="none" stroke="#3e99b1" strokeWidth="8" />
            <rect x="144" y="79" width="122" height="79" rx="5" fill="#bdc9c2" fillOpacity=".56" stroke="#49646d" strokeWidth="5" />
            {Array.from({ length: 5 }, (_, index) => (
              <g key={index}>
                <rect x={155 + index * 22} y="51" width="12" height="90" rx="6" fill={index % 2 ? "#8acfb7" : "#77b9d4"} fillOpacity=".7" stroke="#49646d" strokeWidth="3" />
                <path d={`M${158 + index * 22} 112 H${164 + index * 22}`} stroke={index % 2 ? "#4ca67e" : "#3b8eae"} strokeWidth="8" />
              </g>
            ))}
            <g transform="translate(224 4)" stroke="#425a62" strokeWidth="4" fill="none">
              <circle cx="0" cy="0" r="9" fill="#d9b658" />
              <circle cx="43" cy="22" r="9" fill="#77a8cb" />
              <circle cx="73" cy="-10" r="9" fill="#88b778" />
              <circle cx="105" cy="19" r="9" fill="#d68b74" />
              <path d="M8 4 L35 18 M51 15 L65 -3 M81 -4 L98 14" />
            </g>
            <g transform="translate(269 86)">
              <path d="M18 0 H50 L58 22 L44 37 L64 73 H18 L34 36 L20 21 Z" fill="#d8ddd9" stroke="#41575f" strokeWidth="5" />
              <path d="M46 36 H72 M62 36 V80 M26 80 H82" stroke="#41575f" strokeWidth="7" strokeLinecap="round" />
            </g>
          </g>

          {/* 分野の色帯。ロボット配置を邪魔しないよう下端へ */}
          <rect x="15" y="510" width="295" height="34" rx="12" fill="#344f61" opacity=".93" />
          <rect x="352" y="510" width="296" height="34" rx="12" fill="#8d6738" opacity=".93" />
          <rect x="690" y="510" width="295" height="34" rx="12" fill="#406248" opacity=".93" />
          <text x="162" y="533" textAnchor="middle" fontSize="19" fontWeight="900" fill="#f6f3ea">MECHANICAL / ROBOTICS</text>
          <text x="500" y="533" textAnchor="middle" fontSize="19" fontWeight="900" fill="#fff7e8">ARCHITECTURE</text>
          <text x="838" y="533" textAnchor="middle" fontSize="19" fontWeight="900" fill="#f2f8ef">CHEMICAL SCIENCE</text>
        </>
      )}

      {spot.theme === "cape" && (
        <>
          <rect y="315" width="1000" height="245" fill="#6e9cab" />
          <path d="M0 390 C160 360 245 415 390 382 C540 348 665 415 1000 370 V560 H0 Z" fill="#447c8c" opacity=".72" />
          <path d="M0 436 C210 397 332 470 520 425 C700 383 820 452 1000 412 V560 H0 Z" fill="#326c7b" opacity=".66" />
          <path d="M42 426 C180 348 278 338 402 390 L402 560 H0 V468 Z" fill="#65755f" />
          <path d="M258 363 V216 H295 V363 Z" fill="#f6f1e5" stroke="#58656a" strokeWidth="7" />
          <path d="M246 223 H308 L294 194 H260 Z" fill="#d95f1e" stroke="#58656a" strokeWidth="6" />
          <circle cx="277" cy="247" r="10" fill="#4c6976" />
          <path d="M610 315 H1000" stroke="#f4efe8" strokeOpacity=".55" strokeWidth="4" strokeDasharray="22 16" />
        </>
      )}

      {spot.theme === "bridge" && (
        <>
          <rect y="330" width="1000" height="230" fill="#5f91a6" />
          <path d="M0 390 C220 355 430 420 620 380 C770 350 860 385 1000 365 V560 H0 Z" fill="#477d91" />
          <path d="M120 336 H880" stroke="#e7e6df" strokeWidth="14" />
          <path d="M220 336 V154 M780 336 V154" stroke="#e7e6df" strokeWidth="16" />
          <path d="M220 161 C350 205 420 260 500 333 C585 252 660 203 780 161" fill="none" stroke="#e7e6df" strokeWidth="9" />
          {Array.from({ length: 9 }, (_, index) => {
            const x = 260 + index * 60
            const y = 185 + Math.abs(500 - x) * 0.24
            return <line key={index} x1={x} y1={y} x2={x} y2="335" stroke="#e7e6df" strokeWidth="4" />
          })}
          <circle cx="890" cy="170" r="34" fill="#f4d186" opacity=".55" />
        </>
      )}

      {spot.theme === "mountain" && (
        <>
          <circle cx="795" cy="112" r="46" fill="#f5db9c" opacity=".78" />
          {Array.from({ length: 24 }, (_, index) => <circle key={index} cx={(index * 173) % 980 + 10} cy={(index * 71) % 205 + 20} r={(index % 3) + 1.5} fill="#fff8dd" opacity=".7" />)}
          <path d="M0 438 L166 330 L290 386 L430 255 L560 362 L708 288 L1000 430 V560 H0 Z" fill="#334b4a" />
          <path d="M0 474 L215 390 L355 448 L538 350 L710 418 L870 355 L1000 412 V560 H0 Z" fill="#233a3d" />
          <path d="M508 338 V170 M486 190 H530 M495 230 H521" stroke="#c7c2b8" strokeWidth="8" />
          <path d="M470 200 L508 128 L546 200 Z" fill="none" stroke="#c7c2b8" strokeWidth="6" />
        </>
      )}

      {spot.theme === "port" && (
        <>
          <rect y="350" width="1000" height="210" fill="#365f70" />
          <path d="M0 420 C220 390 350 438 535 408 C750 374 860 424 1000 398 V560 H0 Z" fill="#294f60" />
          <path d="M92 386 V195 H112 V386 M104 202 L258 264 M258 264 V390" fill="none" stroke="#a98e69" strokeWidth="13" />
          <path d="M350 385 V235 H371 V385 M360 244 L480 290 M480 290 V390" fill="none" stroke="#b79c76" strokeWidth="11" />
          <rect x="610" y="298" width="226" height="90" fill="#67747a" stroke="#263943" strokeWidth="7" />
          <rect x="650" y="258" width="80" height="40" fill="#78878e" stroke="#263943" strokeWidth="6" />
          <path d="M610 388 H860 L820 424 H570 Z" fill="#4a5b62" />
          {Array.from({ length: 6 }, (_, index) => <rect key={index} x={95 + index * 80} y="405" width="62" height="30" fill={index % 2 ? "#8d623f" : "#6e7f78"} opacity=".9" />)}
        </>
      )}

      {spot.theme === "industrial" && (
        <>
          {Array.from({ length: 24 }, (_, index) => <circle key={index} cx={(index * 131) % 970 + 15} cy={(index * 53) % 235 + 22} r={(index % 3) + 1.4} fill="#fff3cf" opacity=".55" />)}
          <rect y="400" width="1000" height="160" fill="#27373d" />
          <rect x="80" y="292" width="210" height="125" fill="#4d5b60" stroke="#25343a" strokeWidth="7" />
          <rect x="344" y="245" width="235" height="172" fill="#55646a" stroke="#25343a" strokeWidth="7" />
          <rect x="650" y="310" width="264" height="108" fill="#47585f" stroke="#25343a" strokeWidth="7" />
          <path d="M155 292 V126 H190 V292 M432 245 V92 H469 V245 M775 310 V156 H810 V310" fill="#647278" stroke="#25343a" strokeWidth="7" />
          <path d="M110 330 H860 M128 365 H925 M280 272 H690" fill="none" stroke="#9d8b75" strokeWidth="13" strokeLinecap="round" />
          <path d="M310 206 C345 206 351 176 382 176 H653 C682 176 688 213 720 213" fill="none" stroke="#7f8e93" strokeWidth="17" />
          {Array.from({ length: 10 }, (_, index) => <circle key={index} cx={115 + index * 82} cy={386 - (index % 2) * 54} r="6" fill={index % 3 === 0 ? "#e79c57" : "#f3d88d"} opacity=".9" />)}
          <path d="M172 124 C142 93 154 62 129 34 M449 91 C423 64 442 39 420 17 M792 155 C762 128 780 102 756 79" fill="none" stroke="#b4bcc0" strokeWidth="12" strokeLinecap="round" opacity=".22" />
        </>
      )}

      {spot.theme === "workshop" && (
        <>
          <rect y="385" width="1000" height="175" fill={`url(#${gid}-ground)`} />
          <rect x="75" y="184" width="850" height="216" rx="12" fill="#9c9790" stroke="#394b53" strokeWidth="10" />
          <path d="M75 238 H925 M75 290 H925 M75 342 H925" stroke="#59676c" strokeWidth="6" opacity=".65" />
          <rect x="394" y="250" width="212" height="150" fill="#5e6668" stroke="#35464e" strokeWidth="8" />
          <Gear x={244} y={265} r={55} opacity={0.48} />
          <Gear x={770} y={280} r={43} opacity={0.42} />
          <path d="M156 355 L282 225 M824 352 L714 218" stroke="#d8c7ac" strokeWidth="17" strokeLinecap="round" />
        </>
      )}

      {spot.theme === "yakitori" && (
        <>
          <rect y="382" width="1000" height="178" fill="#6d5140" />
          <rect x="108" y="150" width="784" height="260" rx="10" fill="#8d6045" stroke="#4d362b" strokeWidth="10" />
          <rect x="170" y="180" width="660" height="70" fill="#ead7bd" />
          {Array.from({ length: 7 }, (_, index) => <path key={index} d={`M${170 + index * 94} 180 V250`} stroke="#b55b37" strokeWidth="5" />)}
          <path d="M500 255 V410" stroke="#4d362b" strokeWidth="8" />
          <circle cx="350" cy="332" r="54" fill="#3f352e" opacity=".8" />
          {Array.from({ length: 5 }, (_, index) => <path key={index} d={`M${305 + index * 22} 356 L${333 + index * 16} 288`} stroke="#d8b071" strokeWidth="7" strokeLinecap="round" />)}
          <path d="M650 350 C628 315 670 294 650 260 C630 228 672 212 662 177" fill="none" stroke="#f1d7c0" strokeWidth="8" strokeLinecap="round" opacity=".6" />
        </>
      )}

      {spot.theme === "ramen" && (
        <>
          <rect y="390" width="1000" height="170" fill="#a36b3e" />
          <rect x="95" y="155" width="810" height="255" rx="12" fill="#d5a34f" stroke="#5c4630" strokeWidth="10" />
          <rect x="180" y="178" width="640" height="62" fill="#f4e6c7" />
          <path d="M500 240 V410" stroke="#725333" strokeWidth="8" />
          <path d="M320 342 Q500 420 680 342 L640 410 H360 Z" fill="#f2e6d1" stroke="#5c4630" strokeWidth="7" />
          <path d="M382 342 C395 310 414 302 408 268 M470 338 C485 303 503 296 496 254 M566 337 C580 306 600 296 592 261" fill="none" stroke="#fff7e9" strokeOpacity=".72" strokeWidth="9" strokeLinecap="round" />
        </>
      )}

      {spot.theme === "farm" && (
        <>
          <rect y="355" width="1000" height="205" fill="#93a777" />
          <path d="M0 420 C180 354 318 435 488 385 C685 326 798 421 1000 360 V560 H0 Z" fill="#748c63" />
          <rect x="120" y="226" width="290" height="170" fill="#efe6cf" stroke="#647064" strokeWidth="8" />
          <path d="M100 226 L265 125 L430 226 Z" fill="#b2765c" stroke="#647064" strokeWidth="8" />
          {Array.from({ length: 6 }, (_, index) => <ellipse key={index} cx={570 + (index % 3) * 100} cy={315 + Math.floor(index / 3) * 84} rx="38" ry="49" fill="#f3ead2" stroke="#b29f7d" strokeWidth="5" opacity=".9" />)}
          <circle cx="825" cy="122" r="48" fill="#f3d485" opacity=".72" />
        </>
      )}

      {spot.theme === "diner" && (
        <>
          <rect y="388" width="1000" height="172" fill="#665d59" />
          <rect x="95" y="155" width="810" height="255" rx="12" fill="#55575a" stroke="#323b40" strokeWidth="10" />
          <rect x="170" y="183" width="660" height="72" fill="#252c30" />
          <circle cx="360" cy="326" r="62" fill="#d4cbc0" stroke="#313b40" strokeWidth="8" />
          <circle cx="360" cy="326" r="35" fill="#9b5c37" />
          <path d="M640 352 L715 270" stroke="#d4cbc0" strokeWidth="18" strokeLinecap="round" />
          <circle cx="622" cy="370" r="58" fill="none" stroke="#d4cbc0" strokeWidth="14" />
          <path d="M544 268 C530 235 570 216 552 180 M606 260 C592 228 630 204 615 173" fill="none" stroke="#eee3d8" strokeWidth="8" strokeLinecap="round" opacity=".5" />
        </>
      )}

      <rect x="24" y="22" width="952" height="516" rx="28" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="3" />
      <g opacity=".24">
        <path d="M0 510 H1000" stroke="#382d27" strokeWidth="3" strokeDasharray="18 16" />
        <path d="M0 530 H1000" stroke="#382d27" strokeWidth="2" strokeDasharray="8 15" />
      </g>
    </svg>
  )
}
