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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.result = exports.getScanStatus = exports.start = exports.create = exports.check = exports.login = exports.cL = exports.findWeaknessTitles = void 0;
const tl = require("azure-pipelines-task-lib");
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
(0, axios_retry_1.default)(axios_1.default, {
    retries: 3,
    retryCondition: (error) => {
        return axios_retry_1.default.isNetworkError(error);
    },
    retryDelay: (retryCount) => {
        return retryCount * 1000;
    },
});
const severityLevels = ["critical", "high", "medium", "low"];
let severities = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
};
const findWeaknessTitles = (weaknessArray, keywords) => {
    try {
        const sanitizedKeywords = [];
        keywords.forEach((keyword) => {
            const sanitizedKeyword = keyword.replace(/[^a-zA-Z0-9.,]/g, "");
            if (sanitizedKeyword) {
                sanitizedKeywords.push(sanitizedKeyword);
            }
        });
        const safeRegexPattern = new RegExp(sanitizedKeywords.join("|"), "i");
        const found = weaknessArray.filter((weakness) => safeRegexPattern.test(weakness.weakness_id));
        return found;
    }
    catch (error) {
        console.log("Find Weakness Titles --- " + error);
    }
};
exports.findWeaknessTitles = findWeaknessTitles;
const cL = (value, value1) => {
    let valueLength = value.toString().length;
    let valueLength1 = value1.toString().length;
    let space = "\xa0".repeat(12 - valueLength);
    let space1 = "\xa0".repeat(12 - valueLength1);
    let result = `\xa0${value}${space}\xa0${value1}${space1}`;
    return result;
};
exports.cL = cL;
const login = (ctServer, username, password) => __awaiter(void 0, void 0, void 0, function* () {
    return yield fetchData(`${ctServer}/api/signin`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        data: { client_id: username, client_secret: password },
    });
});
exports.login = login;
const check = (ctServer, repoName, token, organizationName) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield fetchData(`${ctServer}/api/project?key=${repoName}`, {
        method: "GET",
        headers: {
            Authorization: token,
            "x-ct-organization": organizationName,
        },
    });
    if (response.type !== "azure" && response.type !== null) {
        throw new Error("There is a project with this name, but its type is not azure.");
    }
    return response;
});
exports.check = check;
const create = (ctServer, token, organizationName, paramBody) => __awaiter(void 0, void 0, void 0, function* () {
    return yield fetchData(`${ctServer}/api/integration/azure/set`, {
        method: "POST",
        headers: {
            Authorization: token,
            "x-ct-organization": organizationName,
            "Content-Type": "application/json",
        },
        data: paramBody,
    });
});
exports.create = create;
const start = (ctServer, token, organizationName, formData) => __awaiter(void 0, void 0, void 0, function* () {
    const startResult = yield fetchData(`${ctServer}/api/plugins/azure`, {
        method: "POST",
        headers: Object.assign({ Authorization: token, "x-ct-organization": organizationName }, formData.getHeaders()),
        data: formData,
    });
    return startResult;
});
exports.start = start;
const getScanStatus = (ctServer, token, organizationName, sid) => __awaiter(void 0, void 0, void 0, function* () {
    const scanProcess = yield fetchData(`${ctServer}/api/scan/status/${sid}`, {
        method: "GET",
        headers: {
            Authorization: token,
            "x-ct-organization": organizationName,
            plugin: true,
        },
    });
    severityLevels.forEach((level) => {
        var _a;
        severities[level] = ((_a = scanProcess.severities) === null || _a === void 0 ? void 0 : _a[level]) || 0;
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
});
exports.getScanStatus = getScanStatus;
const result = (ctServer, token, organizationName, sid, branch, projectName) => __awaiter(void 0, void 0, void 0, function* () {
    const resultScan = yield fetchData(`${ctServer}/api/plugins/helper?sid=${sid}&branch=${branch}&project_name=${projectName}`, {
        headers: {
            Authorization: token,
            "x-ct-organization": organizationName,
            "x-ct-from": "azure",
        },
    });
    if (resultScan.type === null) {
        return resultScan;
    }
    return {
        report: resultScan.report,
        scaSeverityCounts: resultScan.scaSeverityCounts,
    };
});
exports.result = result;
const fetchData = (url, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { method, headers, data } = options;
        const response = yield (0, axios_1.default)({
            url,
            method,
            headers,
            data,
            timeout: 60000,
        });
        return response.data;
    }
    catch (error) {
        if (url.includes("project?key") && error.response.status === 404)
            return { type: null };
        if (url.includes("plugins/helper") && error.response.status === 404)
            return { type: null };
        handleError(error);
        throw error;
    }
});
const handleError = (error) => {
    var _a, _b;
    if (axios_1.default.isAxiosError(error)) {
        const networkErrors = [
            "ECONNRESET",
            "ETIMEDOUT",
            "ECONNREFUSED",
            "ENOTFOUND",
            "EHOSTUNREACH",
        ];
        if (networkErrors.includes(error.code)) {
            console.warn(`Network error occurred: ${error.code}. Retrying or handling as needed...`);
        }
        const errorMsg = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message;
        tl.setResult(tl.TaskResult.Failed, errorMsg);
        throw new Error(errorMsg);
    }
    else {
        tl.setResult(tl.TaskResult.Failed, `An unexpected error occurred: ${error}`);
        throw error;
    }
};
