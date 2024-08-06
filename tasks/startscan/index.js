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
const tl = require("azure-pipelines-task-lib");
const zip_a_folder_1 = require("zip-a-folder");
const fs = __importStar(require("fs"));
const FormData = require("form-data");
const utils_js_1 = require("./utils.js");
const getCodeThreatEndpoint = () => {
    const clusterConnection = tl.getInput("codethreatService");
    const auth = tl.getEndpointAuthorization(clusterConnection, false);
    const serverUrl = tl.getEndpointUrl(clusterConnection, false);
    return {
        serverUrl,
        parameters: auth.parameters,
        scheme: auth.scheme,
    };
};
const orgname = tl.getInput("organization", true);
const projectName = tl.getInput("projectName", true);
const maxCritical = tl.getInput("MaxCritical", false);
const maxHigh = tl.getInput("MaxHigh", false);
const scaMaxCritical = tl.getInput("ScaMaxCritical", false);
const scaMaxHigh = tl.getInput("ScaMaxHigh", false);
let weakness_is = tl.getInput("WeaknessIs", false);
let condition = tl.getInput("Condition", false);
let policy_name = tl.getInput("PolicyName", false);
let sync_scan = tl.getInput("SyncScan", false);
const endpoint = getCodeThreatEndpoint();
let branch = tl.getVariable(`Build.SourceBranch`);
const commitId = tl.getVariable(`Build.SourceVersion`);
const baseRepositoryName = tl.getVariable("Build.Repository.Name");
const projectIID = tl.getVariable("System.TeamProjectId");
console.log("Branch", branch);
console.log("RepoName", baseRepositoryName);
let collectionUri = tl.getVariable("System.TeamFoundationCollectionUri");
collectionUri.substring(0, collectionUri.length - 1);
let parts = collectionUri.split("/");
let accountName = parts[parts.length - 2];
let repoId = tl.getVariable("Build.Repository.Id");
let repoProvider = tl.getVariable("Build.Repository.Provider");
let repoVisibility;
if (endpoint.parameters.AzureBaseUrl === undefined ||
    !endpoint.parameters.AzureBaseUrl) {
    endpoint.parameters.AzureBaseUrl = "https://dev.azure.com";
}
if (condition === undefined) {
    condition = "AND";
}
if (policy_name === undefined) {
    policy_name = "Advanced Security";
}
console.log("--------------------- Log Details ---------------------");
console.group("Azure Details");
console.log("Account Name      :", accountName);
console.log("Project Name      :", projectName);
console.log("Repository Provider:", repoProvider);
console.log("Repository ID     :", repoId);
console.groupEnd();
console.log("");
console.group("CodeThreat Details");
console.log("Connection to Server URL:", endpoint.serverUrl);
console.groupEnd();
console.log("------------------------------------------------------");
let sourceDirectory = tl.getVariable("Build.SourcesDirectory");
const tempDir = tl.getVariable("Agent.TempDirectory");
const isTFVC = repoProvider === "TfsVersionControl";
let rNameRidPid;
let checkProjectName;
let repositoryName = baseRepositoryName.replace(/\//g, "_");
if (isTFVC) {
    rNameRidPid = `${branch.substring(branch.lastIndexOf("/") + 1)}:${projectIID}:null`;
    checkProjectName = `${projectName}_${branch.substring(branch.lastIndexOf("/") + 1)}`;
}
else {
    rNameRidPid = `${repositoryName}:${repoId}:${projectIID}`;
    checkProjectName = `${projectName}_${repositoryName}`;
}
let scanProcess, token, checked;
endpoint.serverUrl = endpoint.serverUrl.trim().replace(/\/+$/, "");
let zipPath = tempDir + "/" + projectName + ".zip";
console.log("[CodeThreat]: Preparing Scan Files...");
const loginIn = () => __awaiter(void 0, void 0, void 0, function* () {
    if (endpoint.parameters.token &&
        (!endpoint.parameters.username || !endpoint.parameters.password)) {
        token = endpoint.parameters.token;
    }
    else if (endpoint.parameters.username && endpoint.parameters.password) {
        let response;
        try {
            response = yield (0, utils_js_1.login)(endpoint.serverUrl, endpoint.parameters.username, endpoint.parameters.password);
        }
        catch (error) {
            console.error(`An error occurred login: ${error.message}`);
            throw error;
        }
        token = response.access_token;
    }
    else {
        tl.setResult(tl.TaskResult.Failed, "Please enter username and password or token.");
    }
});
const checkProject = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield (0, utils_js_1.check)(endpoint.serverUrl, checkProjectName, token, orgname);
    }
    catch (error) {
        console.error(`An error occurred check project: ${error.message}`);
        throw error;
    }
});
const createProject = () => __awaiter(void 0, void 0, void 0, function* () {
    const paramBody = {
        repoId: rNameRidPid,
        account: accountName,
        project: projectName,
        branch: branch,
        type: repoProvider,
        visibility: repoVisibility,
        baseURL: endpoint.parameters.AzureBaseUrl,
        azureToken: endpoint.parameters.azuretoken,
        action: true,
    };
    try {
        yield (0, utils_js_1.create)(endpoint.serverUrl, token, orgname, paramBody);
    }
    catch (error) {
        console.error(`An error occurred create project: ${error.message}`);
        throw error;
    }
});
const startScan = () => __awaiter(void 0, void 0, void 0, function* () {
    const formData = new FormData();
    formData.append("upfile", fs.createReadStream(zipPath), {
        filename: zipPath,
        contentType: "multipart/form-data",
    });
    formData.append("project", checkProjectName);
    formData.append("from", "azure");
    formData.append("branch", branch);
    formData.append("baseURL", endpoint.parameters.AzureBaseUrl);
    formData.append("azuretoken", endpoint.parameters.azuretoken);
    try {
        return yield (0, utils_js_1.start)(endpoint.serverUrl, token, orgname, formData);
    }
    catch (error) {
        console.error(`An error occurred login: ${error.message}`);
        throw error;
    }
});
const scanStatus = (sid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        scanProcess = yield (0, utils_js_1.getScanStatus)(endpoint.serverUrl, token, orgname, sid);
        if (scanProcess.state === "failure") {
            tl.setResult(tl.TaskResult.Failed, "CodeThreat SCAN FAILED.");
            throw new Error("CodeThreat Scan failed, Check the connection settings");
        }
        if (sync_scan === "false") {
            console.log("Scan started successfuly.");
            return;
        }
        if (scanProcess.state !== "end") {
            console.log(`[CodeThreat]: Scan Status | Scanning... `);
            const weaknessArray = [...new Set(scanProcess.weaknessesArr)];
            let weaknessIsCount;
            if (weakness_is && weakness_is !== undefined && weaknessArray.length > 0) {
                const keywords = weakness_is.split(",");
                weaknessIsCount = (0, utils_js_1.findWeaknessTitles)(weaknessArray, keywords);
            }
            else {
                weaknessIsCount = [];
            }
            if (condition === "OR") {
                if (maxCritical && maxCritical < scanProcess.severities.critical) {
                    tl.setResult(tl.TaskResult.Failed, "!! FAILED : Critical limit exceeded. ");
                    throw new Error("Pipeline interrupted because the FAILED_ARGS arguments you entered were found...");
                }
                else if (maxHigh && maxHigh < scanProcess.severities.high) {
                    tl.setResult(tl.TaskResult.Failed, "!! FAILED_ARGS : High limit exceeded. ");
                    throw new Error("Pipeline interrupted because the FAILED_ARGS arguments you entered were found...");
                }
                else if (weaknessIsCount.length > 0) {
                    tl.setResult(tl.TaskResult.Failed, "!! FAILED_ARGS : Weaknesses entered in the weakness_is key were found during the scan.");
                    throw new Error("Pipeline interrupted because the FAILED_ARGS arguments you entered were found...");
                }
            }
            else if (condition === "AND") {
                if ((maxCritical && maxCritical < scanProcess.severities.critical) ||
                    (maxHigh && maxHigh < scanProcess.severities.high) ||
                    weaknessIsCount.length > 0) {
                    tl.setResult(tl.TaskResult.Failed, "!! FAILED ARGS : Not all conditions are met according to the given arguments.");
                    throw new Error("Pipeline interrupted because the FAILED_ARGS arguments you entered were found...");
                }
            }
        }
        if (scanProcess.state === "end") {
            yield resultScan(sid, scanProcess.weaknessesArr);
        }
        else {
            setTimeout(function () {
                scanStatus(sid);
            }, 30000);
        }
    }
    catch (error) {
        console.error(`An error occurred during scanning: ${error.message}`);
        throw error;
    }
});
const resultScan = (sid, weaknessesArr) => __awaiter(void 0, void 0, void 0, function* () {
    const resultAndReport = yield (0, utils_js_1.result)(endpoint.serverUrl, token, orgname, sid, branch, checkProjectName);
    if (resultAndReport.type === null) {
        console.log("[CodeThreat]: Scan completed successfully, but report not created.");
        return;
    }
    const weaknessArray = [...new Set(weaknessesArr)];
    let weaknessIsCount;
    if (weakness_is && weakness_is !== undefined && weaknessArray.length > 0) {
        const keywords = weakness_is.split(",");
        weaknessIsCount = (0, utils_js_1.findWeaknessTitles)(weaknessArray, keywords);
    }
    else {
        weaknessIsCount = [];
    }
    if (condition === "OR") {
        if (maxCritical && maxCritical < scanProcess.severities.critical) {
            tl.setResult(tl.TaskResult.Failed, "!! FAILED_ARGS : Critical limit exceeded.");
            throw new Error("Pipeline interrupted because the FAILED_ARGS arguments you entered were found...");
        }
        else if (maxHigh && maxHigh < scanProcess.severities.high) {
            tl.setResult(tl.TaskResult.Failed, "!! FAILED_ARGS : High limit exceeded.");
            throw new Error("Pipeline interrupted because the FAILED_ARGS arguments you entered were found...");
        }
        else if (weaknessIsCount.length > 0) {
            tl.setResult(tl.TaskResult.Failed, "!! FAILED_ARGS : Weaknesses entered in the weakness_is key were found during the scan.");
            throw new Error("Pipeline interrupted because the FAILED_ARGS arguments you entered were found...");
        }
        else if (scaMaxCritical &&
            scaMaxCritical < resultAndReport.scaSeverityCounts.Critical) {
            tl.setResult(tl.TaskResult.Failed, "!! FAILED_ARGS : Sca Critical limit exceeded.");
            throw new Error("Pipeline interrupted because the FAILED_ARGS arguments you entered were found...");
        }
        else if (scaMaxHigh &&
            scaMaxHigh < resultAndReport.scaSeverityCounts.High) {
            tl.setResult(tl.TaskResult.Failed, "!! FAILED_ARGS : Sca High limit exceeded. ");
            throw new Error("Pipeline interrupted because the FAILED_ARGS arguments you entered were found...");
        }
    }
    else if (condition === "AND") {
        if ((maxCritical && maxCritical < scanProcess.severities.critical) ||
            (maxHigh && maxHigh < scanProcess.severities.high) ||
            (scaMaxCritical &&
                scaMaxCritical < resultAndReport.scaSeverityCounts.Critical) ||
            (scaMaxHigh && scaMaxHigh < resultAndReport.scaSeverityCounts.High) ||
            weaknessIsCount.length > 0) {
            tl.setResult(tl.TaskResult.Failed, "!! FAILED ARGS : Not all conditions are met according to the given arguments.");
            throw new Error("Pipeline interrupted because the FAILED_ARGS arguments you entered were found...");
        }
    }
    console.log("[CodeThreat]: Scan completed successfully.");
    console.log("[CodeThreat]: Report creating...");
    const resultsData = {
        sid: sid,
        totalCountNewIssues: resultAndReport.report.totalNewIssues,
        newIssuesSeverity: resultAndReport.report.newIssues.severityCounts,
        scanStatus: scanProcess,
        newIssues: resultAndReport.report.newIssues.severities,
        allIssues: resultAndReport.report.allIssues.severities,
        duration: resultAndReport.report.durationTime,
        riskScore: resultAndReport.report.riskscore,
        BaseURL: endpoint.serverUrl,
        org: orgname,
        scaDeps: resultAndReport.report.scaDeps,
        projectName: checkProjectName,
    };
    try {
        // Save JSON
        const outputPath = "codethreat-scan-results.json";
        fs.writeFileSync(outputPath, JSON.stringify(resultsData));
        // Publish the artifact
        const artifactName = "codethreat-scan-results";
        const artifactType = "container";
        const artifactPath = tl.resolve(tl.getVariable("System.DefaultWorkingDirectory"), outputPath);
        tl.command("artifact.upload", { artifactname: artifactName, artifacttype: artifactType }, artifactPath);
        tl.addAttachment("jsonAttachment", "CTResult", artifactPath);
    }
    catch (error) {
        console.error("Failed to publish artifact:", error);
        tl.setResult(tl.TaskResult.Failed, error.message);
    }
});
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, zip_a_folder_1.zip)(sourceDirectory !== null && sourceDirectory !== void 0 ? sourceDirectory : "", zipPath);
        yield loginIn();
        checked = yield checkProject();
        if (checked.type === null)
            yield createProject();
        const start = yield startScan();
        yield scanStatus(start.scan_id);
    }
    catch (error) {
        console.error(`Unhandled error: ${error.message}`);
        throw error;
    }
});
run();
