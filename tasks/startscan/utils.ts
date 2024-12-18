import tl = require("azure-pipelines-task-lib");
import axios from "axios";
import axiosRetry from "axios-retry";

axiosRetry(axios, {
  retries: 3,
  retryCondition: (error) => {
    return axiosRetry.isNetworkError(error);
  },
  retryDelay: (retryCount) => {
    return retryCount * 1000;
  },
});

let apiVersion;

const severityLevels = ["critical", "high", "medium", "low"];

let severities = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
};

export const findWeaknessTitles = (weaknessArray, keywords) => {
  try {
    const sanitizedKeywords = [];

    keywords.forEach((keyword) => {
      const sanitizedKeyword = keyword.replace(/[^a-zA-Z0-9.,]/g, "");
      if (sanitizedKeyword) {
        sanitizedKeywords.push(sanitizedKeyword);
      }
    });

    const safeRegexPattern = new RegExp(sanitizedKeywords.join("|"), "i");
    const found = weaknessArray.filter((weakness) =>
      safeRegexPattern.test(weakness.weakness_id)
    );

    return found;
  } catch (error) {
    console.log("Find Weakness Titles --- " + error);
  }
};

export const cL = (value, value1) => {
  let valueLength = value.toString().length;
  let valueLength1 = value1.toString().length;
  let space = "\xa0".repeat(12 - valueLength);
  let space1 = "\xa0".repeat(12 - valueLength1);
  let result = `\xa0${value}${space}\xa0${value1}${space1}`;
  return result;
};

export const login = async (
  ctServer: string,
  username: string,
  password: string
) => {
  const loginInfo = await fetchData(`${ctServer}/api/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: { client_id: username, client_secret: password },
  });
  return loginInfo;
};

export const check = async (
  ctServer: string,
  repoName: string,
  token: string,
  organizationName: string
) => {
  const compareVersion = compareVersions("1.7.8", apiVersion);
  const response: any = await fetchData(
    `${ctServer}/api/project?key=${repoName}`,
    {
      method: "GET",
      headers: {
        Authorization: token,
        "x-ct-organization": organizationName,
      },
    },
    compareVersion
  );

  if (response && response.length === 0) return { type: null };

  if (response.type && response.type !== "azure") {
    throw new Error(
      "There is a project with this name, but its type is not azure."
    );
  }

  return response;
};

export const create = async (
  ctServer: string,
  token: string,
  organizationName: string,
  paramBody: any
) => {
  return await fetchData(`${ctServer}/api/integration/azure/set`, {
    method: "POST",
    headers: {
      Authorization: token,
      "x-ct-organization": organizationName,
      "Content-Type": "application/json",
    },
    data: paramBody,
  });
};

export const start = async (
  ctServer: string,
  token: string,
  organizationName: string,
  formData: any
) => {
  const startResult = await fetchData(`${ctServer}/api/plugins/azure`, {
    method: "POST",
    headers: {
      Authorization: token,
      "x-ct-organization": organizationName,
      ...formData.getHeaders(),
    },
    data: formData,
  });
  return startResult;
};

export const getScanStatus = async (
  ctServer: string,
  token: string,
  organizationName: string,
  sid: any
) => {
  const scanProcess = await fetchData(`${ctServer}/api/scan/status/${sid}`, {
    method: "GET",
    headers: {
      Authorization: token,
      "x-ct-organization": organizationName,
      plugin: true,
    },
  });
  severityLevels.forEach((level) => {
    severities[level] = scanProcess.sast_severities?.[level] || 0;
  });
  return {
    progress: scanProcess.progress_data.progress,
    weaknessesArr: scanProcess.weaknessesArr,
    state: scanProcess.state,
    riskscore: scanProcess.riskscore,
    started_at: scanProcess.started_at,
    ended_at: scanProcess.ended_at,
    severities,
  };
};

export const result = async (
  ctServer: string,
  token: string,
  organizationName: string,
  sid: string,
  branch: string,
  projectName: string
) => {
  const resultScan = await fetchData(
    `${ctServer}/api/plugins/helper?sid=${sid}&branch=${branch}&project_name=${projectName}`,
    {
      headers: {
        Authorization: token,
        "x-ct-organization": organizationName,
        "x-ct-from": "azure",
      },
    }
  );
  if (resultScan.type === null) {
    return resultScan;
  }
  return {
    report: resultScan.report,
    scaSeverityCounts: resultScan.scaSeverityCounts,
  };
};

const fetchData = async (url: string, options: any, compareVersion?: any) => {
  try {
    const { method, headers, data } = options;

    const response = await axios({
      url,
      method,
      headers,
      data,
      timeout: 60000,
    });

    if (!apiVersion && response.headers["x-api-versionn"])
      apiVersion = response.headers["x-api-version"];

    return response.data;
  } catch (error: any) {
    if (url.includes("plugins/helper") && error.response.status === 404)
      return { type: null };
    if (
      compareVersion &&
      compareVersion === 1 &&
      url.includes("project?key") &&
      (error.response.status === 404 || error.response.status === 400)
    )
      return { type: null };
    handleError(error);
    throw error;
  }
};

const handleError = (error) => {
  if (axios.isAxiosError(error)) {
    const networkErrors: any = [
      "ECONNRESET",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ENOTFOUND",
      "EHOSTUNREACH",
    ];

    if (networkErrors.includes(error.code)) {
      console.warn(
        `Network error occurred: ${error.code}. Retrying or handling as needed...`
      );
    }

    const errorMsg = error.response?.data?.message || error.message;
    tl.setResult(tl.TaskResult.Failed, errorMsg);
    throw new Error(errorMsg);
  } else {
    tl.setResult(
      tl.TaskResult.Failed,
      `An unexpected error occurred: ${error}`
    );
    throw error;
  }
};

const compareVersions = (version1, version2) => {
  if (!version2) return 1;
  const parseVersion = (version) => version.split(".").map(Number);

  const [major1, minor1, patch1] = parseVersion(version1);
  const [major2, minor2, patch2] = parseVersion(version2);

  if (major1 > major2) return 1;
  if (major1 < major2) return -1;

  if (minor1 > minor2) return 1;
  if (minor1 < minor2) return -1;

  if (patch1 > patch2) return 1;
  if (patch1 < patch2) return -1;

  return 1; //eq
};
