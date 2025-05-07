/**
 * Represents a JSON value, which can be a string, number, boolean, null, an array of JSON values, or an object of JSON values.
 */
type JSONValue =
	| string
	| number
	| boolean
	| null
	| JSONValue[]
	| { [key: string]: JSONValue }

/**
 * Represents a JSON object, which is an object where the values can be any valid JSON value.
 */
export type JSONObject = { [key: string]: JSONValue }

/**
 * Represents the structure of a package.json file.
 *
 * @property dependencies - An object containing runtime dependencies with their version strings.
 * @property devDependencies - An object containing development dependencies with their version strings.
 * @property [key: string] - Allowing additional properties of any type in the package.json.
 */
export interface IPackageJSON {
	dependencies: PackageAndVersion
	devDependencies: PackageAndVersion
	[key: string]: JSONValue
}

/**
 * Represents information about a specific package group.
 *
 * @property name - The name of the package.
 * @property current - The current version installed in the project.
 * @property version - The latest version available in the repository.
 * @property prop - An additional property to store related information.
 */
export interface IPackageGroupInfo {
	name: string
	current: string
	version: string
	prop: string
}

/**
 * Represents an option object for displaying package information.
 *
 * @property value - The package group information or undefined.
 * @property label - The label to display for the option.
 * @property hint - An optional hint to display for the option.
 */
export interface IPackageOption {
	value: IPackageGroupInfo | undefined
	label: string
	hint?: string
}

/**
 * Represents a record of package options, where the keys are the dependency types and the values are arrays of package options.
 */
export interface PackageOptionsRecord {
	[deps: string]: IPackageOption[]
}

/**
 * Represents a mapping of package names to their version strings.
 */
export interface PackageAndVersion {
	[pkg: string]: string
}

/**
 * Represents the response from the getVersions function, containing the related property and an array of package options.
 *
 * @property prop - The property related to the package information.
 * @property data - An array of package options.
 */
export interface VersionsResponse {
	prop: string
	data: IPackageOption[]
}
