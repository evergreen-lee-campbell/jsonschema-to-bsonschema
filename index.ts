import * as glob from 'glob';
import * as fs from 'fs';
import * as refParser from 'json-schema-ref-parser';
import * as JSONSchema from 'json-schema';

async function _transformSchemas(fileList: Array<string>, outputDirectory?: string): Promise<void> {
    return new Promise((resolve, reject) => {
        let completedSchemas = 0;
        fileList.forEach(fileName => {
            fs.readFile(fileName, async (err, fileData) => {
                if (err) return reject(err);
                
                let schema: refParser.JSONSchema | null = null;
                
                try {
                    schema = await refParser.default.dereference(JSON.parse(fileData.toString('utf8')));
                } catch (ex) {

                }

                if (!schema) {
                    return reject(new Error("Schema was not dereferenced."));
                }
                
                delete schema.definitions;

                if (outputDirectory) {
                    // dunno yet
                } else {
                    fs.writeFileSync(fileName.split('.json')[0] + ".bson", JSON.stringify(schema, null, 4));
                }

                completedSchemas++;
            
                if (completedSchemas === fileList.length) {
                    resolve();
                }
            });
        });
    });
}

async function _validateInputSchemas(fileList: Array<string>, options?: { breakOnSchemaValidationErrors: boolean, verbose: boolean }): Promise<{ valid: number, invalid: number }> {
    const schema = JSON.parse(fs.readFileSync('~/draft-04-schema.json').toString('utf8'));
    return new Promise((resolve, reject) => {
        let validCount = 0;
        let invalidCount = 0;
        
        for (let i = 0; i < fileList.length; i++) {
            let fileBuffer: Buffer;
            
            try {
                fileBuffer = fs.readFileSync(fileList[i]);
            } catch (ex) {
                return reject(ex);
            }

            let valid: any;

            try {
                valid = JSONSchema.validate(JSON.parse(fileBuffer.toString('utf-8')), schema);
            } catch (ex) {
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

export async function convert (inputGlob: string, outputDirectory?: string, options?: any): Promise<void> {
    let _fileList: Array<string> = [];
    
    if (!inputGlob) {
        console.info('No input file pattern specified, deafulting to all JSON files in this directory ("*.json").');
        inputGlob = '*.json';
    }

    if (!outputDirectory) {
        console.info('No output directory specified, outputting each converted BSON schema in the same directory as its source JSON.');
        outputDirectory = '.';
    }

    options;
    
    try {
        _fileList.push(...glob.sync(inputGlob));
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

    _transformSchemas(_fileList, outputDirectory).then(() => {
        console.log('Done!');
    }, (err: Error) => {
        console.error(err);
    });
}