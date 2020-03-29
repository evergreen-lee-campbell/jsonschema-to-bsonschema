declare class ConversionOptions {
    cwd?: string;
    verbose: boolean;
    breakOnSchemaValidationErrors: boolean;
}
export declare function convert(inputGlob: string, outputDirectory?: string, options?: ConversionOptions): Promise<void>;
declare class DeploymentOptions {
    connectionString?: string;
    fileNamesAsCollectionNames?: boolean;
}
export declare function deploy(bsonSchemaGlob: string, deploymentOptions: DeploymentOptions): Promise<void>;
export declare function addIndices(bsonFileGlob: string): Promise<void>;
export {};
