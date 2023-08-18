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
            tl.debug(`Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`);
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
    tl.debug(`[CT] API GET: '${path}' with query "${JSON.stringify(query)}"`);
    tl.debug(`[CT] API GET: '${path}' with query "${body}"`);
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
                'Content-Type': 'multipart/form-data'
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
        console.log("Project : ", project);
        const patToken = endpoint.parameters.azuretoken;
        let apiUrl = `${endpoint.parameters.AzureBaseUrl}/${accountName}/${project}/_apis/git/repositories?api-version=7.1-preview.1`;
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
function repoIdMatch(endpoint, repoPath, accountName) {
    return new Promise((resolve, reject) => {
        const patToken = endpoint.parameters.azuretoken;
        let apiUrl = `${endpoint.parameters.AzureBaseUrl}/${accountName}/_apis/projects?api-version=6.0`;
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
            const matchedPName = repoPath.match(/\$\/(\w+)/)[1];
            let pid;
            for (const item of data.value) {
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
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const orgname = tl.getInput('organization', true);
            const projectName = tl.getInput('projectName', true);
            const maxCritical = tl.getInput('MaxCritical', false);
            const maxHigh = tl.getInput('MaxHigh', false);
            let weakness_is = tl.getInput('WeaknessIs', false);
            let condition = tl.getInput('Condition', false);
            const endpoint = getCodeThreatEndpoint();
            let branch = tl.getVariable(`Build.SourceBranch`);
            const commitId = tl.getVariable(`Build.SourceVersion`);
            const repositoryName = tl.getVariable("Build.Repository.Name");
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
                weakness_is = "AND";
            }
            let projectID;
            let repoPath;
            if (repoProvider === "TfsGit" || repoProvider === "TfsVersionControl") {
                try {
                    const dataRepoInfo = yield getRepoVisibility(endpoint, repoProvider, accountName);
                    repoVisibility = ((_c = (_b = (_a = dataRepoInfo === null || dataRepoInfo === void 0 ? void 0 : dataRepoInfo.value) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.project) === null || _c === void 0 ? void 0 : _c.visibility) || null;
                    projectID = (_f = (_e = (_d = dataRepoInfo === null || dataRepoInfo === void 0 ? void 0 : dataRepoInfo.value) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.project) === null || _f === void 0 ? void 0 : _f.id;
                    repoPath = dataRepoInfo.path;
                }
                catch (error) {
                    console.error("Error fetching repository data:", error);
                }
            }
            let idmid;
            if (repoPath) {
                idmid = yield repoIdMatch(endpoint, repoPath, accountName);
            }
            console.log("Azure Account Name :", accountName);
            console.log("Repository Provider :", repoProvider);
            console.log("Repository ID :", repoId);
            console.log('CodeThreat Connection to server_url: ', endpoint.serverUrl);
            let sourceDirectory = task.getVariable("Build.SourcesDirectory");
            const tempDir = task.getVariable("Agent.TempDirectory");
            let tfvcRepoIdName;
            if (repoProvider === "TfsVersionControl") {
                tfvcRepoIdName = `${branch.substring(2)}:${idmid}:null`;
            }
            console.log("[CT] Preparing scan files...");
            let zipPath = tempDir + '/' + projectName + '.zip';
            yield (0, zip_a_folder_1.zip)(sourceDirectory !== null && sourceDirectory !== void 0 ? sourceDirectory : '', zipPath);
            let tfvcRepoIdNameR;
            let repoGits;
            const IssuesResult = (repoName, token, ctServer, allOrNew) => __awaiter(this, void 0, void 0, function* () {
                try {
                    tfvcRepoIdNameR = branch.substring(2).replace(/\//g, "-");
                    repoGits = repoName.replace(/\//g, "-");
                    let query = {
                        projectName: tfvcRepoIdName ? tfvcRepoIdNameR : repoGits
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
            let paramBody = {
                repoId: tfvcRepoIdName ? tfvcRepoIdName : `${repositoryName}:${repoId}:${projectID}`,
                account: accountName,
                project: projectName,
                branch: branch,
                type: repoProvider,
                visibility: repoVisibility,
                baseURL: endpoint.parameters.AzureBaseUrl,
                azureToken: endpoint.parameters.azuretoken,
                action: true,
            };
            yield post(endpoint, "/api/integration/azure/set", token, orgname, true, paramBody);
            let formData = {
                'upfile': {
                    'value': fs.createReadStream(zipPath),
                    'options': {
                        'filename': zipPath,
                        'contentType': 'multipart/form-data'
                    }
                },
                'project': tfvcRepoIdName ? `${branch.substring(2)}` : `${repositoryName}`,
                'from': 'azure',
                'branch': branch,
                'commitId': idmid ? idmid : commitId,
                'baseURL': endpoint.parameters.AzureBaseUrl
            };
            tl.debug(`formdata: ${formData}`);
            let uploadRes = yield multipart_post(endpoint, "api/plugins/azure", token, orgname, true, formData);
            const scanStartResult = JSON.parse(uploadRes);
            let cancellation;
            const awaitScan = (sid) => __awaiter(this, void 0, void 0, function* () {
                let scanResult = yield scan_analyze(endpoint, `api/scan/status/${sid}`, token, orgname);
                const scanStatusResult = JSON.parse(scanResult);
                if (scanStatusResult.state === "failure") {
                    tl.setResult(tl.TaskResult.Failed, "SCAN FAILED.");
                }
                let scanResultObject = {
                    critical: scanStatusResult.severities.critical || 0,
                    high: scanStatusResult.severities.high || 0,
                    medium: scanStatusResult.severities.medium || 0,
                    low: scanStatusResult.severities.low || 0,
                };
                console.log(`\nScanning... ` + `%` + scanStatusResult.progress_data.progress);
                console.log("\n" +
                    "Critical : " +
                    scanResultObject.critical +
                    " High : " +
                    scanResultObject.high +
                    " Medium : " +
                    scanResultObject.medium +
                    " Low : " +
                    scanResultObject.low +
                    "\n");
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
                    yield resultScan(scanStatusResult, scanResultObject, sid, projectName);
                }
                else {
                    setTimeout(function () {
                        awaitScan(sid);
                    }, 5000);
                }
            });
            const resultScan = (scanStatusResult, scanResultObject, sid, projectName) => __awaiter(this, void 0, void 0, function* () {
                let reason;
                if (!cancellation) {
                    reason = `"\nScan completed successfly ...\n"`;
                }
                else {
                    reason =
                        "Pipeline interrupted because the FAILED_ARGS arguments you entered were found... ";
                }
                console.log(reason);
                const newIssues = yield IssuesResult(projectName, token, endpoint, "new");
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
                const total = Object.values(scanStatusResult.severities).reduce((a, b) => a + b, 0);
                console.log('+----------+-------------+-----------+');
                console.log('| Weakness | Total Issue | New Issue |');
                console.log('+----------+-------------+-----------+');
                console.log(`| Critical |${(0, utils_1.cL)(scanResultObject.critical, newIssuesSeverity.critical)}`);
                console.log(`| High     |${(0, utils_1.cL)(scanResultObject.high, newIssuesSeverity.high)}`);
                console.log(`| Medium   |${(0, utils_1.cL)(scanResultObject.medium, newIssuesSeverity.medium)}`);
                console.log(`| Low      |${(0, utils_1.cL)(scanResultObject.low, newIssuesSeverity.low)}`);
                console.log(`| TOTAL    |${(0, utils_1.cL)(total, totalCountNewIssues)}`);
                console.log('+----------+-------------+-----------+');
                if (tfvcRepoIdName) {
                    console.log(`\nSee All Results : ${endpoint.serverUrl}issues?scan_id=${sid}&projectName=${tfvcRepoIdNameR}`);
                }
                else {
                    console.log(`\nSee All Results : ${endpoint.serverUrl}issues?scan_id=${sid}&projectName=${repoGits}`);
                }
                console.log("\n** -------WEAKNESSES-------- **\n");
                allIssuesData.map((r) => {
                    console.log(`${r.title} - (${r.severity.charAt(0).toUpperCase() + r.severity.slice(1)}) - ${r.count}`);
                });
                if (!cancellation) {
                    console.log("\n** -------DURATION TIME-------- **");
                    console.log("\n" +
                        "Duration Time : " +
                        durationTime +
                        "\n");
                    console.log("** -------RISK SCORE-------- **");
                    console.log("\n" +
                        "Risk Score : " +
                        riskscore.score +
                        "\n");
                }
            });
            yield awaitScan(scanStartResult.scan_id);
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    });
}
run();
