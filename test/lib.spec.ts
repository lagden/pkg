import { URL } from 'node:url'
import { access } from 'node:fs/promises'
import { assert, assertEquals } from 'jsr:@std/assert@1.0.8'
import { getVersions, loadJSON, writeData } from '../src/lib.ts'
import type { IPackageJSON, PackageAndVersion } from '../src/interfaces.ts'

const pkgOriginalFile = new URL('./fixtures/package.original.json', import.meta.url)
const pkgFile = new URL('./fixtures/package.json', import.meta.url)

Deno.test({
	name: 'loadJSON',
	permissions: { read: true },
	fn: async () => {
		const data: IPackageJSON = await loadJSON(pkgOriginalFile)
		assertEquals(data.type, 'module')
	},
})

Deno.test({
	name: 'getVersions',
	permissions: { read: true, run: true, env: true },
	fn: async () => {
		const pkg = await loadJSON(pkgOriginalFile)
		const prop = 'dependencies'
		const { data: [{ value }] } = await getVersions(pkg[prop] as PackageAndVersion, prop)
		assertEquals(value?.name, 'sirv-cli')
	},
})

Deno.test({
	name: 'writeData',
	permissions: { sys: true, read: true, run: true, env: true, write: true },
	fn: async () => {
		const data: IPackageJSON = await loadJSON(pkgOriginalFile)
		await writeData(pkgFile, data)
		let ok: boolean
		try {
			await access(pkgFile)
			ok = true
		} catch {
			ok = false
		}
		assert(ok)
	},
})
