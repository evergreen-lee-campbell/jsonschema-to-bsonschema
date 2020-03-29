import * as glob from 'glob';
import * as fs from 'fs';
import * as refParser from 'json-schema-ref-parser';
import * as JSONSchema from 'json-schema';
import * as path from 'path';
import { MongoClient, Db } from 'mongodb';

async function _transformSchemas(fileList: Array<string>, outputDirectory?: string, baseUrl?: string): Promise<any> {
    let completedSchemas = 0;

    fileList.forEach(async fileName => {
        let fileData;
        try {
            fileData = fs.readFileSync(fileName);
        } catch (ex) {
            console.error(ex);
            throw ex;
        }

        let schema: refParser.JSONSchema | null = null;
        console.log('Received the following working directory: ' + baseUrl);

        if (!baseUrl) {
            console.log('Attempting to determine working directory from input glob...');
            console.log('fileName is: ' + fileName);
            //console.log(fileName.substring(0, fileName.lastIndexOf(path.sep)));
            //baseUrl = `${fileName.substring(0, fileName.lastIndexOf(path.sep))}${path.sep}`;

            console.log(fileName.substring(0, fileName.lastIndexOf('/')));
            baseUrl = `${fileName.substring(0, fileName.lastIndexOf('/'))}/`;
        }

        //baseUrl = baseUrl || (fileName.substring(0, fileName.lastIndexOf(path.sep)) + path.sep);
        console.log('Using the following basePath: ' + baseUrl);

        try {
            schema = await refParser.default.dereference(
                baseUrl,
                JSON.parse(fileData.toString('utf8')), 
                {});
        } catch (ex) {
            console.error('Failed to dereference ' + fileName);
            throw ex;
        }

        if (!schema) {
            console.error('Schema was not dereferenced.');
            throw new Error("Schema was not dereferenced.");
        }
        
        delete schema.definitions;

        // de-duplicate the bsonType and type elements:
        _deduplicateBsonTypes(schema);

        // convert some formatted types to bsonTypes:
        _convertBsonTypes(schema);

        console.log('Completed all depths of de-duplication:');
        console.log(schema);
        
        let documentName = fileName.split('.json')[0];
        /*let outputFileName = (outputDirectory 
            ? outputDirectory + path.sep + documentName.split(path.sep)[documentName.split(path.sep).length - 1].split('.json')[0] 
            : documentName) 
            + '.bson';*/

        let outputFileName = (outputDirectory 
            ? outputDirectory + '/' + documentName.split('/')[documentName.split('/').length - 1].split('.json')[0] 
            : documentName) 
            + '.bson';
        
        console.log('Outputting to: ' + outputFileName);

        try {
            console.info('Writing file ' + outputFileName);
            fs.writeFileSync(outputFileName, JSON.stringify(schema, null, 4));
        } catch (ex) {
            throw ex;
        }

        completedSchemas++;
    
        if (completedSchemas === fileList.length) {
            console.info('Dereferenced ' + completedSchemas + ' of ' + fileList.length + ' schemas ');
            return true;
        } else {
            console.info('Dereferenced ' + completedSchemas + ' of ' + fileList.length + ' schemas ');
        }
    });
}

function _deduplicateBsonTypes(schema: any): any {
    for (let i in schema) {
        if (typeof schema[i] !== 'object') continue;
        if (Array.isArray(schema[i])) continue;

        if (schema[i].hasOwnProperty("type") && schema[i].hasOwnProperty("bsonType")) {
            console.log('i: ' + i);
            delete schema[i].type;
        } else if (typeof schema[i] === 'object') {
            _deduplicateBsonTypes(schema[i]);
        }
    }

    return schema;
}

/**
 * 
 * @param schema 
 * 
 * @returns schema
 * 
 * @summary Converts jsonSchema types to bsonTypes based upon their formatting etc. 
 * (e.g. type: 'string', format: 'date-time' -> bsonType: 'Date')
 */
function _convertBsonTypes(schema: any) {
    for (let i in schema) {
        if (typeof schema[i] !== 'object') continue;
        switch (schema[i].format) {
            case "email":
                schema[i].bsonType = "string";
                delete schema[i].format;
                delete schema[i].type;
                break;
            case "date-time":
                schema[i].bsonType = "date";
                delete schema[i].format;
                delete schema[i].type;
                break;
            default:
                _convertBsonTypes(schema[i]);
                break;
        }
    }

    return schema;
}

