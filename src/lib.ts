// import { createWriteStream } from 'node:fs' // Importing createWriteStream for writing to files
import { readFile, writeFile } from 'node:fs/promises' // Importing readFile for reading from files with promises
import { pathToFileURL } from 'node:url' // Importing pathToFileURL to convert file paths to URL format
import { exec as execCallback } from 'node:child_process' // Importing exec for executing shell commands, aliased as execCallback
import { promisify } from 'node:util' // Importing promisify to convert callback-based functions into promise-based
import { IPackageGroupInfo } from './interfaces.ts' // Importing IPackageGroupInfo interface for strong typing

// Promisify the exec function to enable async/await syntax for running shell commands
const exec = promisify(execCallback)

// Type to represent a URL input, which can be a string or a URL object
type URLInput = string | URL

/**
 * Converts a given path (string or URL) to a URL object.
 *
 * @param pathToURL - The path to be converted.
 * @returns A URL object representing the path.
 */
const toURL = (pathToURL: URLInput): URL => {
	return pathToURL instanceof URL ? pathToURL : pathToFileURL(pathToURL)
}

/**
 * Retrieves the latest version of packages from npm.
 *
 * @param data - An object containing package names and their corresponding current versions.
 * @param prop - A property to associate with the package information.
 * @returns A promise that resolves to an array of settled promises containing package info or undefined.
 */
function getLatestVersionPackage(data: Record<string, string>, prop: string): Promise<Array<PromiseSettledResult<IPackageGroupInfo | undefined>>> {
	if (!data) return Promise.resolve([])

	const entries = Object.entries(data)

	return Promise.allSettled(entries.map(async ([name, current]) => {
		const { stdout } = await exec(`npm show ${name} version`)
		const version = stdout.trim()
		return version && current !== version ? { name, current, version, prop } : undefined
	}))
}

/**
 * Truncates a string to a specified maximum length, appending ellipsis if necessary.
 *
 * @param str - The string to potentially truncate.
 * @param maxLength - The maximum allowable length for the string.
 * @returns The truncated string if it exceeds maxLength; otherwise, the original string.
 */
const truncateString = (str: string, maxLength: number): string => (
	str.length > maxLength ? str.slice(0, maxLength - 3) + '...' : str
)

/**
 * Builds an array of option objects for displaying package information.
 *
 * @param collection - An array of settled promise results containing package info.
 * @returns An array of objects formatted for display, containing 'value' and 'label'.
 */
const buildOpts = (collection: PromiseSettledResult<IPackageGroupInfo | undefined>[]): Array<{ value: IPackageGroupInfo; label: string }> => {
	return collection
		.filter((obj): obj is PromiseFulfilledResult<IPackageGroupInfo> => obj.status === 'fulfilled' && obj.value !== undefined)
		.map((obj) => {
			const { name, current, version } = obj.value // No need for non-null assertion now
			const label = `${truncateString(name, 30).padEnd(35, ' ')}${current.padEnd(10, ' ')}→ ${version}`
			return { value: obj.value, label }
		})
}

/**
 * Fetches and structures the latest package versions received from npm.
 *
 * @param data - An object containing package names and their current versions to check.
 * @param prop - Additional property related to the packages.
 * @returns An object with structured data for display or undefined if no data is available.
 */
export async function getVersions(data: Record<string, string>, prop: string): Promise<{ data: any; prop: string } | undefined> {
	const response = await getLatestVersionPackage(data, prop)
	return Array.isArray(response) ? { data: buildOpts(response), prop } : undefined
}

/**
 * Writes data to a specified file in JSON format.
 *
 * @param file - The file URL or path where data should be written.
 * @param data - The data to write, which will be serialized as JSON.
 * @returns A promise that resolves to true if writing is successful, or rejects with an error message if it fails.
 */
export function writeData(file: URLInput, data: any): Promise<void> {
	return writeFile(toURL(file), `${JSON.stringify(data, null, '  ')}\n`)
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
