/* global console, process */
import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const requestedVersions = process.argv.slice(2).filter(argument => argument !== '--')
const vueVersions = requestedVersions.length > 0
  ? requestedVersions
  : ['3.4.0', '3.5.42']
const temporaryRoot = await mkdtemp(join(tmpdir(), 'vue-renderer-tunnel-compat-'))
const npmCache = join(temporaryRoot, 'npm-cache')

try {
  run('pnpm', ['pack', '--pack-destination', temporaryRoot], repositoryRoot)
  const tarballName = (await readdir(temporaryRoot)).find(name => name.endsWith('.tgz'))
  if (!tarballName) throw new Error('pnpm pack did not create a tarball')

  for (const vueVersion of vueVersions) {
    validateVersion(vueVersion)
    const fixtureDirectory = join(temporaryRoot, `vue-${vueVersion}`)
    await mkdir(fixtureDirectory)
    await Promise.all([
      copyFile(
        join(repositoryRoot, 'compat/runtime.mjs'),
        join(fixtureDirectory, 'runtime.mjs'),
      ),
      copyFile(
        join(repositoryRoot, 'compat/consumer.ts'),
        join(fixtureDirectory, 'consumer.ts'),
      ),
      copyFile(
        join(repositoryRoot, 'compat/tsconfig.json'),
        join(fixtureDirectory, 'tsconfig.json'),
      ),
    ])
    await writeFile(
      join(fixtureDirectory, 'package.json'),
      `${JSON.stringify({
        name: `vue-renderer-tunnel-compat-${vueVersion}`,
        private: true,
        type: 'module',
        dependencies: {
          jsdom: '27.4.0',
          typescript: '5.4.5',
          vue: vueVersion,
          'vue-renderer-tunnel': `file:../${tarballName}`,
        },
      }, null, 2)}\n`,
    )

    console.log(`\n[compat] Installing isolated Vue ${vueVersion} fixture`)
    run(
      'pnpm',
      ['install', '--ignore-workspace', '--frozen-lockfile=false'],
      fixtureDirectory,
    )
    run('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json'], fixtureDirectory)
    run('node', ['runtime.mjs'], fixtureDirectory)
    console.log(`[compat] Vue ${vueVersion}: PASS`)
  }
}
finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      npm_config_cache: npmCache,
    },
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`)
  }
}

function validateVersion(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid Vue version: ${version}`)
  }
}
