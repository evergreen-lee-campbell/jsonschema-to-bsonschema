"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var glob = __importStar(require("glob"));
var fs = __importStar(require("fs"));
var refParser = __importStar(require("json-schema-ref-parser"));
var JSONSchema = __importStar(require("json-schema"));
function _transformSchemas(fileList, outputDirectory) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var completedSchemas = 0;
                    fileList.forEach(function (fileName) {
                        fs.readFile(fileName, function (err, fileData) { return __awaiter(_this, void 0, void 0, function () {
                            var schema, ex_1, outputFileName;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        console.info('Reading ' + fileName);
                                        if (err)
                                            return [2 /*return*/, reject(err)];
                                        schema = null;
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, refParser.default.dereference(JSON.parse(fileData.toString('utf8')))];
                                    case 2:
                                        schema = _a.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        ex_1 = _a.sent();
                                        return [2 /*return*/, reject(ex_1)];
                                    case 4:
                                        if (!schema) {
                                            console.error('Schema was not dereferenced.');
                                            return [2 /*return*/, reject(new Error("Schema was not dereferenced."))];
                                        }
                                        delete schema.definitions;
                                        if (outputDirectory) {
                                            // dunno yet
                                        }
                                        else {
                                            try {
                                                outputFileName = fileName.split('.json')[0] + ".bson";
                                                console.info('Writing file ' + outputFileName);
                                                fs.writeFileSync(outputFileName, JSON.stringify(schema, null, 4));
                                            }
                                            catch (ex) {
                                                return [2 /*return*/, reject(ex)];
                                            }
                                        }
                                        completedSchemas++;
                                        console.info('Dereferenced ' + completedSchemas + ' of ' + fileList.length + ' schemas ');
                                        if (completedSchemas === fileList.length) {
                                            resolve();
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                    });
                })];
        });
    });
}
function _validateInputSchemas(fileList, options) {
    return __awaiter(this, void 0, void 0, function () {
        var schema;
        return __generator(this, function (_a) {
            schema = JSON.parse(JSON.stringify(draft04schema));
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var validCount = 0;
                    var invalidCount = 0;
                    for (var i = 0; i < fileList.length; i++) {
                        var fileBuffer = void 0;
                        try {
                            fileBuffer = fs.readFileSync(fileList[i]);
                        }
                        catch (ex) {
                            return reject(ex);
                        }
                        var valid = void 0;
                        try {
                            valid = JSONSchema.validate(JSON.parse(fileBuffer.toString('utf-8')), schema);
                        }
                        catch (ex) {
                            return reject(ex);
                        }
                        if (valid.errors && valid.errors.length > 0) {
                            if (options && options.breakOnSchemaValidationErrors) {
                                return reject(valid.errors);
                            }
                            else {
                                console.info(valid.errors);
                            }
                            invalidCount++;
                        }
                        else {
                            validCount++;
                        }
                    }
                    console.log('Input schema validation completed.');
                    console.info(validCount + " of " + fileList.length + " schemas PASSED validation.");
                    if (invalidCount > 0) {
                        console.info(invalidCount + " of " + fileList.length + " schemas FAILED validation.");
                    }
                    resolve({
                        valid: validCount,
                        invalid: invalidCount
                    });
                })];
        });
    });
}
function convert(inputGlob, outputDirectory, options) {
    return __awaiter(this, void 0, void 0, function () {
        var _fileList, validationResults, ex_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _fileList = [];
                    if (!outputDirectory) {
                        console.info('No output directory specified, outputting each converted BSON schema in the same directory as its source JSON.');
                    }
                    try {
                        _fileList.push.apply(_fileList, glob.sync(inputGlob));
                    }
                    catch (ex) {
                        return [2 /*return*/, console.error(ex)];
                    }
                    if (_fileList.length < 1) {
                        return [2 /*return*/, console.error('No input files were specified.')];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _validateInputSchemas(_fileList)];
                case 2:
                    validationResults = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    ex_2 = _a.sent();
                    return [2 /*return*/, console.error(ex_2)];
                case 4:
                    if (validationResults.valid === 0 && validationResults.invalid > 0) {
                        return [2 /*return*/, console.error('No schemas passed validation. Please resolve schema errors above and try again.')];
                    }
                    // once we've passed validation, create the BSON schemas from each of the JSON schemas...
                    console.info('Beginning JSON -> BSON conversion.');
                    _transformSchemas(_fileList, outputDirectory).then(function () {
                        console.log('Done!');
                    }, function (err) {
                        console.error(err);
                    });
                    return [2 /*return*/];
            }
        });
    });
}
exports.convert = convert;
var draft04schema = {
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
            "allOf": [{ "$ref": "#/definitions/positiveInteger" }, { "default": 0 }]
        },
        "simpleTypes": {
            "enum": ["array", "boolean", "integer", "null", "number", "object", "string"]
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
        "exclusiveMaximum": ["maximum"],
        "exclusiveMinimum": ["minimum"]
    },
    "default": {}
};
