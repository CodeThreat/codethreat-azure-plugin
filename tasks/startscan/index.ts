
import tl = require('azure-pipelines-task-lib');
import { zip } from 'zip-a-folder';
import * as fs from 'fs';
import FormData = require('form-data');
import {
  findWeaknessTitles,
  login,
  check,
  create,
  start,
  getScanStatus,
  result,
} from './utils.js';


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

const orgname: string | undefined = tl.getInput("organization", true);
const projectName: string | undefined = tl.getInput("projectName", true);
const maxCritical: any = tl.getInput("MaxCritical", false);
const maxHigh: any = tl.getInput("MaxHigh", false);
const scaMaxCritical: any = tl.getInput("ScaMaxCritical", false);
const scaMaxHigh: any = tl.getInput("ScaMaxHigh", false);
let weakness_is: string = tl.getInput("WeaknessIs", false);
let condition: string | undefined = tl.getInput("Condition", false);
let policy_name: string | undefined = tl.getInput("PolicyName", false);
let sync_scan: any = tl.getInput("SyncScan", false);

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

let repoVisibility: any;

if (
  endpoint.parameters.AzureBaseUrl === undefined ||
  !endpoint.parameters.AzureBaseUrl
) {
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
let rNameRidPid: string;
let checkProjectName: string;

let repositoryName = baseRepositoryName.replace(/\//g, "_");

if (isTFVC) {
  rNameRidPid = `${branch.substring(
    branch.lastIndexOf("/") + 1
  )}:${projectIID}:null`;
  checkProjectName = `${projectName}_${branch.substring(
    branch.lastIndexOf("/") + 1
  )}`;
} else {
  rNameRidPid = `${repositoryName}:${repoId}:${projectIID}`;
  checkProjectName = `${projectName}_${repositoryName}`;
}
let scanProcess: any, token: string, checked: any;
endpoint.serverUrl = endpoint.serverUrl.trim().replace(/\/+$/, "");

let zipPath = tempDir + "/" + projectName + ".zip";

console.log("[CodeThreat]: Preparing Scan Files...");

const loginIn = async () => {
  if (
    endpoint.parameters.token &&
    (!endpoint.parameters.username || !endpoint.parameters.password)
  ) {
    token = endpoint.parameters.token;
  } else if (endpoint.parameters.username && endpoint.parameters.password) {
    const response = await login(
      endpoint.serverUrl,
      endpoint.parameters.username,
      endpoint.parameters.password
    );
    token = response.access_token;
  } else {
    tl.debug("Please enter username and password or token.");
  }
};

const checkProject = async () => {
  return await check(endpoint.serverUrl, checkProjectName, token, orgname);
};

const createProject = async () => {
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

  await create(endpoint.serverUrl, token, orgname, paramBody);
};

const startScan = async () => {
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

  return await start(endpoint.serverUrl, token, orgname, formData);
};

const scanStatus = async (sid: string) => {
  try {
    scanProcess = await getScanStatus(endpoint.serverUrl, token, orgname, sid);
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
      let weaknessIsCount: any;
      if (weakness_is && weaknessArray.length > 0) {
        const keywords = weakness_is.split(",");
        weaknessIsCount = findWeaknessTitles(weaknessArray, keywords);
      } else {
        weaknessIsCount = [];
      }

      if (condition === "OR") {
        if (maxCritical && maxCritical < scanProcess.severities.critical) {
          tl.setResult(
            tl.TaskResult.Failed,
            "!! FAILED : Critical limit exceeded. "
          );
          throw new Error(
            "Pipeline interrupted because the FAILED_ARGS arguments you entered were found..."
          );
        } else if (maxHigh && maxHigh < scanProcess.severities.high) {
          tl.setResult(
            tl.TaskResult.Failed,
            "!! FAILED_ARGS : High limit exceeded. "
          );
          throw new Error(
            "Pipeline interrupted because the FAILED_ARGS arguments you entered were found..."
          );
        } else if (weaknessIsCount.length > 0) {
          tl.setResult(
            tl.TaskResult.Failed,
            "!! FAILED_ARGS : Weaknesses entered in the weakness_is key were found during the scan."
          );
          throw new Error(
            "Pipeline interrupted because the FAILED_ARGS arguments you entered were found..."
          );
        }
      } else if (condition === "AND") {
        if (
          (maxCritical && maxCritical < scanProcess.severities.critical) ||
          (maxHigh && maxHigh < scanProcess.severities.high) ||
          weaknessIsCount.length > 0
        ) {
          tl.setResult(
            tl.TaskResult.Failed,
            "!! FAILED ARGS : Not all conditions are met according to the given arguments."
          );
          throw new Error(
            "Pipeline interrupted because the FAILED_ARGS arguments you entered were found..."
          );
        }
      }
    }
    if (scanProcess.state === "end") {
      await resultScan(sid, scanProcess.weaknessesArr);
    } else {
      setTimeout(function () {
        scanStatus(sid);
      }, 30000);
    }
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    tl.setResult(
      tl.TaskResult.Failed,
      `An error occurred during scanning: ${error.message}`
    );
  }
};

const resultScan = async (sid: string, weaknessesArr: any) => {
  const resultAndReport: any = await result(
    endpoint.serverUrl,
    token,
    orgname,
    sid,
    branch,
    checkProjectName
  );
  const weaknessArray = [...new Set(weaknessesArr)];
  let weaknessIsCount: any;
  if (weakness_is && weaknessArray.length > 0) {
    const keywords = weakness_is.split(",");
    weaknessIsCount = findWeaknessTitles(weaknessArray, keywords);
  } else {
    weaknessIsCount = [];
  }
  if (condition === "OR") {
    if (maxCritical && maxCritical < scanProcess.severities.critical) {
      tl.setResult(
        tl.TaskResult.Failed,
        "!! FAILED_ARGS : Critical limit exceeded."
      );
      throw new Error(
        "Pipeline interrupted because the FAILED_ARGS arguments you entered were found..."
      );
    } else if (maxHigh && maxHigh < scanProcess.severities.high) {
      tl.setResult(
        tl.TaskResult.Failed,
        "!! FAILED_ARGS : High limit exceeded."
      );
      throw new Error(
        "Pipeline interrupted because the FAILED_ARGS arguments you entered were found..."
      );
    } else if (weaknessIsCount.length > 0) {
      tl.setResult(
        tl.TaskResult.Failed,
        "!! FAILED_ARGS : Weaknesses entered in the weakness_is key were found during the scan."
      );
      throw new Error(
        "Pipeline interrupted because the FAILED_ARGS arguments you entered were found..."
      );
    } else if (
      scaMaxCritical &&
      scaMaxCritical < resultAndReport.scaSeverityCounts.Critical
    ) {
      tl.setResult(
        tl.TaskResult.Failed,
        "!! FAILED_ARGS : Sca Critical limit exceeded."
      );
      throw new Error(
        "Pipeline interrupted because the FAILED_ARGS arguments you entered were found..."
      );
    } else if (
      scaMaxHigh &&
      scaMaxHigh < resultAndReport.scaSeverityCounts.High
    ) {
      tl.setResult(
        tl.TaskResult.Failed,
        "!! FAILED_ARGS : Sca High limit exceeded. "
      );
      throw new Error(
        "Pipeline interrupted because the FAILED_ARGS arguments you entered were found..."
      );
    }
  } else if (condition === "AND") {
    if (
      (maxCritical && maxCritical < scanProcess.severities.critical) ||
      (maxHigh && maxHigh < scanProcess.severities.high) ||
      (scaMaxCritical &&
        scaMaxCritical < resultAndReport.scaSeverityCounts.Critical) ||
      (scaMaxHigh && scaMaxHigh < resultAndReport.scaSeverityCounts.High) ||
      weaknessIsCount.length > 0
    ) {
      tl.setResult(
        tl.TaskResult.Failed,
        "!! FAILED ARGS : Not all conditions are met according to the given arguments."
      );
      throw new Error(
        "Pipeline interrupted because the FAILED_ARGS arguments you entered were found..."
      );
    }
  }
  console.log("\nScan completed successfully ...\n");

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
    const artifactPath = tl.resolve(
      tl.getVariable("System.DefaultWorkingDirectory"),
      outputPath
    );
    tl.command(
      "artifact.upload",
      { artifactname: artifactName, artifacttype: artifactType },
      artifactPath
    );
    tl.addAttachment("jsonAttachment", "CTResult", artifactPath);
  } catch (error) {
    console.error("Failed to publish artifact:", error);
    tl.setResult(tl.TaskResult.Failed, error.message);
  }
};

const run = async () => {
  try {
    await zip(sourceDirectory ?? "", zipPath);

    await loginIn();
    checked = await checkProject();
    if (checked.type === null) await createProject();
    const start: any = await startScan();
    await scanStatus(start.scan_id);
  } catch (error) {
    console.error(`Unhandled error: ${error.message}`);
    tl.setResult(tl.TaskResult.Failed, `Unhandled error: ${error.message}`);
  }
};

run();
