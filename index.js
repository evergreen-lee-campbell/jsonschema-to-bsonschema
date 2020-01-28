const yargs = require('yargs');
const json2bson = require('./json2bson');

const argv = yargs.option('files', {
    alias: 'f',
    type: 'string',
    description: 'Path/pattern to file(s) to convert from JSON schema to BSON (MongoDB) schema. Defaults to "*.json".'
}).option('exclude', {
    alias: 'e',
    type: 'string',
    description: '{Include later}'
}).option('outdir', {
    alias: 'o',
    type: 'string',
    description: 'Output directory for the parsed file(s). Defaults to same directory as each of the input files if not specified.'
}).option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Include verbose logs.'
}).option('break', {
    alias: 'b',
    type: 'boolean',
    description: 'Break if any of the JSON schemas is invalid.'
}).argv;

json2bson.convert(argv.files, argv.outdir, {
    verbose: argv.verbose,
    exclusions: argv.exclude,
    breakOnSchemaValidationErrors: argv.break
});