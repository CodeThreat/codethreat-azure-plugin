"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCodeThreatEndpoint = void 0;
const task = require("azure-pipelines-task-lib");
const tl = require("azure-pipelines-task-lib");
const request = __importStar(require("request"));
const zip_a_folder_1 = require("zip-a-folder");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const buffer_1 = require("buffer");
const utils_1 = require("./utils");
function getCodeThreatEndpoint() {
    const clusterConnection = task.getInput('codethreatService');
    const auth = task.getEndpointAuthorization(clusterConnection, false);
    const serverUrl = task.getEndpointUrl(clusterConnection, false);
    return {
        serverUrl,
        parameters: auth.parameters,
        scheme: auth.scheme
    };
}
exports.getCodeThreatEndpoint = getCodeThreatEndpoint;
function getExtensionVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const filePath = path.resolve(__dirname, 'vss-extension.json'); // Adjust the path if needed
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject("Failed to read vss-extension.json");
                }
                else {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData.version);
                }
            });
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
    tl.debug(`[CT] API GET: '${path}' with query "${JSON.stringify(query)}"`);
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org
            }
        };
        if (query) {
            options.qs = query;
            options.useQuerystring = true;
        }
        request.get(Object.assign({ method: "GET", baseUrl: endpoint.serverUrl, uri: path, json: isJson }, options), (error, response, body) => {
            if (error) {
                return logAndReject(reject, `[CT] API GET '${path}' failed, error was: ${JSON.stringify(error)}`);
            }
            // tl.debug(
            //     `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
            // );
            if (response.statusCode == 404 || response.statusCode == 400) {
                return resolve(404);
            }
            if (response.statusCode < 200 || response.statusCode >= 300) {
                return logAndReject(reject, `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`);
            }
            return resolve(body || (isJson ? {} : ""));
        });
    });
}
function post(endpoint, path, token, org, isJson, body, query) {
    // tl.debug(`[CT] API GET: '${path}' with query "${JSON.stringify(query)}"`);
    // tl.debug(`[CT] API GET: '${path}' with query "${body}"`);
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org,
                'Content-Type': 'application/json'
            }
        };
        request.post(Object.assign({ method: "POST", baseUrl: endpoint.serverUrl, uri: path, body: body, json: isJson }, options), (error, response, body) => {
            if (error) {
                return logAndReject(reject, `[CT] API GET '${path}' failed, error was: ${JSON.stringify(error)}`);
            }
            // tl.debug(
            //     `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
            // );
            if (response.statusCode < 200 || response.statusCode >= 300) {
                let errorMessage = `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`;
                if (body && body.message) {
                    errorMessage += ` Message: ${body.message}`;
                }
                return logAndReject(reject, errorMessage);
            }
            return resolve(body || (isJson ? {} : ""));
        });
    });
}
function multipart_post(endpoint, path, token, org, isJson, formDatas, body, query) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org,
                'Content-Type': 'multipart/form-data'
            },
            formData: formDatas
        };
        request.post(Object.assign({ method: "POST", baseUrl: endpoint.serverUrl, uri: path }, options), (error, response, body) => {
            if (error) {
                return logAndReject(reject, `[CT] API GET '${path}' failed, error was: ${JSON.stringify(error)}`);
            }
            // tl.debug(
            //     `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
            // );
            if (response.statusCode < 200 || response.statusCode >= 300) {
                let errorMessage = `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`;
                if (body && body.message) {
                    errorMessage += ` Message: ${body.message}`;
                }
                return logAndReject(reject, errorMessage);
            }
            return resolve(body || (isJson ? {} : ""));
        });
    });
}
function auth_post(endpoint, path, authHeader, isJson, query) {
    tl.debug(`[CT] API POST: '${path}' with query "${JSON.stringify(query)}"`);
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': authHeader
            }
        };
        // console.log(options);
        request.post(Object.assign({ method: "POST", baseUrl: endpoint.serverUrl, uri: path, json: false }, options), (error, response, body) => {
            if (error) {
                return logAndReject(reject, `[CT] API POST '${path}' failed, error was: ${JSON.stringify(error)}`);
            }
            tl.debug(`Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`);
            if (response.statusCode < 200 || response.statusCode >= 300) {
                let errorMessage = `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`;
                if (body && body.message) {
                    errorMessage += ` Message: ${body.message}`;
                }
                return logAndReject(reject, errorMessage);
            }
            return resolve(body || (isJson ? {} : ""));
        });
    });
}
function scan_analyze(endpoint, path, token, org) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org,
                "plugin": true
            },
        };
        request.get(Object.assign({ method: "GET", baseUrl: endpoint.serverUrl, uri: path }, options), (error, response, body) => {
            if (error) {
                return logAndReject(reject, `[CT] API GET '${path}' failed, error was: ${JSON.stringify(error)}`);
            }
            tl.debug(`Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`);
            if (response.statusCode < 200 || response.statusCode >= 300) {
                let errorMessage = `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`;
                if (body && body.message) {
                    errorMessage += ` Message: ${body.message}`;
                }
                return logAndReject(reject, errorMessage);
            }
            return resolve(body);
        });
    });
}
function getStatus(endpoint, path, token, org, isJson, query) {
    tl.debug(`[CT] API GET: '${path}' with query "${JSON.stringify(query)}"`);
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org
            }
        };
        if (query) {
            options.qs = query;
            options.useQuerystring = true;
        }
        request.get(Object.assign({ method: "GET", baseUrl: endpoint.serverUrl, uri: path, json: isJson }, options), (error, response, body) => {
            if (error) {
                return logAndReject(reject, `[CT] API GET '${path}' failed, error was: ${JSON.stringify(error)}`);
            }
            tl.debug(`Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`);
            if (response.statusCode == 404 || response.statusCode == 400) {
                return resolve(404);
            }
            if (response.statusCode < 200 || response.statusCode >= 300) {
                let errorMessage = `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`;
                if (body && body.message) {
                    errorMessage += ` Message: ${body.message}`;
                }
                return logAndReject(reject, errorMessage);
            }
            const result = {
                body: body,
                headers: response.headers
            };
            return resolve(result || (isJson ? {} : ""));
        });
    });
}
function getRepoVisibility(endpoint, repoProvider, accountName) {
    return new Promise((resolve, reject) => {
        const project = tl.getVariable('System.TeamProject');
        const patToken = endpoint.parameters.azuretoken;
        let apiUrl = `${endpoint.parameters.AzureBaseUrl}/${accountName}/${project}/_apis/git/repositories?api-version=6.0`;
        if (repoProvider === 'TfsVersionControl')
            apiUrl = `${endpoint.parameters.AzureBaseUrl}/${accountName}/${project}/_apis/tfvc/items?path=/&api-version=6.0`;
        const options = {
            url: apiUrl,
            headers: {
                'Authorization': 'Basic ' + buffer_1.Buffer.from(':' + patToken).toString('base64')
            }
        };
        request.get(options, (error, response, body) => {
            if (error) {
                reject(error);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`API responded with status code: ${response.statusCode}`));
                return;
            }
            const data = JSON.parse(body);
            resolve(data);
        });
    });
}
function check(ctServer, repoName, authToken, orgname) {
    return new Promise((resolve, reject) => {
        const options = {
            url: `${ctServer}api/project?key=${repoName}`,
            headers: {
                Authorization: authToken,
                "x-ct-organization": orgname,
            },
        };
        request.get(options, (error, response, body) => {
            if (error) {
                reject(error);
                return;
            }
            if (response.statusCode < 200 || response.statusCode >= 300) {
                resolve({
                    type: null,
                });
                return;
            }
            const checkProject = JSON.parse(body);
            if (checkProject.type !== "azure") {
                reject(new Error("There is a project with this name, but its type is not azure."));
                return;
            }
            resolve(checkProject);
        });
    });
}
;
function helper(ctServer, repoName, authToken, orgname, sid) {
    return new Promise((resolve, reject) => {
        const options = {
            url: `${ctServer}api/plugins/helper?sid=${sid}`,
            headers: {
                Authorization: authToken,
                "x-ct-organization": orgname,
                "x-ct-from": "azure"
            },
        };
        request.get(options, (error, response, body) => {
            if (error) {
                reject(error);
                return;
            }
            if (response.statusCode < 200 || response.statusCode >= 300) {
                let errorMessage = `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`;
                if (body && body.message) {
                    errorMessage += ` Message: ${body.message}`;
                }
                return logAndReject(reject, errorMessage);
            }
            const scanData = JSON.parse(body);
            resolve(scanData);
        });
    });
}
;
function run() {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const orgname = tl.getInput('organization', true);
            const projectName = tl.getInput('projectName', true);
            const maxCritical = tl.getInput('MaxCritical', false);
            const maxHigh = tl.getInput('MaxHigh', false);
            const scaMaxCritical = tl.getInput('ScaMaxCritical', false);
            const scaMaxHigh = tl.getInput('ScaMaxHigh', false);
            let weakness_is = tl.getInput('WeaknessIs', false);
            let condition = tl.getInput('Condition', false);
            let policy_name = tl.getInput('PolicyName', false);
            let sync_scan = tl.getInput('SyncScan', false);
            const endpoint = getCodeThreatEndpoint();
            let branch = tl.getVariable(`Build.SourceBranch`);
            const commitId = tl.getVariable(`Build.SourceVersion`);
            const repositoryName = tl.getVariable("Build.Repository.Name");
            const projectIID = tl.getVariable('System.TeamProjectId');
            console.log("Branch", branch);
            console.log("RepoName", repositoryName);
            let collectionUri = tl.getVariable('System.TeamFoundationCollectionUri');
            collectionUri.substring(0, collectionUri.length - 1);
            let parts = collectionUri.split('/');
            let accountName = parts[parts.length - 2];
            let repoId = tl.getVariable('Build.Repository.Id');
            let repoProvider = tl.getVariable('Build.Repository.Provider');
            let repoVisibility;
            if (endpoint.parameters.AzureBaseUrl === undefined || !endpoint.parameters.AzureBaseUrl) {
                endpoint.parameters.AzureBaseUrl = "https://dev.azure.com";
            }
            if (condition === undefined) {
                condition = "AND";
            }
            if (policy_name === undefined) {
                policy_name = "Advanced Security";
            }
            if (repoProvider === "TfsGit" || repoProvider === "TfsVersionControl") {
                try {
                    const dataRepoInfo = yield getRepoVisibility(endpoint, repoProvider, accountName);
                    repoVisibility = ((_c = (_b = (_a = dataRepoInfo === null || dataRepoInfo === void 0 ? void 0 : dataRepoInfo.value) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.project) === null || _c === void 0 ? void 0 : _c.visibility) || null;
                }
                catch (error) {
                    tl.setResult(tl.TaskResult.Failed, "Failed to get repo's visibilty value, check your azure token");
                    throw new Error("Failed to get repo's visibilty value, check your azure token");
                }
            }
            console.log('--------------------- Log Details ---------------------');
            console.group('Azure Details');
            console.log('Account Name      :', accountName);
            console.log('Project Name      :', projectName);
            console.log('Repository Provider:', repoProvider);
            console.log('Repository ID     :', repoId);
            console.groupEnd();
            console.log('');
            console.group('CodeThreat Details');
            console.log('Connection to Server URL:', endpoint.serverUrl);
            console.groupEnd();
            console.log('------------------------------------------------------');
            let sourceDirectory = task.getVariable("Build.SourcesDirectory");
            const tempDir = task.getVariable("Agent.TempDirectory");
            let tfvcRepoIdName;
            if (repoProvider === "TfsVersionControl") {
                tfvcRepoIdName = `${branch.substring(2)}:${projectIID}:null`;
            }
            console.log("[CT] Preparing scan files...");
            let zipPath = tempDir + '/' + projectName + '.zip';
            yield (0, zip_a_folder_1.zip)(sourceDirectory !== null && sourceDirectory !== void 0 ? sourceDirectory : '', zipPath);
            const IssuesResult = (repoName, token, ctServer, allOrNew) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let query = {
                        projectName: projectName
                    };
                    if (allOrNew === "new") {
                        query.historical = ["New Issue"];
                    }
                    const encodedQ = buffer_1.Buffer.from(JSON.stringify(query)).toString('base64');
                    let newIssueResult = yield getStatus(ctServer, `/api/scanlog/issues?q=${encodedQ}&pageSize=500`, token, orgname, false);
                    const xCtPager = JSON.parse(buffer_1.Buffer.from(newIssueResult.headers["x-ct-pager"], 'base64').toString());
                    let allData = [];
                    let promises = [];
                    for (let i = 1; i <= xCtPager.pages; i++) {
                        promises.push(getStatus(ctServer, `/api/scanlog/issues?q=${encodedQ}&pid=${xCtPager.id}&page=${i}`, token, orgname, true));
                    }
                    let responses = yield Promise.all(promises);
                    responses.forEach(response => {
                        response.body.forEach(issue => {
                            allData.push(issue);
                        });
                    });
                    return allData;
                }
                catch (error) {
                    console.log("IssuesResult --- " + error);
                }
            });
            const encode = (str) => buffer_1.Buffer.from(str, 'binary').toString('base64');
            let token;
            if (endpoint.parameters.username && endpoint.parameters.password) {
                const authHeader = 'Basic ' + encode(endpoint.parameters.username + ':' + endpoint.parameters.password);
                let response = yield auth_post(endpoint, "api/signin", authHeader, true);
                let authResponse = JSON.parse(response);
                token = authResponse.access_token;
            }
            else {
                token = endpoint.parameters.token;
            }
            const projectCheck = yield check(endpoint.serverUrl, projectName, token, orgname);
            let paramBody = {
                repoId: tfvcRepoIdName ? tfvcRepoIdName : `${repositoryName}:${repoId}:${projectIID}`,
                account: accountName,
                project: projectName,
                branch: branch,
                type: repoProvider,
                visibility: repoVisibility,
                baseURL: endpoint.parameters.AzureBaseUrl,
                azureToken: endpoint.parameters.azuretoken,
                action: true,
            };
            if (projectCheck.type === null) {
                yield post(endpoint, "/api/integration/azure/set", token, orgname, true, paramBody);
            }
            let formData = {
                'upfile': {
                    'value': fs.createReadStream(zipPath),
                    'options': {
                        'filename': zipPath,
                        'contentType': 'multipart/form-data'
                    }
                },
                'project': projectName,
                'from': 'azure',
                'branch': branch,
                'baseURL': endpoint.parameters.AzureBaseUrl,
                "azuretoken": endpoint.parameters.azuretoken,
            };
            tl.debug(`formdata: ${formData}`);
            let uploadRes = yield multipart_post(endpoint, "api/plugins/azure", token, orgname, true, formData);
            const scanStartResult = JSON.parse(uploadRes);
            let cancellation;
            const delay = (ms) => new Promise(res => setTimeout(res, ms));
            const awaitScan = (sid) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let scanResult = yield scan_analyze(endpoint, `api/scan/status/${sid}`, token, orgname);
                    const scanStatusResult = JSON.parse(scanResult);
                    if (scanStatusResult.state === "failure") {
                        tl.setResult(tl.TaskResult.Failed, "CodeThreat SCAN FAILED.");
                        throw new Error("CodeThreat Scan failed, Check the connection settings");
                    }
                    if (sync_scan === 'false') {
                        console.log("Scan started successfuly.");
                        return;
                    }
                    let scanResultObject = {
                        critical: scanStatusResult.severities.critical || 0,
                        high: scanStatusResult.severities.high || 0,
                        medium: scanStatusResult.severities.medium || 0,
                        low: scanStatusResult.severities.low || 0,
                    };
                    console.log(`Scanning... %${scanStatusResult.progress_data.progress} | Critical: ${scanResultObject.critical} | High: ${scanResultObject.high} | Medium: ${scanResultObject.medium} | Low: ${scanResultObject.low}`);
                    const newIssues = yield IssuesResult(repositoryName, token, endpoint, "new");
                    let weaknessIsCount = [];
                    if (weakness_is !== undefined) {
                        const weaknessIsKeywords = weakness_is === null || weakness_is === void 0 ? void 0 : weakness_is.split(",");
                        weaknessIsCount = (0, utils_1.findWeaknessTitles)(newIssues, weaknessIsKeywords);
                    }
                    if (condition === "OR") {
                        if (maxCritical &&
                            maxCritical < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.critical)) {
                            tl.setResult(tl.TaskResult.Failed, "!! FAILED : Critical limit exceeded. ");
                            cancellation = true;
                        }
                        else if (maxHigh &&
                            maxHigh < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.high)) {
                            tl.setResult(tl.TaskResult.Failed, "!! FAILED : High limit exceeded. ");
                            cancellation = true;
                        }
                        else if (weaknessIsCount.length > 0) {
                            tl.setResult(tl.TaskResult.Failed, "!! FAILED : Weaknesses entered in the weakness_is key were found during the scan.");
                            cancellation = true;
                        }
                    }
                    else if (condition === "AND") {
                        if ((maxCritical &&
                            maxCritical < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.critical)) ||
                            (maxHigh &&
                                maxHigh < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.high)) ||
                            weaknessIsCount.length > 0) {
                            tl.setResult(tl.TaskResult.Failed, "!! FAILED: A Not all conditions are met according to the given arguments.");
                            cancellation = true;
                        }
                    }
                    if (scanStatusResult.state === "end" || cancellation) {
                        yield resultScan(scanStatusResult, scanResultObject, sid, projectName, orgname);
                    }
                    else {
                        yield delay(5000);
                        yield awaitScan(sid);
                    }
                }
                catch (error) {
                    console.error(`An error occurred: ${error.message}`);
                    tl.setResult(tl.TaskResult.Failed, `An error occurred during scanning: ${error.message}`);
                }
            });
            const resultScan = (scanStatusResult, scanResultObject, sid, projectName, organization_name) => __awaiter(this, void 0, void 0, function* () {
                const scanData = yield helper(endpoint.serverUrl, projectName, token, orgname, sid);
                const newIssues = yield IssuesResult(repositoryName, token, endpoint, "new");
                let weaknessIsCount = [];
                if (weakness_is !== undefined) {
                    const weaknessIsKeywords = weakness_is === null || weakness_is === void 0 ? void 0 : weakness_is.split(",");
                    weaknessIsCount = (0, utils_1.findWeaknessTitles)(newIssues, weaknessIsKeywords);
                }
                if (condition === "OR") {
                    if (maxCritical &&
                        maxCritical < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.critical)) {
                        tl.setResult(tl.TaskResult.Failed, "!! FAILED : Critical limit exceeded. ");
                        cancellation = true;
                    }
                    else if (maxHigh &&
                        maxHigh < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.high)) {
                        tl.setResult(tl.TaskResult.Failed, "!! FAILED : High limit exceeded. ");
                        cancellation = true;
                    }
                    else if (weaknessIsCount.length > 0) {
                        tl.setResult(tl.TaskResult.Failed, "!! FAILED : Weaknesses entered in the weakness_is key were found during the scan.");
                        cancellation = true;
                    }
                    else if (scaMaxCritical &&
                        scaMaxCritical < (scanData === null || scanData === void 0 ? void 0 : scanData.scaSeverityCounts.Critical)) {
                        tl.setResult(tl.TaskResult.Failed, "!! FAILED : Sca Critical limit exceeded. ");
                        cancellation = true;
                    }
                    else if (scaMaxHigh &&
                        scaMaxHigh < (scanData === null || scanData === void 0 ? void 0 : scanData.scaSeverityCounts.High)) {
                        tl.setResult(tl.TaskResult.Failed, "!! FAILED : Sca High limit exceeded. ");
                        cancellation = true;
                    }
                }
                else if (condition === "AND") {
                    if ((maxCritical &&
                        maxCritical < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.critical)) ||
                        (maxHigh &&
                            maxHigh < (scanResultObject === null || scanResultObject === void 0 ? void 0 : scanResultObject.high)) ||
                        (scaMaxCritical &&
                            scaMaxCritical < (scanData === null || scanData === void 0 ? void 0 : scanData.scaSeverityCounts.Critical)) ||
                        (scaMaxHigh &&
                            scaMaxHigh < (scanData === null || scanData === void 0 ? void 0 : scanData.scaSeverityCounts.High)) ||
                        weaknessIsCount.length > 0) {
                        tl.setResult(tl.TaskResult.Failed, "!! FAILED: A Not all conditions are met according to the given arguments.");
                        cancellation = true;
                    }
                }
                console.log("\nScan completed successfully ...\n");
                const allIssues = yield IssuesResult(projectName, token, endpoint, "all");
                let durationTime = (0, utils_1.convertToHHMMSS)(scanStatusResult.ended_at, scanStatusResult.started_at);
                const riskscore = (0, utils_1.getScore)(scanStatusResult.riskscore);
                const newIssuesData = (0, utils_1.countAndGroupByTitle)(newIssues);
                const newIssuesSeverity = (0, utils_1.countBySeverity)(newIssuesData);
                const allIssuesData = (0, utils_1.countAndGroupByTitle)(allIssues);
                const allIssuesSeverity = (0, utils_1.countBySeverity)(allIssuesData);
                let totalCountNewIssues = 0;
                for (const obj of newIssuesData) {
                    totalCountNewIssues += obj.count;
                }
                // Calculate the total number of issues
                const total = Object.values(scanStatusResult.severities).reduce((a, b) => a + b, 0);
                // Function to print the table row
                const printTableRow = (label, totalVal, newVal) => {
                    console.log(`| ${label.padEnd(8)} |${(0, utils_1.cL)(totalVal, newVal)}|`);
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
                console.log(`\nSee All Results: ${endpoint.serverUrl}issues?scan_id=${sid}&projectName=${projectName}&tenant=${orgname}`);
                console.log("\n** -------WEAKNESSES-------- **\n");
                allIssuesData.map((r) => {
                    console.log(`${r.title} - (${r.severity.charAt(0).toUpperCase() + r.severity.slice(1)}) - ${r.count}`);
                });
                if (!cancellation) {
                    console.log("\n** -------DURATION TIME-------- **");
                    console.log(`Duration Time: ${durationTime}`);
                    console.log("\n** -------RISK SCORE-------- **");
                    console.log(`Risk Score: ${riskscore.score}`);
                }
                const resultsData = {
                    sid: sid,
                    totalCountNewIssues: totalCountNewIssues,
                    newIssuesSeverity: newIssuesSeverity,
                    scanStatus: scanStatusResult,
                    newIssues: newIssuesData,
                    allIssues: allIssuesData,
                    duration: durationTime,
                    riskScore: riskscore,
                    BaseURL: endpoint.serverUrl,
                    org: orgname,
                    scaDeps: scanData.report.scaDeps
                };
                try {
                    // Save data to a JSON file
                    const outputPath = 'codethreat-scan-results.json';
                    fs.writeFileSync(outputPath, JSON.stringify(resultsData));
                    // Publish the artifact
                    const artifactName = 'codethreat-scan-results';
                    const artifactType = 'container';
                    const artifactPath = tl.resolve(tl.getVariable('System.DefaultWorkingDirectory'), outputPath);
                    tl.command('artifact.upload', { artifactname: artifactName, artifacttype: artifactType }, artifactPath);
                    tl.addAttachment("jsonAttachment", "CTResult", artifactPath);
                }
                catch (error) {
                    console.error("Failed to publish artifact:", error);
                    tl.setResult(tl.TaskResult.Failed, error.message);
                }
            });
            yield awaitScan(scanStartResult.scan_id);
        }
        catch (err) {
            console.log("step failed : " + err);
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    });
}
run();
