import { pathToFileURL } from 'node:url'
import { createWriteStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import child_process from 'node:child_process'

// Promisify the exec function to run shell commands
const exec = promisify(child_process.exec)

// Type to represent a URL input, which can be a string or a URL object
type URLInput = string | URL

/**
 * Converts a given path to a URL.
 *
 * @param pathToURL - The path as a string or URL object to convert.
 * @returns A URL object.
 */
const toURL = (pathToURL: URLInput): URL => {
	return pathToURL instanceof URL ? pathToURL : pathToFileURL(pathToURL)
}

// Interface representing package information
interface PackageInfo {
	name: string // The name of the package
	current: string // The current version of the package
	version: string // The latest version of the package
	prop: string // Any additional property associated with the package
}

/**
 * Retrieves the latest version of packages from npm.
 *
 * @param data - An object containing package names and their current versions.
 * @param prop - Additional property to include in the result.
 * @returns A promise that resolves to an array of settled promises containing package info or undefined.
 */
async function getLatestVersionPackage(data: Record<string, string>, prop: string): Promise<Array<PromiseSettledResult<PackageInfo | undefined>>> {
	if (!data) {
		return []
	}
	const entries = Object.entries(data)
	return await Promise.allSettled(
		entries.map(async ([name, current]) => {
			const cmd = `npm show ${name} version`
			let { stdout: version } = await exec(cmd)
			version = String(version).replace('\n', '')
			if (version && data[name] !== String(version)) {
				return { name, current, version, prop }
			}
		}),
	)
}

/**
 * Truncates a string to a maximum length, adding ellipsis if it exceeds that length.
 *
 * @param str - The string to truncate.
 * @param maxLength - The maximum allowable length.
 * @returns The truncated string.
 */
function truncateString(str: string, maxLength: number): string {
	if (str.length > maxLength) {
		return str.slice(0, maxLength - 3) + '...'
	} else {
		return str
	}
}

/**
 * Builds an array of option objects for displaying package information.
 *
 * @param collection - An array of settled promise results containing package info.
 * @returns An array of objects with 'value' (PackageInfo) and 'label' (for display).
 */
function buildOpts(collection: PromiseSettledResult<PackageInfo | undefined>[]): Array<{ value: PackageInfo; label: string }> {
	const items = collection
		.filter((obj): obj is PromiseFulfilledResult<PackageInfo | undefined> => obj.status === 'fulfilled' && obj.value !== undefined)
		.map((obj) => obj.value as PackageInfo)
	return items.map((obj) => {
		const name = truncateString(obj.name, 30).padEnd(35, ' ')
		const versions = `${obj.current.padEnd(10, ' ')}→ ${obj.version}`
		return {
			value: obj,
			label: [name, versions].join('\t'),
		}
	})
}

/**
 * Fetches and structures the latest package versions resulted from the npm command.
 *
 * @param data - An object containing package names and their current versions.
 * @param prop - Additional property associated with the package.
 * @returns An object containing the data for display or undefined.
 */
export async function getVersions(data: Record<string, string>, prop: string): Promise<{ data: any; prop: string } | undefined> {
	const res = await getLatestVersionPackage(data, prop)
	if (Array.isArray(res)) {
		return {
			data: buildOpts(res),
			prop,
		}
	}
}

/**
 * Writes data to a specified file in JSON format.
 *
 * @param file - The file URL or path where data should be written.
 * @param data - The data to write, which will be serialized as JSON.
 * @returns A promise that resolves to true if writing is successful, or rejects with an error message if it fails.
 */
export function writeData(file: URLInput, data: any): Promise<boolean> {
	return new Promise((resolve, reject) => {
		createWriteStream(toURL(file))
			.on('finish', () => {
				resolve(true)
			})
			.on('error', (error: Error) => {
				reject(error.message)
			})
			.end(`${JSON.stringify(data, undefined, '  ')}\n`)
	})
}

/**
 * Loads JSON data from a specified file.
 *
 * @param file - The file URL or path from which to read JSON data.
 * @returns A promise that resolves to the parsed JSON data.
 */
export async function loadJSON(file: URLInput): Promise<any> {
	const jsonBuf = await readFile(toURL(file))
	return JSON.parse(jsonBuf.toString())
}
