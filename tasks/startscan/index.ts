import task = require('azure-pipelines-task-lib');
import tl = require('azure-pipelines-task-lib');
import * as request from "request";
import { zip } from 'zip-a-folder';
import * as fs from 'fs';
import * as path from 'path';
import { Buffer } from 'buffer';
import {
    countAndGroupByTitle,
    convertToHHMMSS,
    getScore,
    countBySeverity,
    findWeaknessTitles,
    cL
} from './utils';

export interface CodeThreatEndpoint {
    /** URL to the CTServer */
    serverUrl: string;

    /** dictionary of auth data */
    parameters: {
        [key: string]: string;
    };

    /** auth scheme such as OAuth or username/password etc... */
    scheme: string;
}

/**
 * @return the OpenShift endpoint authorization as referenced by the task property 'openshiftService'.
 */
interface RequestData {
    [x: string]: any;
}
interface ProjectAddData {
    project_name: string;
    version: string;
}
interface ProjectGetData {
    project_name: string;
    project_id: string;
    version: string;
    languages: any[];
    tags: any[];
    total_loc: number;
    total_files: number;
    type?: any;
    owner: string;
    team: string[];
    created_by: string;
    scan_ids: any[];
}
interface AuthResponse {
    access_token: string;
    token_type: string;
    organization_name: string;
    expires_in: number;
}
export function getCodeThreatEndpoint(): CodeThreatEndpoint {
    const clusterConnection = task.getInput('codethreatService');


    const auth = task.getEndpointAuthorization(clusterConnection, false);
    const serverUrl = task.getEndpointUrl(clusterConnection, false);

    return {
        serverUrl,
        parameters: auth.parameters,
        scheme: auth.scheme
    };
}
async function getExtensionVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
        const filePath = path.resolve(__dirname, 'vss-extension.json'); // Adjust the path if needed

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject("Failed to read vss-extension.json");
            } else {
                const jsonData = JSON.parse(data);
                resolve(jsonData.version);
            }
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
function get(endpoint: CodeThreatEndpoint, path: string, token: string, org: string, isJson: boolean, query?: RequestData): Promise<any> {
    tl.debug(`[CT] API GET: '${path}' with query "${JSON.stringify(query)}"`);
    return new Promise((resolve, reject) => {
        const options: request.CoreOptions = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org
            }
        };

        if (query) {
            options.qs = query;
            options.useQuerystring = true;
        }
        request.get(
            {
                method: "GET",
                baseUrl: endpoint.serverUrl,
                uri: path,
                json: isJson,
                ...options,
            },
            (error, response, body) => {
                if (error) {
                    return logAndReject(
                        reject,
                        `[CT] API GET '${path}' failed, error was: ${JSON.stringify(error)}`
                    );
                }
                // tl.debug(
                //     `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
                // );
                if (response.statusCode == 404 || response.statusCode == 400) {
                    return resolve(404)
                }
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    return logAndReject(
                        reject,
                        `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`
                    );
                }
                return resolve(body || (isJson ? {} : ""));
            }
        );
    });
}
function post(endpoint: CodeThreatEndpoint, path: string, token: string, org: string, isJson?: boolean, body?: any, query?: RequestData): Promise<any> {
    // tl.debug(`[CT] API GET: '${path}' with query "${JSON.stringify(query)}"`);
    // tl.debug(`[CT] API GET: '${path}' with query "${body}"`);
    return new Promise((resolve, reject) => {
        const options: request.CoreOptions = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org,
                'Content-Type': 'application/json'
            }
        };
        request.post(
            {
                method: "POST",
                baseUrl: endpoint.serverUrl,
                uri: path,
                body: body,
                json: isJson,
                ...options,
            },
            (error, response, body) => {
                if (error) {
                    return logAndReject(
                        reject,
                        `[CT] API GET '${path}' failed, error was: ${JSON.stringify(error)}`
                    );
                }
                // tl.debug(
                //     `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
                // );
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    let errorMessage = `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`;
                    if (body && body.message) {
                        errorMessage += ` Message: ${body.message}`;
                    }
                    return logAndReject(
                        reject,
                        errorMessage
                    );
                }
                return resolve(body || (isJson ? {} : ""));
            }
        );
    });
}
function multipart_post(endpoint: CodeThreatEndpoint, path: string, token: string, org: string, isJson: boolean, formDatas: any, body?: string, query?: RequestData): Promise<any> {

    return new Promise((resolve, reject) => {
        const options: request.CoreOptions = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org,
                'Content-Type': 'multipart/form-data'
            },
            formData: formDatas
        };
        request.post(
            {
                method: "POST",
                baseUrl: endpoint.serverUrl,
                uri: path,
                ...options,
            },
            (error, response, body) => {
                if (error) {
                    return logAndReject(
                        reject,
                        `[CT] API GET '${path}' failed, error was: ${JSON.stringify(error)}`
                    );
                }
                // tl.debug(
                //     `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
                // );
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    let errorMessage = `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`;
                    if (body && body.message) {
                        errorMessage += ` Message: ${body.message}`;
                    }
                    return logAndReject(
                        reject,
                        errorMessage
                    );
                }
                return resolve(body || (isJson ? {} : ""));
            }
        );
    });
}
function auth_post(endpoint: CodeThreatEndpoint, path: string, authHeader: string, isJson: boolean, query?: RequestData): Promise<any> {
    tl.debug(`[CT] API POST: '${path}' with query "${JSON.stringify(query)}"`);
    return new Promise((resolve, reject) => {
        const options: request.CoreOptions = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': authHeader
            }
        };
        // console.log(options);
        request.post(
            {
                method: "POST",
                baseUrl: endpoint.serverUrl,
                uri: path,
                json: false,
                ...options,
            },
            (error, response, body) => {
                if (error) {
                    return logAndReject(
                        reject,
                        `[CT] API POST '${path}' failed, error was: ${JSON.stringify(error)}`
                    );
                }
                tl.debug(
                    `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
                );
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    let errorMessage = `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`;
                    if (body && body.message) {
                        errorMessage += ` Message: ${body.message}`;
                    }
                    return logAndReject(
                        reject,
                        errorMessage
                    );
                }
                return resolve(body || (isJson ? {} : ""));
            }
        );
    });
}
function scan_analyze(endpoint: CodeThreatEndpoint, path: string, token: string, org: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const options: request.CoreOptions = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org,
                "plugin": true
            },
        };
        request.get(
            {
                method: "GET",
                baseUrl: endpoint.serverUrl,
                uri: path,
                ...options,
            },
            (error, response, body) => {
                if (error) {
                    return logAndReject(
                        reject,
                        `[CT] API GET '${path}' failed, error was: ${JSON.stringify(error)}`
                    );
                }
                tl.debug(
                    `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
                );
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    let errorMessage = `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`;
                    if (body && body.message) {
                        errorMessage += ` Message: ${body.message}`;
                    }
                    return logAndReject(
                        reject,
                        errorMessage
                    );
                }
                return resolve(body);
            }
        );
    });
}
function getStatus(endpoint: CodeThreatEndpoint, path: string, token: string, org: string, isJson: boolean, query?: RequestData): Promise<any> {
    tl.debug(`[CT] API GET: '${path}' with query "${JSON.stringify(query)}"`);
    return new Promise((resolve, reject) => {
        const options: request.CoreOptions = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ct-organization': org
            }
        };

        if (query) {
            options.qs = query;
            options.useQuerystring = true;
        }
        request.get(
            {
                method: "GET",
                baseUrl: endpoint.serverUrl,
                uri: path,
                json: isJson,
                ...options,
            },
            (error, response, body) => {
                if (error) {
                    return logAndReject(
                        reject,
                        `[CT] API GET '${path}' failed, error was: ${JSON.stringify(error)}`
                    );
                }
                tl.debug(
                    `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
                );
                if (response.statusCode == 404 || response.statusCode == 400) {
                    return resolve(404)
                }
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    let errorMessage = `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`;
                    if (body && body.message) {
                        errorMessage += ` Message: ${body.message}`;
                    }
                    return logAndReject(
                        reject,
                        errorMessage
                    );
                }
                const result = {
                    body: body,
                    headers: response.headers
                };
                return resolve(result || (isJson ? {} : ""));
            }
        );
    });
}
function getRepoVisibility(endpoint: any, repoProvider:any, accountName: any): Promise<any> {
    return new Promise((resolve, reject) => {
    const project = tl.getVariable('System.TeamProject');
    const patToken = endpoint.parameters.azuretoken;

    let apiUrl = `${endpoint.parameters.AzureBaseUrl}/${accountName}/${project}/_apis/git/repositories?api-version=6.0`;
    
    if(repoProvider === 'TfsVersionControl') apiUrl = `${endpoint.parameters.AzureBaseUrl}/${accountName}/${project}/_apis/tfvc/items?path=/&api-version=6.0`

    const options = {
        url: apiUrl,
        headers: {
            'Authorization': 'Basic ' + Buffer.from(':' + patToken).toString('base64')
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
})
}
function check (ctServer:any, repoName:any, authToken:any, orgname:any): Promise<any> {
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
  };

async function run() {
    try {
        const orgname: string | undefined = tl.getInput('organization', true);
        const projectName: string | undefined = tl.getInput('projectName', true);
        const maxCritical: any = tl.getInput('MaxCritical', false);
        const maxHigh: any = tl.getInput('MaxHigh', false);
        let weakness_is: string | undefined = tl.getInput('WeaknessIs', false);
        let condition: string | undefined = tl.getInput('Condition', false);
        let sync_scan: any = tl.getInput('SyncScan', false);

        const endpoint = getCodeThreatEndpoint();

        let branch = tl.getVariable(`Build.SourceBranch`);
        const commitId = tl.getVariable(`Build.SourceVersion`);

        const repositoryName = tl.getVariable("Build.Repository.Name");
        const projectIID = tl.getVariable('System.TeamProjectId');

        console.log("Branch", branch)
        console.log("RepoName", repositoryName)

        let collectionUri = tl.getVariable('System.TeamFoundationCollectionUri');
        collectionUri.substring(0, collectionUri.length - 1);
        let parts = collectionUri.split('/');
        let accountName = parts[parts.length - 2]
        
        let repoId = tl.getVariable('Build.Repository.Id');
        let repoProvider = tl.getVariable('Build.Repository.Provider');

        let repoVisibility:any;

        if(endpoint.parameters.AzureBaseUrl === undefined || !endpoint.parameters.AzureBaseUrl){
            endpoint.parameters.AzureBaseUrl = "https://dev.azure.com";
        }

        if (condition === undefined) {
            weakness_is = "AND"
        }

        if (repoProvider === "TfsGit" || repoProvider === "TfsVersionControl") {
            try {
                const dataRepoInfo = await getRepoVisibility(endpoint, repoProvider, accountName);
                repoVisibility = dataRepoInfo?.value?.[0]?.project?.visibility || null;
            } catch (error) {
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

        let tfvcRepoIdName:any;
        if(repoProvider === "TfsVersionControl"){
            tfvcRepoIdName = `${branch.substring(2)}:${projectIID}:null`
        }

        console.log("[CT] Preparing scan files...")
        let zipPath = tempDir + '/' + projectName + '.zip';
        await zip(sourceDirectory ?? '', zipPath);

        const IssuesResult = async (repoName, token, ctServer, allOrNew) => {
            try {
                let query: any = {
                    projectName: projectName
                };
                if (allOrNew === "new") {
                    query.historical = ["New Issue"]
                }
                const encodedQ = Buffer.from(JSON.stringify(query)).toString('base64');
                let newIssueResult = await getStatus(ctServer, `/api/scanlog/issues?q=${encodedQ}&pageSize=500`, token, orgname!, false);

                const xCtPager = JSON.parse(Buffer.from(newIssueResult.headers["x-ct-pager"], 'base64').toString())


                let allData: any = [];
                let promises = [];

                for (let i = 1; i <= xCtPager.pages; i++) {
                    promises.push(getStatus(ctServer, `/api/scanlog/issues?q=${encodedQ}&pid=${xCtPager.id}&page=${i}`, token, orgname!, true));
                }

                let responses = await Promise.all(promises);
                responses.forEach(response => {
                    response.body.forEach(issue => {
                        allData.push(issue)
                    })
                });

                return allData;
            } catch (error) {
                console.log("IssuesResult --- " + error)
            }
        };

        const encode = (str: string): string => Buffer.from(str, 'binary').toString('base64');

        let token:any;
        if(endpoint.parameters.username && endpoint.parameters.password){
            const authHeader = 'Basic ' + encode(endpoint.parameters.username + ':' + endpoint.parameters.password);
            let response = await auth_post(endpoint, "api/signin", authHeader, true);
            let authResponse: AuthResponse = JSON.parse(response);
            token = authResponse.access_token;
        }else{
            token = endpoint.parameters.token;
        }

        const projectCheck = await check(endpoint.serverUrl, projectName, token, orgname)
        
        let paramBody = {
            repoId : tfvcRepoIdName ? tfvcRepoIdName : `${repositoryName}:${repoId}:${projectIID}`,
            account: accountName,
            project: projectName,
            branch: branch,
            type: repoProvider,
            visibility: repoVisibility,
            baseURL: endpoint.parameters.AzureBaseUrl,
            azureToken : endpoint.parameters.azuretoken,
            action: true,
        }

        if(projectCheck.type === null){
            await post(endpoint, "/api/integration/azure/set", token, orgname!, true, paramBody)
        }
        
        let formData: any = {
            'upfile': {
                'value': fs.createReadStream(zipPath),
                'options': {
                    'filename': zipPath,
                    'contentType': 'multipart/form-data'
                }
            },
            'project': projectName,
            'from':'azure',
            'branch': branch,
            'baseURL': endpoint.parameters.AzureBaseUrl,
            "azuretoken": endpoint.parameters.azuretoken,
        }
        tl.debug(`formdata: ${formData}`);

        let uploadRes = await multipart_post(endpoint, "api/plugins/azure", token, orgname!, true, formData);
        const scanStartResult = JSON.parse(uploadRes);
        let cancellation;
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        const awaitScan = async (sid: any) => {
            try  {
                let scanResult = await scan_analyze(endpoint, `api/scan/status/${sid}`, token, orgname!);
                const scanStatusResult = JSON.parse(scanResult);
            
                if (scanStatusResult.state === "failure") {
                    tl.setResult(tl.TaskResult.Failed, "CodeThreat SCAN FAILED.");
                    throw new Error("CodeThreat Scan failed, Check the connection settings");
                }

                if(sync_scan === 'false'){
                    console.log("Scan started successfuly.")
                    return;
                }
            
                let scanResultObject = {
                    critical: scanStatusResult.severities.critical || 0,
                    high: scanStatusResult.severities.high || 0,
                    medium: scanStatusResult.severities.medium || 0,
                    low: scanStatusResult.severities.low || 0,
                };
            
                console.log(`Scanning... %${scanStatusResult.progress_data.progress} | Critical: ${scanResultObject.critical} | High: ${scanResultObject.high} | Medium: ${scanResultObject.medium} | Low: ${scanResultObject.low}`);
    
                const newIssues = await IssuesResult(repositoryName, token, endpoint, "new");
                let weaknessIsCount = [];
                if (weakness_is !== undefined) {
                    const weaknessIsKeywords = weakness_is?.split(",");
                    weaknessIsCount = findWeaknessTitles(newIssues, weaknessIsKeywords);
                }
            
                if (condition === "OR") {
                    if (
                        maxCritical &&
                        maxCritical < scanResultObject?.critical
                    ) {
                        tl.setResult(tl.TaskResult.Failed, "!! FAILED : Critical limit exceeded. ");
                        cancellation = true;
                    } else if (
                        maxHigh &&
                        maxHigh < scanResultObject?.high
                    ) {
                        tl.setResult(tl.TaskResult.Failed, "!! FAILED : High limit exceeded. ");
                        cancellation = true;
                    } else if (weaknessIsCount.length > 0) {
                        tl.setResult(tl.TaskResult.Failed, "!! FAILED : Weaknesses entered in the weakness_is key were found during the scan.");
                        cancellation = true;
                    }
                } else if (condition === "AND") {
                    if (
                        (maxCritical &&
                            maxCritical < scanResultObject?.critical) ||
                        (maxHigh &&
                            maxHigh < scanResultObject?.high) ||
                        weaknessIsCount.length > 0
                    ) {
                        tl.setResult(tl.TaskResult.Failed, "!! FAILED: A Not all conditions are met according to the given arguments.");
                        cancellation = true;
                    }
                }
            
                if (scanStatusResult.state === "end" || cancellation) {
                    await resultScan(scanStatusResult, scanResultObject, sid, projectName);
                } else {
                    await delay(5000);
                    await awaitScan(sid);
                }
            }
            catch (error) {
                console.error(`An error occurred: ${error.message}`);
                tl.setResult(tl.TaskResult.Failed, `An error occurred during scanning: ${error.message}`);
            }
            
        };

        const resultScan = async (scanStatusResult:any,scanResultObject:any, sid:any, projectName:any) => {
            let reason;
                if (!cancellation) {
                reason = `"\nScan completed successfully ...\n"`;
                } else {
                reason =
                    "Pipeline interrupted because the FAILED_ARGS arguments you entered were found... ";
                }
                console.log(reason);

                const newIssues = await IssuesResult(projectName, token, endpoint, "new");
                const allIssues = await IssuesResult(projectName, token, endpoint, "all");

                let durationTime = convertToHHMMSS(scanStatusResult.ended_at, scanStatusResult.started_at);
                const riskscore = getScore(scanStatusResult.riskscore);

                const newIssuesData = countAndGroupByTitle(newIssues);
                const newIssuesSeverity = countBySeverity(newIssuesData);
                const allIssuesData = countAndGroupByTitle(allIssues);
                const allIssuesSeverity = countBySeverity(allIssuesData);

                let totalCountNewIssues = 0;
                for (const obj of newIssuesData) {
                    totalCountNewIssues += obj.count;
                }

                // Calculate the total number of issues
                const total = Object.values(scanStatusResult.severities).reduce((a: any, b: any) => a + b, 0);

                // Function to print the table row
                const printTableRow = (label: string, totalVal: any, newVal: any) => {
                    console.log(`| ${label.padEnd(8)} |${cL(totalVal, newVal)}|`);
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

                console.log(`\nSee All Results: ${endpoint.serverUrl}issues?scan_id=${sid}&projectName=${projectName}`);

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
                    tl.addAttachment("jsonAttachment", "CTResult", artifactPath)
                } catch (error) {
                    console.error("Failed to publish artifact:", error);
                    tl.setResult(tl.TaskResult.Failed, error.message);
                }
        }
        await awaitScan(scanStartResult.scan_id)
    }
    catch (err) {
        console.log("step failed : " + err)
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();