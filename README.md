
<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://codethreat.com">
    <img src="https://www.codethreat.com/_next/static/media/ct-logo.0cc6530f.svg" alt="Logo" width="259" height="39">
  </a>

  <h3 align="center">CodeThreat Azure DevOps Plugin</h3>

</p>
[CodeThreat](https://codethreat.com)  CodeThreat SAST offers an integrated solution for Static Application Security Testing. Designed to uncover, monitor, and resolve security vulnerabilities within your source code, CodeThreat seamlessly integrates with the Azure DevOps environment, ensuring that security checks become an integral part of your Software Development Life Cycle (SDLC).

With CodeThreat custom rule engine, we have wide language and framework support without sacrificing quality.

## Requirements

* A [CodeThreat](https://cloud.codethreat.com) account. Contact info@codethreat.com if you don't have one yet. or subscribe with basic plan from github marketplace
* Aaand that's all! Now you are ready to jump!

## Key Benefits:

-   **CI/CD Native Analysis**: Crafted for modern CI/CD pipelines, CodeThreat integrates seamlessly, analyzing your code in real-time as you progress through your SDLC.
    
-   **Unmatched Versatility**: Whether you're on a self-hosted agent or a cloud-based one, CodeThreat's flexible design accommodates your setup, ensuring a hassle-free experience.
    
-   **Source Code Elevation**: With CodeThreat, there's no need to compile your source code before a scan. Upload your code directly, and let our powerful scanner handle the rest. Shift left smartly in your CI/CD and save invaluable time.
    
-   **Deep Dive into Binaries**: Not just restricted to source code, CodeThreat can also scan .NET DLLs and executables, decompiling and analyzing assemblies to ensure even your binary files are not hiding vulnerabilities.
        
-   **Swift & Accurate**: Wave goodbye to annoying false positives. With our adaptive rule set, you're ensured a quick, precise analysis, letting you dive deep into root causes without distractions.

## Setting up CodeThreat SAST in Azure DevOps:

1.  **Install the Extension**: Locate the "CodeThreat SAST" extension in the Azure DevOps marketplace and install it to your organization.
    
2.  **Configure Service Endpoint**:
    
    -   Navigate to your **Project Settings** and then **Service Connections**.
    -   Create a new CodeThreat Service Endpoint.
    -   Fill in the details:
        -   Server Url: `https://cloud.codethreat.com`
        -   Username: _(if applicable)_
        -   Password: _(if applicable)_
        -   CodeThreat Token: _(your token)_
        -   Azure Token: _(for connecting to repos)_

  - The permission setting required for the Azure Token you will generate must include at least "Code: Read & Write”

3.  **Integrate into Pipeline**:
    
    -   Add the "CodeThreat Analysis - Scan" task to your pipeline.
    -   Choose the configured CodeThreat Service Endpoint.
    -   Specify the necessary parameters, such as Organization, Project Name, thresholds for critical and high findings, conditions, etc.

    ## Args

    | Variable  | Example Value &nbsp;| Description &nbsp; | Type | Required | Default |
    | ------------- | ------------- | ------------- |------------- | ------------- | ------------- |
    | Max number of critical | 5 | Failed condition for maximum critical number of found issues | Number | No | N/A
    | Max number of high | 20 | Failed condition for maximum high number of found issues | Number | No | N/A
    | Sca Max number of critical | 23 | Failed condition for maximum critical number of found issues, for sca | Number | No | N/A
    | Sca Max number of high | 23 | Failed condition for maximum high number of found issues, for sca | Number | No | N/A
    | Weakness Is | .*injection,buffer.over.read,mass.assigment | Failed condition for found issues weakness id's. | String | No | N/A
    | Condition | "OR" | It checks failed arguments(max_number_of_critical, max_number_of_high)  using with "and" or "or". | String | No | AND
    | Sync Scan | true | If you don't want to wait for the pipeline to finish scanning, set it to false | Boolean | No | true
    | Policy Name | Advanced Security | For example, Advanced Security, SAST Scan, SCA Scan, etc. By default Advanced Security. | String | No | Advanced Security

4.  **Run & Review**:
    
    -   Execute your pipeline and let CodeThreat analyze your code.
    -   Review the findings in the "CodeThreat SAST" tab in the build results or go to the scan report link via console logs.

Stay secure with every commit. With CodeThreat SAST, you're not just writing code; you're crafting secure applications.
