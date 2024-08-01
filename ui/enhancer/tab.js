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
Object.defineProperty(exports, "__esModule", { value: true });
const Controls = __importStar(require("VSS/Controls"));
const DTClient = __importStar(require("TFS/DistributedTask/TaskRestClient"));
const BUILD_PHASE = "build";
const jsonAttachment = "jsonAttachment";
let projectId = "";
let planId = "";
let taskClient;
function initialize() {
    const sharedConfig = VSS.getConfiguration();
    const vsoContext = VSS.getWebContext();
    if (sharedConfig) {
        sharedConfig.onBuildChanged((build) => {
            taskClient = DTClient.getClient();
            projectId = vsoContext.project.id;
            planId = build.orchestrationPlan.planId;
            taskClient
                .getPlanAttachments(projectId, BUILD_PHASE, planId, jsonAttachment)
                .then((taskAttachments) => {
                taskAttachments.forEach((taskAttachment) => {
                    const attachmentName = taskAttachment.name;
                    const timelineId = taskAttachment.timelineId;
                    const recordId = taskAttachment.recordId;
                    taskClient
                        .getAttachmentContent(projectId, BUILD_PHASE, planId, timelineId, recordId, jsonAttachment, attachmentName)
                        .then((content) => {
                        const data = new TextDecoder("utf-8").decode(new DataView(content));
                        createSummary(JSON.parse(data));
                    });
                });
                VSS.notifyLoadSucceeded();
            });
        });
    }
}
function createSummary(data) {
    var _a;
    const container = document.getElementById("CT-report");
    if (!container)
        return;
    if (data || data != undefined) {
        (_a = document.getElementById("noReport")) === null || _a === void 0 ? void 0 : _a.remove();
    }
    const title = document.createElement("h2");
    title.textContent = "Codethreat Scan Summary";
    container.appendChild(title);
    const table = document.createElement("table");
    table.classList.add("summary-table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Weakness", "Total Issue", "New Issue"].forEach((headerText) => {
        const th = document.createElement("th");
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    let totalIssuesCount = 0;
    let totalNewIssuesCount = 0;
    ["Critical", "High", "Medium", "Low"].forEach((severity) => {
        const tr = document.createElement("tr");
        const tdWeakness = document.createElement("td");
        tdWeakness.textContent = severity;
        tr.appendChild(tdWeakness);
        const totalIssues = data.scanStatus.severities[severity.toLowerCase()] || 0;
        totalIssuesCount += totalIssues;
        const tdTotalIssue = document.createElement("td");
        tdTotalIssue.textContent = totalIssues.toString();
        tr.appendChild(tdTotalIssue);
        const newIssues = data.newIssuesSeverity[severity.toLowerCase()] || 0;
        totalNewIssuesCount += newIssues;
        const tdNewIssue = document.createElement("td");
        tdNewIssue.textContent = newIssues.toString();
        tr.appendChild(tdNewIssue);
        tbody.appendChild(tr);
    });
    const totalRow = document.createElement("tr");
    const tdTotalLabel = document.createElement("td");
    tdTotalLabel.textContent = "TOTAL";
    totalRow.appendChild(tdTotalLabel);
    const tdTotalIssues = document.createElement("td");
    tdTotalIssues.textContent = totalIssuesCount.toString();
    totalRow.appendChild(tdTotalIssues);
    const tdTotalNewIssues = document.createElement("td");
    tdTotalNewIssues.textContent = totalNewIssuesCount.toString();
    totalRow.appendChild(tdTotalNewIssues);
    tbody.appendChild(totalRow);
    table.appendChild(tbody);
    container.appendChild(table);
    const issuesList = document.createElement("ul");
    issuesList.classList.add("issues-list");
    data.allIssues.forEach((issue) => {
        const li = document.createElement("li");
        li.textContent = `${issue.name} -> ${issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}(${issue.count})`;
        issuesList.appendChild(li);
    });
    container.appendChild(issuesList);
    const titleSca = document.createElement("h2");
    titleSca.textContent = "SCA Dependency Vulnerabilities";
    container.appendChild(titleSca);
    const depsTable = document.createElement("table");
    depsTable.classList.add("summary-table");
    depsTable.classList.add("deps-table");
    const depsThead = document.createElement("thead");
    const depsHeaderRow = document.createElement("tr");
    ["Dependency", "Issues", "License"].forEach((headerText) => {
        const th = document.createElement("th");
        th.textContent = headerText;
        depsHeaderRow.appendChild(th);
    });
    depsThead.appendChild(depsHeaderRow);
    depsTable.appendChild(depsThead);
    const depsTbody = document.createElement("tbody");
    data.scaDeps.forEach((pkg) => {
        var _a;
        const tr = document.createElement("tr");
        const tdDependency = document.createElement("td");
        tdDependency.textContent = pkg.unique_id;
        tr.appendChild(tdDependency);
        const tdIssues = document.createElement("td");
        tdIssues.textContent = `Critical:${pkg.countSca.CRITICAL} - High:${pkg.countSca.HIGH} - Medium:${pkg.countSca.MEDIUM} - Low:${pkg.countSca.LOW}`;
        tr.appendChild(tdIssues);
        const tdLicense = document.createElement("td");
        tdLicense.textContent = ((_a = pkg.license[0]) === null || _a === void 0 ? void 0 : _a.Name) || "N/A";
        tr.appendChild(tdLicense);
        depsTbody.appendChild(tr);
    });
    depsTable.appendChild(depsTbody);
    container.appendChild(depsTable);
    const link = document.createElement("p");
    const baseURLLink = document.createElement("a");
    baseURLLink.href = `${data.BaseURL}issues?scan_id=${data.sid}&projectName=${data.scanStatus.projectName}&tenant=${data.org}`;
    baseURLLink.textContent = "View Full Report";
    baseURLLink.style.color = "#34495e";
    baseURLLink.style.textDecoration = "none";
    baseURLLink.style.borderBottom = "2px solid #34495e";
    link.appendChild(baseURLLink);
    container.appendChild(link);
    const duration = document.createElement("p");
    duration.textContent = `Scan Duration: ${data.duration}`;
    container.appendChild(duration);
    const riskScore = document.createElement("p");
    riskScore.textContent = `Risk Score: ${data.riskScore.score}`;
    container.appendChild(riskScore);
}
initialize();
Controls.BaseControl.enhance(Controls.BaseControl, document.getElementsByClassName("CT-report")[0], {});
