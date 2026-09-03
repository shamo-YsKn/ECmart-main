import fs from 'node:fs'
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'

const failures = []
const requireText = (file, needle, label) => {
  const text = fs.readFileSync(file, 'utf8')
  if (!text.includes(needle)) failures.push(`${label}: ${needle}`)
}

const syntaxFiles = [
  'lib/creation-model.ts',
  'lib/diorama-model.ts',
  'lib/diorama-stages.ts',
  'lib/gacha.ts',
  'components/diorama/diorama-stage-preview.tsx',
  'components/diorama/diorama-scene.tsx',
  'components/diorama/diorama-workshop.tsx',
]

for (const file of syntaxFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    ...(file.endsWith('.tsx') ? { jsx: ts.JsxEmit.ReactJSX } : {}),
  }
  const result = ts.transpileModule(source, {
    compilerOptions,
    fileName: file,
    reportDiagnostics: true,
  })
  for (const d of result.diagnostics ?? []) {
    failures.push(`${file}:${d.start ?? 0}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`)
  }
}

requireText('lib/creation-model.ts', 'view: RobotView', 'robot placement stores selected view')
requireText('lib/diorama-model.ts', 'normalizePlacementView', 'legacy diorama docs normalize robot view')
requireText('components/diorama/diorama-scene.tsx', 'view={placement.view}', 'scene preview applies placement view')
requireText('components/diorama/diorama-workshop.tsx', 'ROBOT_VIEW_OPTIONS', 'workshop exposes front/side/back options')
requireText('components/diorama/diorama-workshop.tsx', 'view: "front"', 'new robots default to front placement')
requireText('lib/diorama-stages.ts', 'muroran-it-tech', 'second Muroran Institute stage exists')
requireText('components/diorama/diorama-stage-preview.tsx', 'MURORAN IT LABS', 'second Muroran Institute artwork exists')
requireText('lib/gacha.ts', 'stage-muroran-it-tech', 'gacha reward exists for second Muroran Institute stage')

if (failures.length) {
  console.error('DIORAMA_VIEW_STAGE2_VALIDATION_FAILED')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('DIORAMA_VIEW_STAGE2_VALIDATION_OK')
