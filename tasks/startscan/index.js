"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.__esModule = true;
exports.getCodeThreatEndpoint = void 0;
var task = require("azure-pipelines-task-lib");
var tl = require("azure-pipelines-task-lib");
var request = require("request");
var zip_a_folder_1 = require("zip-a-folder");
var fs = require("fs");
var path = require("path");
var buffer_1 = require("buffer");
var utils_1 = require("./utils");
function getCodeThreatEndpoint() {
    var clusterConnection = task.getInput('codethreatService');
    var auth = task.getEndpointAuthorization(clusterConnection, false);
    var serverUrl = task.getEndpointUrl(clusterConnection, false);
    return {
        serverUrl: serverUrl,
        parameters: auth.parameters,
        scheme: auth.scheme
    };
}
exports.getCodeThreatEndpoint = getCodeThreatEndpoint;
function getExtensionVersion() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var filePath = path.resolve(__dirname, 'vss-extension.json'); // Adjust the path if needed
                    fs.readFile(filePath, 'utf8', function (err, data) {
                        if (err) {
                            reject("Failed to read vss-extension.json");
                        }
                        else {
                            var jsonData = JSON.parse(data);
                            resolve(jsonData.version);
                        }
                    });
                })];
        });
    });
}
function logAndReject(reject, errMsg) {
    tl.debug(errMsg);
    return reject(new Error(errMsg));
}
function isString(x) {
    return Object.prototype.toString.call(x) === "[object String]";
}
function get(endpoint, path, token, org, isJson, query) {
    tl.debug("[CT] API GET: '" + path + "' with query \"" + JSON.stringify(query) + "\"");
    return new Promise(function (resolve, reject) {
        var options = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org
            }
        };
        if (query) {
            options.qs = query;
            options.useQuerystring = true;
        }
        request.get(__assign({ method: "GET", baseUrl: endpoint.serverUrl, uri: path, json: isJson }, options), function (error, response, body) {
            if (error) {
                return logAndReject(reject, "[CT] API GET '" + path + "' failed, error was: " + JSON.stringify(error));
            }
            // tl.debug(
            //     `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
            // );
            if (response.statusCode == 404 || response.statusCode == 400) {
                return resolve(404);
            }
            if (response.statusCode < 200 || response.statusCode >= 300) {
                return logAndReject(reject, "[CT] API GET '" + path + "' failed, status code was: " + response.statusCode);
            }
            return resolve(body || (isJson ? {} : ""));
        });
    });
}
function post(endpoint, path, token, org, isJson, body, query) {
    // tl.debug(`[CT] API GET: '${path}' with query "${JSON.stringify(query)}"`);
    // tl.debug(`[CT] API GET: '${path}' with query "${body}"`);
    return new Promise(function (resolve, reject) {
        var options = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org,
                'Content-Type': 'application/json'
            }
        };
        request.post(__assign({ method: "POST", baseUrl: endpoint.serverUrl, uri: path, body: body, json: isJson }, options), function (error, response, body) {
            if (error) {
                return logAndReject(reject, "[CT] API GET '" + path + "' failed, error was: " + JSON.stringify(error));
            }
            // tl.debug(
            //     `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
            // );
            if (response.statusCode < 200 || response.statusCode >= 300) {
                var errorMessage = "[CT] API GET '" + path + "' failed, status code was: " + response.statusCode;
                if (body && body.message) {
                    errorMessage += " Message: " + body.message;
                }
                return logAndReject(reject, errorMessage);
            }
            return resolve(body || (isJson ? {} : ""));
        });
    });
}
function multipart_post(endpoint, path, token, org, isJson, formDatas, body, query) {
    return new Promise(function (resolve, reject) {
        var options = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org,
                'Content-Type': 'multipart/form-data'
            },
            formData: formDatas
        };
        request.post(__assign({ method: "POST", baseUrl: endpoint.serverUrl, uri: path }, options), function (error, response, body) {
            if (error) {
                return logAndReject(reject, "[CT] API GET '" + path + "' failed, error was: " + JSON.stringify(error));
            }
            // tl.debug(
            //     `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
            // );
            if (response.statusCode < 200 || response.statusCode >= 300) {
                var errorMessage = "[CT] API GET '" + path + "' failed, status code was: " + response.statusCode;
                if (body && body.message) {
                    errorMessage += " Message: " + body.message;
                }
                return logAndReject(reject, errorMessage);
            }
            return resolve(body || (isJson ? {} : ""));
        });
    });
}
function auth_post(endpoint, path, authHeader, isJson, query) {
    tl.debug("[CT] API POST: '" + path + "' with query \"" + JSON.stringify(query) + "\"");
    return new Promise(function (resolve, reject) {
        var options = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': authHeader
            }
        };
        // console.log(options);
        request.post(__assign({ method: "POST", baseUrl: endpoint.serverUrl, uri: path, json: false }, options), function (error, response, body) {
            if (error) {
                return logAndReject(reject, "[CT] API POST '" + path + "' failed, error was: " + JSON.stringify(error));
            }
            tl.debug("Response: " + response.statusCode + " Body: \"" + (isString(body) ? body : JSON.stringify(body)) + "\"");
            if (response.statusCode < 200 || response.statusCode >= 300) {
                var errorMessage = "[CT] API GET '" + path + "' failed, status code was: " + response.statusCode;
                if (body && body.message) {
                    errorMessage += " Message: " + body.message;
                }
                return logAndReject(reject, errorMessage);
            }
            return resolve(body || (isJson ? {} : ""));
        });
    });
}
function scan_analyze(endpoint, path, token, org) {
    return new Promise(function (resolve, reject) {
        var options = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org,
                'Content-Type': 'multipart/form-data'
            }
        };
        request.get(__assign({ method: "GET", baseUrl: endpoint.serverUrl, uri: path }, options), function (error, response, body) {
            if (error) {
                return logAndReject(reject, "[CT] API GET '" + path + "' failed, error was: " + JSON.stringify(error));
            }
            tl.debug("Response: " + response.statusCode + " Body: \"" + (isString(body) ? body : JSON.stringify(body)) + "\"");
            if (response.statusCode < 200 || response.statusCode >= 300) {
                var errorMessage = "[CT] API GET '" + path + "' failed, status code was: " + response.statusCode;
                if (body && body.message) {
                    errorMessage += " Message: " + body.message;
                }
                return logAndReject(reject, errorMessage);
            }
            return resolve(body);
        });
    });
}
function getStatus(endpoint, path, token, org, isJson, query) {
    tl.debug("[CT] API GET: '" + path + "' with query \"" + JSON.stringify(query) + "\"");
    return new Promise(function (resolve, reject) {
        var options = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org
            }
        };
        if (query) {
            options.qs = query;
            options.useQuerystring = true;
        }
        request.get(__assign({ method: "GET", baseUrl: endpoint.serverUrl, uri: path, json: isJson }, options), function (error, response, body) {
            if (error) {
                return logAndReject(reject, "[CT] API GET '" + path + "' failed, error was: " + JSON.stringify(error));
            }
            tl.debug("Response: " + response.statusCode + " Body: \"" + (isString(body) ? body : JSON.stringify(body)) + "\"");
            if (response.statusCode == 404 || response.statusCode == 400) {
                return resolve(404);
            }
            if (response.statusCode < 200 || response.statusCode >= 300) {
                var errorMessage = "[CT] API GET '" + path + "' failed, status code was: " + response.statusCode;
                if (body && body.message) {
                    errorMessage += " Message: " + body.message;
                }
                return logAndReject(reject, errorMessage);
            }
            var result = {
                body: body,
                headers: response.headers
            };
            return resolve(result || (isJson ? {} : ""));
        });
    });
}
function getRepoVisibility(endpoint, repoProvider, accountName) {
    return new Promise(function (resolve, reject) {
        var project = tl.getVariable('System.TeamProject');
        var patToken = endpoint.parameters.azuretoken;
        var apiUrl = endpoint.parameters.AzureBaseUrl + "/" + accountName + "/" + project + "/_apis/git/repositories?api-version=7.1-preview.1";
        if (repoProvider === 'TfsVersionControl')
            apiUrl = endpoint.parameters.AzureBaseUrl + "/" + accountName + "/" + project + "/_apis/tfvc/items?path=/&api-version=6.0";
        var options = {
            url: apiUrl,
            headers: {
                'Authorization': 'Basic ' + buffer_1.Buffer.from(':' + patToken).toString('base64')
            }
        };
        request.get(options, function (error, response, body) {
            if (error) {
                reject(error);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error("API responded with status code: " + response.statusCode));
                return;
            }
            var data = JSON.parse(body);
            resolve(data);
        });
    });
}
function repoIdMatch(endpoint, repoPath, accountName) {
    return new Promise(function (resolve, reject) {
        var patToken = endpoint.parameters.azuretoken;
        var apiUrl = endpoint.parameters.AzureBaseUrl + "/" + accountName + "/_apis/projects?api-version=6.0";
        var options = {
            url: apiUrl,
            headers: {
                'Authorization': 'Basic ' + buffer_1.Buffer.from(':' + patToken).toString('base64')
            }
        };
        request.get(options, function (error, response, body) {
            if (error) {
                reject(error);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error("API responded with status code: " + response.statusCode));
                return;
            }
            var data = JSON.parse(body);
            var matchedPName = repoPath.match(/\$\/(\w+)/)[1];
            var pid;
            for (var _i = 0, _a = data.value; _i < _a.length; _i++) {
                var item = _a[_i];
                if (item.name === matchedPName) {
                    pid = item.id;
                    break;
                }
            }
            resolve(pid);
        });
    });
}
function run() {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function () {
        var orgname_1, projectName_1, maxCritical_1, maxHigh_1, weakness_is_1, condition_1, endpoint_1, branch, commitId, repositoryName_1, collectionUri, parts, accountName, repoId, repoProvider, repoVisibility, projectID, repoPath, dataRepoInfo, error_1, idmid, sourceDirectory, tempDir, tfvcRepoIdName, zipPath, IssuesResult_1, encode, token_1, authHeader, response, authResponse, paramBody, formData, uploadRes, scanStartResult, cancellation_1, delay_1, awaitScan_1, resultScan_1, err_1;
        var _this = this;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 14, , 15]);
                    orgname_1 = tl.getInput('organization', true);
                    projectName_1 = tl.getInput('projectName', true);
                    maxCritical_1 = tl.getInput('MaxCritical', false);
                    maxHigh_1 = tl.getInput('MaxHigh', false);
                    weakness_is_1 = tl.getInput('WeaknessIs', false);
                    condition_1 = tl.getInput('Condition', false);
                    endpoint_1 = getCodeThreatEndpoint();
                    branch = tl.getVariable("Build.SourceBranch");
                    commitId = tl.getVariable("Build.SourceVersion");
                    repositoryName_1 = tl.getVariable("Build.Repository.Name");
                    console.log("Branch", branch);
                    console.log("RepoName", repositoryName_1);
                    collectionUri = tl.getVariable('System.TeamFoundationCollectionUri');
                    collectionUri.substring(0, collectionUri.length - 1);
                    parts = collectionUri.split('/');
                    accountName = parts[parts.length - 2];
                    repoId = tl.getVariable('Build.Repository.Id');
                    repoProvider = tl.getVariable('Build.Repository.Provider');
                    repoVisibility = void 0;
                    if (endpoint_1.parameters.AzureBaseUrl === undefined || !endpoint_1.parameters.AzureBaseUrl) {
                        endpoint_1.parameters.AzureBaseUrl = "https://dev.azure.com";
                    }
                    if (condition_1 === undefined) {
                        weakness_is_1 = "AND";
                    }
                    projectID = void 0;
                    repoPath = void 0;
                    if (!(repoProvider === "TfsGit" || repoProvider === "TfsVersionControl")) return [3 /*break*/, 4];
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, getRepoVisibility(endpoint_1, repoProvider, accountName)];
                case 2:
                    dataRepoInfo = _g.sent();
                    repoVisibility = ((_c = (_b = (_a = dataRepoInfo === null || dataRepoInfo === void 0 ? void 0 : dataRepoInfo.value) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.project) === null || _c === void 0 ? void 0 : _c.visibility) || null;
                    projectID = (_f = (_e = (_d = dataRepoInfo === null || dataRepoInfo === void 0 ? void 0 : dataRepoInfo.value) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.project) === null || _f === void 0 ? void 0 : _f.id;
                    repoPath = dataRepoInfo.path;
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _g.sent();
                    console.error("Error fetching repository data:", error_1);
                    return [3 /*break*/, 4];
                case 4:
                    idmid = void 0;
                    if (!repoPath) return [3 /*break*/, 6];
                    return [4 /*yield*/, repoIdMatch(endpoint_1, repoPath, accountName)];
                case 5:
                    idmid = _g.sent();
                    _g.label = 6;
                case 6:
                    // Start with a separator to distinguish this log block
                    console.log('--------------------- Log Details ---------------------');
                    // Group related logs for better organization
                    console.group('Azure Details');
                    console.log('Account Name      :', accountName);
                    console.log('Project Name      :', projectName_1);
                    console.log('Repository Provider:', repoProvider);
                    console.log('Repository ID     :', repoId);
                    console.groupEnd();
                    // Add a little space between groups for readability
                    console.log('');
                    console.group('CodeThreat Details');
                    console.log('Connection to Server URL:', endpoint_1.serverUrl);
                    console.groupEnd();
                    // End with a separator
                    console.log('------------------------------------------------------');
                    sourceDirectory = task.getVariable("Build.SourcesDirectory");
                    tempDir = task.getVariable("Agent.TempDirectory");
                    tfvcRepoIdName = void 0;
                    if (repoProvider === "TfsVersionControl") {
                        tfvcRepoIdName = branch.substring(2) + ":" + idmid + ":null";
                    }
                    console.log("[CT] Preparing scan files...");
                    zipPath = tempDir + '/' + projectName_1 + '.zip';
                    return [4 /*yield*/, zip_a_folder_1.zip(sourceDirectory !== null && sourceDirectory !== void 0 ? sourceDirectory : '', zipPath)];
                case 7:
                    _g.sent();
                    IssuesResult_1 = function (repoName, token, ctServer, allOrNew) { return __awaiter(_this, void 0, void 0, function () {
                        var query, encodedQ, newIssueResult, xCtPager, allData_1, promises, i, responses, error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    query = {
                                        projectName: projectName_1 // tfvcRepoIdName ? tfvcRepoIdNameR : repositoryName
                                    };
                                    if (allOrNew === "new") {
                                        query.historical = ["New Issue"];
                                    }
                                    encodedQ = buffer_1.Buffer.from(JSON.stringify(query)).toString('base64');
                                    return [4 /*yield*/, getStatus(ctServer, "/api/scanlog/issues?q=" + encodedQ + "&pageSize=500", token, orgname_1, false)];
                                case 1:
                                    newIssueResult = _a.sent();
                                    xCtPager = JSON.parse(buffer_1.Buffer.from(newIssueResult.headers["x-ct-pager"], 'base64').toString());
                                    allData_1 = [];
                                    promises = [];
                                    for (i = 1; i <= xCtPager.pages; i++) {
                                        promises.push(getStatus(ctServer, "/api/scanlog/issues?q=" + encodedQ + "&pid=" + xCtPager.id + "&page=" + i, token, orgname_1, true));
                                    }
                                    return [4 /*yield*/, Promise.all(promises)];
                                case 2:
                                    responses = _a.sent();
                                    responses.forEach(function (response) {
                                        response.body.forEach(function (issue) {
                                            allData_1.push(issue);
                                        });
                                    });
                                    return [2 /*return*/, allData_1];
                                case 3:
                                    error_2 = _a.sent();
                                    console.log("IssuesResult --- " + error_2);
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); };
                    encode = function (str) { return buffer_1.Buffer.from(str, 'binary').toString('base64'); };
                    if (!(endpoint_1.parameters.username && endpoint_1.parameters.password)) return [3 /*break*/, 9];
                    authHeader = 'Basic ' + encode(endpoint_1.parameters.username + ':' + endpoint_1.parameters.password);
                    return [4 /*yield*/, auth_post(endpoint_1, "api/signin", authHeader, true)];
                case 8:
                    response = _g.sent();
                    authResponse = JSON.parse(response);
                    token_1 = authResponse.access_token;
                    return [3 /*break*/, 10];
                case 9:
                    token_1 = endpoint_1.parameters.token;
                    _g.label = 10;
                case 10:
                    paramBody = {
                        repoId: tfvcRepoIdName ? tfvcRepoIdName : repositoryName_1 + ":" + repoId + ":" + projectID,
                        account: accountName,
                        project: projectName_1,
                        branch: branch,
                        type: repoProvider,
                        visibility: repoVisibility,
                        baseURL: endpoint_1.parameters.AzureBaseUrl,
                        azureToken: endpoint_1.parameters.azuretoken,
                        action: true
                    };
                    return [4 /*yield*/, post(endpoint_1, "/api/integration/azure/set", token_1, orgname_1, true, paramBody)];
                case 11:
                    _g.sent();
                    formData = {
                        'upfile': {
                            'value': fs.createReadStream(zipPath),
                            'options': {
                                'filename': zipPath,
                                'contentType': 'multipart/form-data'
                            }
                        },
                        'project': projectName_1,
                        'from': 'azure',
                        'branch': branch,
                        'commitId': idmid ? idmid : commitId,
                        'baseURL': endpoint_1.parameters.AzureBaseUrl
                    };
                    tl.debug("formdata: " + formData);
                    return [4 /*yield*/, multipart_post(endpoint_1, "api/plugins/azure", token_1, orgname_1, true, formData)];
                case 12:
                    uploadRes = _g.sent();
                    scanStartResult = JSON.parse(uploadRes);
                    delay_1 = function (ms) { return new Promise(function (res) { return setTimeout(res, ms); }); };
                    awaitScan_1 = function (sid) { return __awaiter(_this, void 0, void 0, function () {
                        var scanResult, scanStatusResult, scanResultObject, newIssues, weaknessIsCount, weaknessIsKeywords, error_3;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 8, , 9]);
                                    return [4 /*yield*/, scan_analyze(endpoint_1, "api/scan/status/" + sid, token_1, orgname_1)];
                                case 1:
                                    scanResult = _a.sent();
                                    scanStatusResult = JSON.parse(scanResult);
                                    if (scanStatusResult.state === "failure") {
                                        tl.setResult(tl.TaskResult.Failed, "CodeThreat SCAN FAILED.");
                                        throw new Error("CodeThreat Scan failed, Check the connection settings");
                                    }
                                    scanResultObject = {
                                        critical: scanStatusResult.severities.critical || 0,
                                        high: scanStatusResult.severities.high || 0,
                                        medium: scanStatusResult.severities.medium || 0,
                                        low: scanStatusResult.severities.low || 0
                                    };
                                    console.log("Scanning... %" + scanStatusResult.progress_data.progress + " | Critical: " + scanResultObject.critical + " | High: " + scanResultObject.high + " | Medium: " + scanResultObject.medium + " | Low: " + scanResultObject.low);
                                    return [4 /*yield*/, IssuesResult_1(repositoryName_1, token_1, endpoint_1, "new")];
                                case 2:
                                    newIssues = _a.sent();
                                    weaknessIsCount = [];
                                    if (weakness_is_1 !== undefined) {
                                        weaknessIsKeywords = weakness_is_1 === null || weakness_is_1 === void 0 ? void 0 : weakness_is_1.split(",");
                                        weaknessIsCount = utils_1.findWeaknessTitles(newIssues, weaknessIsKeywords);
                                    }
                                    if (condition_1 === "OR") {
                                        if (maxCritical_1 &&
                                            maxCritical_1 < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.critical)) {
                                            tl.setResult(tl.TaskResult.Failed, "!! FAILED : Critical limit exceeded. ");
                                            cancellation_1 = true;
                                        }
                                        else if (maxHigh_1 &&
                                            maxHigh_1 < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.high)) {
                                            tl.setResult(tl.TaskResult.Failed, "!! FAILED : High limit exceeded. ");
                                            cancellation_1 = true;
                                        }
                                        else if (weaknessIsCount.length > 0) {
                                            tl.setResult(tl.TaskResult.Failed, "!! FAILED : Weaknesses entered in the weakness_is key were found during the scan.");
                                            cancellation_1 = true;
                                        }
                                    }
                                    else if (condition_1 === "AND") {
                                        if ((maxCritical_1 &&
                                            maxCritical_1 < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.critical)) ||
                                            (maxHigh_1 &&
                                                maxHigh_1 < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.high)) ||
                                            weaknessIsCount.length > 0) {
                                            tl.setResult(tl.TaskResult.Failed, "!! FAILED: A Not all conditions are met according to the given arguments.");
                                            cancellation_1 = true;
                                        }
                                    }
                                    if (!(scanStatusResult.state === "end" || cancellation_1)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, resultScan_1(scanStatusResult, scanResultObject, sid, projectName_1)];
                                case 3:
                                    _a.sent();
                                    return [3 /*break*/, 7];
                                case 4: return [4 /*yield*/, delay_1(5000)];
                                case 5:
                                    _a.sent(); // Use the delay function here
                                    return [4 /*yield*/, awaitScan_1(sid)];
                                case 6:
                                    _a.sent();
                                    _a.label = 7;
                                case 7: return [3 /*break*/, 9];
                                case 8:
                                    error_3 = _a.sent();
                                    console.error("An error occurred: " + error_3.message);
                                    // Handle error as needed, for example:
                                    tl.setResult(tl.TaskResult.Failed, "An error occurred during scanning: " + error_3.message);
                                    return [3 /*break*/, 9];
                                case 9: return [2 /*return*/];
                            }
                        });
                    }); };
                    resultScan_1 = function (scanStatusResult, scanResultObject, sid, projectName) { return __awaiter(_this, void 0, void 0, function () {
                        var reason, newIssues, allIssues, durationTime, riskscore, newIssuesData, newIssuesSeverity, allIssuesData, allIssuesSeverity, totalCountNewIssues, _i, newIssuesData_1, obj, total, printTableRow, resultsData, outputPath, artifactName, artifactType, artifactPath;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!cancellation_1) {
                                        reason = "\"\nScan completed successfully ...\n\"";
                                    }
                                    else {
                                        reason =
                                            "Pipeline interrupted because the FAILED_ARGS arguments you entered were found... ";
                                    }
                                    console.log(reason);
                                    return [4 /*yield*/, IssuesResult_1(projectName, token_1, endpoint_1, "new")];
                                case 1:
                                    newIssues = _a.sent();
                                    return [4 /*yield*/, IssuesResult_1(projectName, token_1, endpoint_1, "all")];
                                case 2:
                                    allIssues = _a.sent();
                                    durationTime = utils_1.convertToHHMMSS(scanStatusResult.ended_at, scanStatusResult.started_at);
                                    riskscore = utils_1.getScore(scanStatusResult.riskscore);
                                    newIssuesData = utils_1.countAndGroupByTitle(newIssues);
                                    newIssuesSeverity = utils_1.countBySeverity(newIssuesData);
                                    allIssuesData = utils_1.countAndGroupByTitle(allIssues);
                                    allIssuesSeverity = utils_1.countBySeverity(allIssuesData);
                                    totalCountNewIssues = 0;
                                    for (_i = 0, newIssuesData_1 = newIssuesData; _i < newIssuesData_1.length; _i++) {
                                        obj = newIssuesData_1[_i];
                                        totalCountNewIssues += obj.count;
                                    }
                                    total = Object.values(scanStatusResult.severities).reduce(function (a, b) { return a + b; }, 0);
                                    printTableRow = function (label, totalVal, newVal) {
                                        console.log("| " + label.padEnd(8) + " |" + utils_1.cL(totalVal, newVal) + "|");
                                    };
                                    console.log('+----------+-------------+-----------+');
                                    console.log('| Weakness | Total Issue | New Issue |');
                                    console.log('+----------+-------------+-----------+');
                                    // Print each row of the table
                                    printTableRow('Critical', scanResultObject.critical, newIssuesSeverity.critical);
                                    printTableRow('High', scanResultObject.high, newIssuesSeverity.high);
                                    printTableRow('Medium', scanResultObject.medium, newIssuesSeverity.medium);
                                    printTableRow('Low', scanResultObject.low, newIssuesSeverity.low);
                                    printTableRow('TOTAL', total, totalCountNewIssues);
                                    console.log('+----------+-------------+-----------+');
                                    console.log("\nSee All Results: " + endpoint_1.serverUrl + "issues?scan_id=" + sid + "&projectName=" + projectName);
                                    console.log("\n** -------WEAKNESSES-------- **\n");
                                    allIssuesData.map(function (r) {
                                        console.log(r.title + " - (" + (r.severity.charAt(0).toUpperCase() + r.severity.slice(1)) + ") - " + r.count);
                                    });
                                    if (!cancellation_1) {
                                        console.log("\n** -------DURATION TIME-------- **");
                                        console.log("Duration Time: " + durationTime);
                                        console.log("\n** -------RISK SCORE-------- **");
                                        console.log("Risk Score: " + riskscore.score);
                                    }
                                    resultsData = {
                                        scanStatus: scanStatusResult,
                                        newIssues: newIssuesData,
                                        allIssues: allIssuesData,
                                        duration: durationTime,
                                        riskScore: riskscore
                                    };
                                    try {
                                        outputPath = 'codethreat-scan-results.json';
                                        fs.writeFileSync(outputPath, JSON.stringify(resultsData));
                                        artifactName = 'codethreat-scan-results';
                                        artifactType = 'container';
                                        artifactPath = tl.resolve(tl.getVariable('System.DefaultWorkingDirectory'), outputPath);
                                        tl.command('artifact.upload', { artifactname: artifactName, artifacttype: artifactType }, artifactPath);
                                    }
                                    catch (error) {
                                        console.error("Failed to publish artifact:", error);
                                        tl.setResult(tl.TaskResult.Failed, error.message);
                                        // Handle the error as appropriate for your task
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    return [4 /*yield*/, awaitScan_1(scanStartResult.scan_id)];
                case 13:
                    _g.sent();
                    return [3 /*break*/, 15];
                case 14:
                    err_1 = _g.sent();
                    console.log("step failed : " + err_1);
                    tl.setResult(tl.TaskResult.Failed, err_1.message);
                    return [3 /*break*/, 15];
                case 15: return [2 /*return*/];
            }
        });
    });
}
run();
