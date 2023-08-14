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
                tl.debug(
                    `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
                );
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
function post(endpoint: CodeThreatEndpoint, path: string, token: string, org: string, isJson: boolean, body?: string, query?: RequestData): Promise<any> {
    tl.debug(`[CT] API GET: '${path}' with query "${JSON.stringify(query)}"`);
    tl.debug(`[CT] API GET: '${path}' with query "${body}"`);
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
                tl.debug(
                    `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
                );
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
                tl.debug(
                    `Response: ${response.statusCode} Body: "${isString(body) ? body : JSON.stringify(body)}"`
                );
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    return logAndReject(
                        reject,
                        `[CT] API GET '${path}' failed, status code was: ${response}`
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
                    return logAndReject(
                        reject,
                        `[CT] API POST '${path}' failed, status code was: ${response.statusCode}`
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
                'Content-Type': 'multipart/form-data'
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
                    return logAndReject(
                        reject,
                        `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`
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
                    return logAndReject(
                        reject,
                        `[CT] API GET '${path}' failed, status code was: ${response.statusCode}`
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

async function run() {
    try {
        const orgname: string | undefined = tl.getInput('organization', true);
        const projectName: string | undefined = tl.getInput('projectName', true);
        const maxCritical: any = tl.getInput('MaxCritical', false);
        const maxHigh: any = tl.getInput('MaxHigh', false);
        let weakness_is: string | undefined = tl.getInput('WeaknessIs', false);
        let condition: string | undefined = tl.getInput('Condition', false);
        const endpoint = getCodeThreatEndpoint();
        const branch = tl.getVariable(`Build.SourceBranch`);
        const commitId = tl.getVariable(`Build.SourceVersion`);

        if(endpoint.parameters.AzureBaseUrl === undefined || !endpoint.parameters.AzureBaseUrl){
            endpoint.parameters.AzureBaseUrl = "https://dev.azure.com";
        }

        if (condition === undefined) {
            weakness_is = "AND"
        }

        const IssuesResult = async (repoName, token, ctServer, allOrNew) => {
            try {
                let query: any = {
                    projectName: repoName,
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

        //console.log(`${endpoint.parameters.username}:${endpoint.parameters.password} ---> ${endpoint.serverUrl}`);
        console.log('CodeThreat Connection to server_url: ', endpoint.serverUrl);
        const sourceDirectory = task.getVariable("Build.SourcesDirectory");
        const tempDir = task.getVariable("Agent.TempDirectory");
        
        console.log("[CT] Preparing scan files...")
        let zipPath = tempDir + '/' + projectName + '.zip';
        await zip(sourceDirectory ?? '', zipPath);
        
        let token:any;
        if(endpoint.parameters.username && endpoint.parameters.password){
            const authHeader = 'Basic ' + encode(endpoint.parameters.username + ':' + endpoint.parameters.password);
            let response = await auth_post(endpoint, "api/signin", authHeader, true);
            let authResponse: AuthResponse = JSON.parse(response);
            token = authResponse.access_token;
        }else{
            token = endpoint.parameters.token;
        }
        
        // let organization_name: string = authResponse.organization_name;

        // let pQuery = { "key": projectName }

        // let is_project_exist = await get(endpoint, "api/project", token, orgname!, true, pQuery);

        // if (is_project_exist == 404) {
        //     console.log("[CT] Creating new project with given information")
        //     // create new project
        //     let pdata: any = `{ "project_name": "${projectName}", "version": "1.0"}`

        //     let pKey = await post(endpoint, "api/project/add", token, orgname!, false, pdata);

        // }
        // let projectObject: ProjectGetData = is_project_exist as ProjectGetData

        let formData: any = {
            'upfile': {
                'value': fs.createReadStream(zipPath),
                'options': {
                    'filename': zipPath,
                    'contentType': 'multipart/form-data'
                }
            },
            'project': `${projectName}`,
            'from':'azure',
            'branch': branch,
            'commitId': commitId,
            'baseURL': endpoint.parameters.AzureBaseUrl
        }
        tl.debug(`formdata: ${formData}`);

        let uploadRes = await multipart_post(endpoint, "api/plugins/azure", token, orgname!, true, formData);
        const scanStartResult = JSON.parse(uploadRes);
        let cancellation;

        let intervalID = setInterval(async () => {
            let scanResult = await scan_analyze(endpoint, `api/scan/status/${scanStartResult.scan_id}`, token, orgname!);
            const scanStatusResult = JSON.parse(scanResult);

            const newIssues = await IssuesResult(projectName, token, endpoint, "new");
            let weaknessIsCount = [];
            if (weakness_is !== undefined) {
                const weaknessIsKeywords = weakness_is?.split(",");
                weaknessIsCount = findWeaknessTitles(newIssues, weaknessIsKeywords);
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
                "\n" +
                "High : " +
                scanResultObject.high +
                "\n" +
                "Medium : " +
                scanResultObject.medium +
                "\n" +
                "Low : " +
                scanResultObject.low +
                "\n")

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
                let reason;
                if (!cancellation) {
                reason = `"\nScan completed successfly ...\n"`;
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

                const total = Object.values(scanStatusResult.severities).reduce((a: any, b: any) => a + b, 0);

                console.log('+----------+-------------+-----------+');
                console.log('| Weakness | Total Issue | New Issue |');
                console.log('+----------+-------------+-----------+');
                console.log(`| Critical |${cL(scanResultObject.critical, newIssuesSeverity.critical)}`);
                console.log(`| High     |${cL(scanResultObject.high, newIssuesSeverity.high)}`);
                console.log(`| Medium   |${cL(scanResultObject.medium, newIssuesSeverity.medium)}`); 
                console.log(`| Low      |${cL(scanResultObject.low, newIssuesSeverity.low)}`);
                console.log(`| TOTAL    |${cL(total, totalCountNewIssues)}`);
                console.log('+----------+-------------+-----------+');

                console.log("\n** -------WEAKNESSES-------- **\n")
                allIssuesData.map((r) => {
                    console.log(`${r.title} - (${r.severity.charAt(0).toUpperCase() + r.severity.slice(1)}) - ${r.count}`)
                })
                if(!cancellation){
                console.log("\n** -------DURATION TIME-------- **")
                console.log("\n" +
                    "Duration Time : " +
                    durationTime +
                    "\n")
                console.log("** -------RISK SCORE-------- **")
                console.log("\n" +
                    "Risk Score : " +
                    riskscore.score +
                    "\n")
                }

                clearInterval(intervalID);
            }
        }, 3000);


    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();