import process from 'node:process'
import * as p from '@clack/prompts'
import color from 'kleur'
import { findUp } from 'find-up-simple'
import { getVersions, loadJSON, writeData } from './lib.ts'

interface PackageJSON {
	name: string
	version: string
	dependencies: Record<string, string>
	devDependencies: Record<string, string>
	scripts: Record<string, string>
	[key: string]: any
}

interface PackageGroupInfo {
	name: string
	current: string
	version: string
	prop: string
}

interface PackageGroup {
	packages?: PackageGroupInfo[]
}

interface GroupsResponse {
	[key: string]: PackageGroup
}

const spin = p.spinner()

function onCancel(msg: string = 'Operation cancelled.', code: number = 0): void {
	p.cancel(msg)
	process.exit(code)
}

async function main(): Promise<void> {
	console.clear()

	p.intro(`${color.bgCyan(color.black(' package.json '))}`)

	spin.start()
	spin.message('Looking for file...')

	const pkgFile: string | undefined = await findUp('package.json')

	spin.stop('File found.')

	if (pkgFile === undefined) {
		return onCancel('package.json not found', 1)
	}

	spin.start()
	spin.message('Loading data...')

	const pkgData: PackageJSON = await loadJSON(pkgFile)
	const options: Record<string, any> = {}
	const props: string[] = ['dependencies', 'devDependencies']
	const promises: Promise<{ data: any; prop: any } | undefined>[] = []

	for (const prop of props) {
		if (pkgData[prop]) {
			promises.push(getVersions(pkgData[prop], prop))
		}
	}

	for await (const result of promises) {
		if (result?.data) {
			const { prop, data } = result
			options[prop] = data
		}
	}

	spin.stop('Done.')

	const optsKey: string[] = Object.keys(options)
	const intersection = props.filter((value) => optsKey.includes(value))
	if (intersection.length === 0) {
		return onCancel('There are no dependencies or devDependencies.')
	}

	const response: any = await p.group(
		{
			packages: () =>
				p.groupMultiselect({
					message: 'Which packages would you like to update version?',
					options,
					required: false,
				}),
		},
		{
			onCancel: () => onCancel(),
		},
	)

	const groups: GroupsResponse = {}
	if (response?.packages) {
		groups.packages = response.packages
		if (Array.isArray(groups?.packages)) {
			for (const { name, prop, version } of groups.packages) {
				pkgData[prop][name] = version
			}
		}
	}

	try {
		await writeData(pkgFile, pkgData)
	} catch (error: any) {
		return onCancel(error.message, 1)
	}

	p.outro(`File updated! ${color.underline(color.cyan(pkgFile))}`)
}

main().catch(console.error)
