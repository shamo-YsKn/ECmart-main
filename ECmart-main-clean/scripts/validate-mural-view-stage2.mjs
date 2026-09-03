import fs from 'node:fs'
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'

const failures = []
const files = [
  'lib/mural-model.ts',
  'lib/mural-spots.ts',
  'lib/mural-npc.ts',
  'components/mural/mural-background.tsx',
  'components/mural/mural-view.tsx',
  'components/mobile/mobile-site.tsx',
  'lib/mobile-server.ts',
]

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    ...(file.endsWith('.tsx') ? { jsx: ts.JsxEmit.ReactJSX } : {}),
  }
  const result = ts.transpileModule(source, { compilerOptions, fileName: file, reportDiagnostics: true })
  for (const d of result.diagnostics ?? []) failures.push(`${file}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`)
}

function requireText(file, needle, label) {
  if (!fs.readFileSync(file, 'utf8').includes(needle)) failures.push(`${label}: ${needle}`)
}

requireText('lib/mural-model.ts', 'robotView: RobotView', 'mural post stores robot view')
requireText('lib/mural-model.ts', 'muralVariant: string', 'mural post stores mural variant')
requireText('components/mural/mural-view.tsx', 'draftRobotView', 'mural placement view selector exists')
requireText('components/mural/mural-view.tsx', 'mural_variant: activeMuralVariant.id', 'post saves selected stage')
requireText('components/mural/mural-view.tsx', 'robot_view: draftRobotView', 'post saves selected robot view')
requireText('lib/mural-spots.ts', 'id: "research"', 'Muroran IT second mural stage exists')
requireText('lib/mural-spots.ts', 'theme: "university-tech"', 'Muroran IT research theme exists')
requireText('components/mural/mural-background.tsx', 'MURORAN IT — RESEARCH AREA', 'research stage artwork exists')
requireText('supabase/mural-view-stage2-migration.sql', 'add column if not exists robot_view', 'incremental robot view migration exists')
requireText('supabase/mural-view-stage2-migration.sql', 'add column if not exists mural_variant', 'incremental mural variant migration exists')
requireText('components/mobile/mobile-site.tsx', 'activeVariant', 'mobile mural stage selector exists')
requireText('components/mobile/mobile-site.tsx', 'view:post.robotView', 'mobile mural respects stored robot view')

if (failures.length) {
  console.error('MURAL_VIEW_STAGE2_VALIDATION_FAILED')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('MURAL_VIEW_STAGE2_VALIDATION_OK')