async function _validateInputSchemas(fileList: Array<string>, options?: { breakOnSchemaValidationErrors: boolean, verbose: boolean }): Promise<{ valid: number, invalid: number }> {
    const schema = JSON.parse(JSON.stringify(draft04schema));
    return new Promise((resolve, reject) => {
        let validCount = 0;
        let invalidCount = 0;
        
        for (let i = 0; i < fileList.length; i++) {
            let fileBuffer: Buffer;
            
            try {
                fileBuffer = fs.readFileSync(fileList[i]);
            } catch (ex) {
                console.error('Failed to read schema at ' + fileList[i] + ' for schema validation.');
                return reject(ex);
            }

            let valid: any;

            try {
                valid = JSONSchema.validate(JSON.parse(fileBuffer.toString('utf-8')), schema);
            } catch (ex) {
                console.error('Validation failed for schema at ' + fileList[i]);
                return reject(ex);
            }
            
            if (valid.errors && valid.errors.length > 0) {
                if (options && options.breakOnSchemaValidationErrors) {
                    return reject(valid.errors);
                } else {
                    console.info(valid.errors);
                }

                invalidCount++;
            } else {
                validCount++;
            }
        }
        
        console.log('Input schema validation completed.');
        console.info(`${validCount} of ${fileList.length} schemas PASSED validation.`);

        if (invalidCount > 0) {
            console.info(`${invalidCount} of ${fileList.length} schemas FAILED validation.`);
        }

        resolve({
            valid: validCount,
            invalid: invalidCount
        });
    });
}

class ConversionOptions {
    cwd?: string;
    verbose: boolean = false;
    breakOnSchemaValidationErrors: boolean = false;
}

export async function convert (inputGlob: string, outputDirectory?: string, options?: ConversionOptions): Promise<void> {
    let _fileList: Array<string> = [];

    if (!options) options = new ConversionOptions();

    if (!outputDirectory) {
        console.info('No output directory specified, outputting each converted BSON schema in the same directory as its source JSON.');
    }
    
    try {
        _fileList = glob.sync(inputGlob);
        console.log(_fileList);
    } catch (ex) {
        return console.error(ex);
    }

    if (_fileList.length < 1) {
        return console.error('No input files were specified.');
    }

    let validationResults: any;
    
    try {
        validationResults = await _validateInputSchemas(_fileList);
    } catch (ex) {
        return console.error(ex);
    }

    if (validationResults.valid === 0 && validationResults.invalid > 0) {
        return console.error('No schemas passed validation. Please resolve schema errors above and try again.');
    }

    // once we've passed validation, create the BSON schemas from each of the JSON schemas...
    console.info('Beginning JSON -> BSON conversion.');

    try {
        await _transformSchemas(_fileList, outputDirectory, options.cwd);
        console.log("Done!");
    } catch (ex) {
        console.log(ex);
        throw ex;
    }
}

class DeploymentOptions {
    connectionString?: string;
    fileNamesAsCollectionNames?: boolean;
}

export async function deploy(bsonSchemaGlob: string, deploymentOptions: DeploymentOptions) {
    // default to the title of the schema as the collection name:
    let fileList = glob.sync(bsonSchemaGlob);

    if (!deploymentOptions.connectionString) throw new Error('Connection string not defined.');

    deploymentOptions.connectionString = deploymentOptions.connectionString || '';

    let conn: MongoClient;

    try {
        console.log('Connecting to db: ' + deploymentOptions.connectionString);
        conn = await MongoClient.connect(deploymentOptions.connectionString);
    } catch (ex) {
        console.error(ex);
        throw ex;
    }

    let db: Db = conn.db();
    console.log('Connected to DB: ');
    console.log(db);

    let collectionNames: string[] = await (await db.listCollections().toArray()).map(c => c.Name);

    let promises: Array<Promise<any>> = [];

    console.log('The file-list: ');
    console.log(fileList);
    
    fileList.forEach(async f => {
        if (f.toLowerCase().indexOf('address') > -1) {
            console.log('ignoring collection...');
        } else {
            try {
                console.log('Reading file: ' + f);
                let file = JSON.parse(fs.readFileSync(f).toString('utf8'));
    
                console.log('Read and parsed file: ' + f);
        
                console.log('Adding validator for file: ' + f);
    
                console.log('Parsed file: ');
                console.log(file);

                if (!collectionNames.find(n => n === file.title)) {
                    await db.createCollection(file.title);
                }

                promises.push(db.command({collMod: file.title, validator: { $jsonSchema: file }}));
        
            } catch (ex) {
                console.error(ex);
                throw ex;
            }
        }
    });

    if (promises.length < 1) return;
    
    try {
        await Promise.all(promises);
    } catch (ex) {
        console.error(ex);
        throw ex;
    }
}

