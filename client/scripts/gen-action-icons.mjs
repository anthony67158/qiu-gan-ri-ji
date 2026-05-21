import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(process.cwd(), '..')
const srcDir = path.join(repoRoot, '小程序ICON')
const outDir = path.join(process.cwd(), 'src', 'assets', 'icons')

const files = [
  { in: '编辑.svg', out: 'edit.png' },
  { in: '清除.svg', out: 'clear.png' },
  { in: '删除 (1).svg', out: 'delete.png' },
  { in: '刷新.svg', out: 'refresh.png' }
]

fs.mkdirSync(outDir, { recursive: true })

for (const f of files) {
  const inPath = path.join(srcDir, f.in)
  const outPath = path.join(outDir, f.out)
  const svg = fs.readFileSync(inPath)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 64 },
    background: null
  })
  const png = resvg.render().asPng()
  fs.writeFileSync(outPath, png)
}

console.log('Generated icons:', files.map(f => f.out).join(', '))

