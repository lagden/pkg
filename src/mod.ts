import process from 'node:process' // Import 'process' module to handle actions like exiting the process
import * as p from '@clack/prompts' // Import '@clack/prompts' for creating interactive command-line interfaces
import color from 'kleur' // Import 'kleur' for terminal text coloring
import { findUp } from 'find-up-simple' // Import 'findUp' to locate files in parent directories
import { getVersions, loadJSON, writeData } from './lib.ts' // Import utility functions for JSON handling and version operations
import type { IPackageGroupInfo, IPackageJSON, PackageAndVersion, PackageOptionsRecord } from './interfaces.ts' // Import TypeScript interface for type-safety of package.json data

// Initialize a spinner to display loading status to the user
const spin = p.spinner()

// Function to handle operation cancellation
function onCancel(msg = 'Operation cancelled.', code = 0): void {
	p.cancel(msg) // Display cancellation message
	process.exit(code) // Exit process with given code
}

/**
 * Main function to run the CLI
 *
 * This is a command-line interface tool designed to help
 * developers manage their project dependencies more efficiently.
 * It scans your `package.json` file and checks for available updates
 * to your npm packages, making it easy to keep your projects up-to-date
 * with the latest versions.
 *
 * Example usage:
 * ```ts
 * import main from "jsr:@tadashi/pkg-cli";
 *
 * // Execute main function and handle errors
 * main().catch(console.error)
 * ```
 *
 * @module
 */
async function main(): Promise<void> {
	console.clear() // Clear the console for better readability

	p.intro(`${color.bgCyan(color.black(' package.json '))}`) // Display a formatted introductory message

	spin.start() // Start spinner animation
	spin.message('Looking for file...')

	// Search for 'package.json' file in parent directories
	const pkgFile: string | undefined = await findUp('package.json')

	spin.stop('File found.') // Stop spinner once file is located

	// If the file is not found, cancel the operation
	if (!pkgFile) {
		return onCancel('package.json not found', 1)
	}

	spin.start() // Start spinner while loading data
	spin.message('Loading data...')

	// Load JSON data from the located 'package.json' file
	const pkgData: IPackageJSON = await loadJSON(pkgFile)
	const props = ['dependencies', 'devDependencies'] // Define properties to check for updates
	const promises = props
		.filter((prop) => pkgData[prop])
		.map((prop) => getVersions(pkgData[prop] as PackageAndVersion, prop))

	const options: PackageOptionsRecord = {} // Prepare an object to store available version updates

	// Process each version check promise
	for await (const result of promises) {
		if (Array.isArray(result?.data) && result.data.length > 0) {
			const { prop, data } = result
			options[prop] = data // Store the version data in options
		}
	}

	spin.stop('Done.') // Stop spinner after version checks

	// Determine if there are dependencies to update
	const optsKey = Object.keys(options)
	const intersection = props.filter((value) => optsKey.includes(value))
	if (intersection.length === 0) {
		return onCancel('There are no dependencies or devDependencies to update.')
	}

	// Prompt the user to select packages to update
	const response = await p.group(
		{
			packages: () =>
				p.groupMultiselect({
					message: 'Which packages would you like to update?',
					options: options,
					required: false,
				}),
		},
		{
			onCancel: () => onCancel(),
		},
	)

	// Update selected packages in 'package.json'
	if (Array.isArray(response?.packages) && response.packages.length > 0) {
		for (const { name, prop, version } of response.packages as IPackageGroupInfo[]) {
			if (pkgData[prop] && typeof pkgData[prop] === 'object' && !Array.isArray(pkgData[prop])) {
				pkgData[prop][name] = version // Update the package version
			}
		}

		try {
			await writeData(pkgFile, pkgData) // Write updated data back to 'package.json'
			return p.outro(`File updated! ${color.underline(color.cyan(pkgFile))}`) // Notify user of update
		} catch (error: unknown) {
			if (error instanceof Error) {
				return onCancel(error.message, 1) // Handle and display error if file write fails
			}
			return onCancel('An unknown error occurred.', 1) // Handle unknown error types
		}
	}

	return onCancel('Nothing was done.', 0) // Inform user if no updates were made
}

export default main
