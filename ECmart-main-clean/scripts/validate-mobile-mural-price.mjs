import fs from 'node:fs'

const checks = []
function expect(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`)
  checks.push(label)
  console.log(`PASS ${label}`)
}

const mobileSite = fs.readFileSync('components/mobile/mobile-site.tsx', 'utf8')
const mobileServer = fs.readFileSync('lib/mobile-server.ts', 'utf8')
const map = fs.readFileSync('components/mobile/mobile-muroran-map.tsx', 'utf8')
const stage = fs.readFileSync('components/mobile/mobile-mural-stage.tsx', 'utf8')

expect('mobile mural renders visual Muroran map', mobileSite.includes('<MobileMuroranMap') && map.includes('spot.mapPosition.x') && map.includes('spot.mapPosition.y'))
expect('map pins link to mobile mural spots', map.includes('tab: "mural"') && map.includes('spot: spotId'))
expect('mobile mural loads post counts for map badges', mobileSite.includes('getMobileMuralCounts()') && mobileServer.includes('export async function getMobileMuralCounts'))
expect('mobile mural renders PC mural backgrounds', mobileSite.includes('<MobileMuralStage') && stage.includes('<MuralBackground spot={spot} />'))
expect('mobile mural uses stored robot placement coordinates', stage.includes('post.positionX') && stage.includes('snapMuralRobotY'))
expect('mobile post markers link to reviews', stage.includes('#mobile-review-') && mobileSite.includes('id={`mobile-review-${post.id}`}'))
expect('mobile robot shows shared reference price', mobileSite.includes('const referencePrice = estimateRobotReferencePrice(config, activeCustomItem?.document)') && mobileSite.includes('参考価格 {formatReferencePrice(referencePrice.total)}'))
expect('custom item price breakdown is shown on mobile', mobileSite.includes('referencePrice.customItemSurcharge') && mobileSite.includes('referencePrice.itemEstimate.tierLabel'))

console.log(`Mobile mural + robot price: ${checks.length} checks PASS`)