function _createIndicesScripts(schema: any) {
    
}

export async function addIndices(bsonFileGlob: string) {
    let fileList = glob.sync(bsonFileGlob);

    let promises: Array<Promise<any>> = [];

    fileList.forEach(fileName => {
        // find all of the fields which have an index descriptor, and add a MongoClient command to create said index...
        let parsedFile = JSON.parse(fs.readFileSync(fileName).toString('utf8'));
        if (parsedFile.title) {
            _createIndicesScripts(parsedFile);
        }
    });

    try {
        await Promise.all(promises);
    } catch (ex) {
        console.error(ex);
        throw ex;
    }
}

let draft04schema = {
    "id": "http://json-schema.org/draft-04/schema#",
    "$schema": "http://json-schema.org/draft-04/schema#",
    "description": "Core schema meta-schema",
    "definitions": {
        "schemaArray": {
            "type": "array",
            "minItems": 1,
            "items": { "$ref": "#" }
        },
        "positiveInteger": {
            "type": "integer",
            "minimum": 0
        },
        "positiveIntegerDefault0": {
            "allOf": [ { "$ref": "#/definitions/positiveInteger" }, { "default": 0 } ]
        },
        "simpleTypes": {
            "enum": [ "array", "boolean", "integer", "null", "number", "object", "string" ]
        },
        "stringArray": {
            "type": "array",
            "items": { "type": "string" },
            "minItems": 1,
            "uniqueItems": true
        }
    },
    "type": "object",
    "properties": {
        "id": {
            "type": "string"
        },
        "$schema": {
            "type": "string"
        },
        "title": {
            "type": "string"
        },
        "description": {
            "type": "string"
        },
        "default": {},
        "multipleOf": {
            "type": "number",
            "minimum": 0,
            "exclusiveMinimum": true
        },
        "maximum": {
            "type": "number"
        },
        "exclusiveMaximum": {
            "type": "boolean",
            "default": false
        },
        "minimum": {
            "type": "number"
        },
        "exclusiveMinimum": {
            "type": "boolean",
            "default": false
        },
        "maxLength": { "$ref": "#/definitions/positiveInteger" },
        "minLength": { "$ref": "#/definitions/positiveIntegerDefault0" },
        "pattern": {
            "type": "string",
            "format": "regex"
        },
        "additionalItems": {
            "anyOf": [
                { "type": "boolean" },
                { "$ref": "#" }
            ],
            "default": {}
        },
        "items": {
            "anyOf": [
                { "$ref": "#" },
                { "$ref": "#/definitions/schemaArray" }
            ],
            "default": {}
        },
        "maxItems": { "$ref": "#/definitions/positiveInteger" },
        "minItems": { "$ref": "#/definitions/positiveIntegerDefault0" },
        "uniqueItems": {
            "type": "boolean",
            "default": false
        },
        "maxProperties": { "$ref": "#/definitions/positiveInteger" },
        "minProperties": { "$ref": "#/definitions/positiveIntegerDefault0" },
        "required": { "$ref": "#/definitions/stringArray" },
        "additionalProperties": {
            "anyOf": [
                { "type": "boolean" },
                { "$ref": "#" }
            ],
            "default": {}
        },
        "definitions": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "default": {}
        },
        "properties": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "default": {}
        },
        "patternProperties": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "default": {}
        },
        "dependencies": {
            "type": "object",
            "additionalProperties": {
                "anyOf": [
                    { "$ref": "#" },
                    { "$ref": "#/definitions/stringArray" }
                ]
            }
        },
        "enum": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true
        },
        "type": {
            "anyOf": [
                { "$ref": "#/definitions/simpleTypes" },
                {
                    "type": "array",
                    "items": { "$ref": "#/definitions/simpleTypes" },
                    "minItems": 1,
                    "uniqueItems": true
                }
            ]
        },
        "format": { "type": "string" },
        "allOf": { "$ref": "#/definitions/schemaArray" },
        "anyOf": { "$ref": "#/definitions/schemaArray" },
        "oneOf": { "$ref": "#/definitions/schemaArray" },
        "not": { "$ref": "#" }
    },
    "dependencies": {
        "exclusiveMaximum": [ "maximum" ],
        "exclusiveMinimum": [ "minimum" ]
    },
    "default": {}
};