// Interface representing the structure of package.json files
export interface IPackageJSON {
	dependencies: Record<string, string> // Object containing runtime dependencies with their version strings
	devDependencies: Record<string, string> // Object containing development dependencies with their version strings
	[key: string]: any // Allowing additional properties of any type in the package.json
}

// Interface representing information about a specific package group
export interface IPackageGroupInfo {
	name: string // The name of the package
	current: string // The current version installed in the project
	version: string // The latest version available in the repository
	prop: string // An additional property to store related information
}

// Interface representing a collection of package groups
export interface IPackageGroup {
	packages?: IPackageGroupInfo[] // Optional array of package group information
}
