const glob = require('glob');
const validate = require('jsonschema').validate;
const fs = require('fs');
const refParser = require('json-schema-ref-parser');

if(!RegExp.escape){
    RegExp.escape = function(s){
      return String(s).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
    };
}

module.exports = {
    _fileList: [],
    _options: {},
    convert: async function (inputGlob, outputDirectory, options) {
        if (!inputGlob) {
            console.info('No input file pattern specified, deafulting to all JSON files in this directory ("*.json").');
            inputGlob = '*.json';
        }

        if (!outputDirectory) {
            console.info('No output directory specified, outputting each converted BSON schema in the same directory as its source JSON.');
            outputDirectory = '.';
        }

        this._options = options;
        
        try {
            this._fileList.push(...glob.sync(inputGlob));
        } catch (ex) {
            return console.error(ex);
        }

        if (this._fileList.length < 1) {
            return console.error('No input files were specified.');
        }

        let validationResults;
        
        try {
            validationResults = await this._validateInputSchemas();
        } catch (ex) {
            return console.error(ex);
        }

        if (validationResults.valid === 0 && validationResults.invalid > 0) {
            return console.error('No schemas passed validation. Please resolve schema errors above and try again.');
        }

        // once we've passed validation, create the BSON schemas from each of the JSON schemas...
        console.info('Beginning JSON -> BSON conversion.');

        this._transformSchemas().then(() => {
            console.log('Done!');
        }, err => {
            console.error(err);
        });
    },
    _transformSchemas: function() {
        const that = this;
        return new Promise((resolve, reject) => {
            let completedSchemas = 0;
            that._fileList.forEach(fileName => {
                fs.readFile(fileName, (err, fileData) => {
                    if (err) return reject(err);
                    
                    refParser.dereference(JSON.parse(fileData.toString('utf8')), (err, schema) => {
                        if (err) {
                            return reject(err);
                        }

                        delete schema.$defs;
                        
                        fs.writeFileSync(fileName.split('.json')[0] + ".bson", JSON.stringify(schema, null, 4));

                        completedSchemas++;
                    
                        if (completedSchemas === that._fileList.length) {
                            resolve();
                        }
                    });
                });
            });
        });
    },
    _replaceReferences: function(original, current) {        
        if (current) {
            for (let prop in current) {
                if (!current[prop]) continue;

                if (prop === "$ref") {
                    console.log('Found a reference...');
    
                    if (!current[prop]) {
                        console.error('$ref schema reference not defined.');
                        return;
                    }
        
                    console.log('Current reference: ' + current[prop]);
        
                    let path = current[prop].split('/');
        
                    if (path[0] === '#') {
                        console.log('Self reference found.');

                        let referenceTarget = original;

                        for (let i = 1; i < path.length; i++) {
                            if (referenceTarget) referenceTarget = referenceTarget[path[i]];
                        }

                        let originalAsString = JSON.stringify(original);
                        let currentAsString = JSON.stringify(current);
                        let referenceTargetAsString = JSON.stringify(referenceTarget);

                        originalAsString = originalAsString.replace(new RegExp(RegExp.escape(currentAsString), "g"), referenceTargetAsString);

                        original = JSON.parse(originalAsString);
                        let evalString = "delete original";
                        
                        for (let i = 1; i < path.length; i++) {
                            evalString += `["${path[i]}"]`;
                        }

                        if (evalString !== "delete original") eval(evalString);
                    }
                } else {
                    if (typeof current[prop] === 'object' && !Array.isArray(current[prop])) {
                        this._replaceReferences(original, current[prop]);
                    }
                }
            }
        }

        return original;
    },
    _renameTypeToBsonType: function (original, current, notFirstRun) {
        for (let prop in current) {
            if (prop === "items") {
                this._renameTypeToBsonType(original, current[prop], false);
            } else {
                if (!current) return;
        
                if (!notFirstRun) {
                    if (current.type) {
                        current.bsonType = current.type;
                        delete current.type;
                    }
                }
        
                if (current.properties) {
                    for (let prop in current.properties) {
                        if (current.properties[prop].type) {
                            current.properties[prop].bsonType = current.properties[prop].type;
                            delete current.properties[prop].type;
                        } else {
                            this._renameTypeToBsonType(original, current.properties[prop], true);
                        }
                    }
                }
        
                if (typeof current === "object") {
                    for (let prop in current) {
                        this._renameTypeToBsonType(original, current[prop], true);
                    }
                }
            }
        }

        return current;
    },
    _validateInputSchemas: function () {
        const that = this;
        const schema = JSON.parse(fs.readFileSync('./draft-04-schema.json').toString('utf8'));
        return new Promise((resolve, reject) => {
            let validCount = 0;
            let invalidCount = 0;
            
            for (let i = 0; i < this._fileList.length; i++) {
                let fileBuffer;
                
                try {
                    fileBuffer = fs.readFileSync(that._fileList[i]);
                } catch (ex) {
                    return reject(ex);
                }

                let valid;

                try {
                    valid = validate(JSON.parse(fileBuffer.toString('utf-8')), schema);
                } catch (ex) {
                    return reject(ex);
                }
                
                if (valid.errors && valid.errors.length > 0) {
                    if (this._options.breakOnSchemaValidationErrors) {
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
            console.info(`${validCount} of ${that._fileList.length} schemas PASSED validation.`);

            if (invalidCount > 0) {
                console.info(`${invalidCount} of ${that._fileList.length} schemas FAILED validation.`);
            }

            resolve({
                valid: validCount,
                invalid: invalidCount
            });
        });
    }
};
