# Documentation Generator Script
# Creates template files for all remaining documentation

$docs = @{
    "01-system-overview" = @(
        "02-vision-objectives.md",
        "03-system-scope.md",
        "04-rice-mill-background.md",
        "05-problem-statement.md",
        "06-expected-benefits.md",
        "07-modules-overview.md"
    )
    "02-business-operations" = @(
        "01-process-flow.md",
        "02-milling-cycle.md",
        "03-procurement-process.md",
        "04-production-process.md",
        "05-inventory-process.md",
        "06-sales-process.md",
        "07-delivery-flow.md",
        "08-hr-workflow.md",
        "09-finance-workflow.md",
        "10-byproduct-handling.md"
    )
    "03-technical-architecture" = @(
        "02-frontend-architecture.md",
        "03-backend-architecture.md",
        "04-database-architecture.md",
        "05-api-architecture.md",
        "06-module-architecture.md",
        "07-deployment-architecture.md"
    )
    "04-requirements" = @(
        "01-functional-requirements.md",
        "02-non-functional-requirements.md",
        "03-user-requirements.md",
        "04-module-requirements.md",
        "05-role-requirements.md",
        "06-business-rules.md"
    )
    "05-rbac" = @(
        "01-roles-overview.md",
        "03-permissions.md",
        "04-validation-flow.md",
        "05-navigation-rules.md",
        "06-middleware-logic.md",
        "07-restricted-actions.md"
    )
    "06-database" = @(
        "01-er-diagram.md",
        "02-schema-definitions.md",
        "03-relationships.md",
        "04-indexing.md",
        "05-backup-restore.md",
        "06-data-dictionary.md",
        "07-validation-rules.md"
    )
    "07-api" = @(
        "02-auth-api.md",
        "03-user-api.md",
        "04-customer-supplier-api.md",
        "05-inventory-api.md",
        "06-production-api.md",
        "07-sales-api.md",
        "08-warehouse-api.md",
        "09-delivery-api.md",
        "10-finance-payroll-api.md",
        "11-audit-log-api.md",
        "12-response-format.md",
        "13-error-handling.md"
    )
    "08-ui-ux" = @(
        "01-navigation-map.md",
        "02-ui-flows.md",
        "03-wireframes.md",
        "04-user-journeys.md",
        "05-form-validations.md",
        "06-mobile-adaptation.md",
        "07-design-system.md"
    )
    "09-modules" = @(
        "01-sales-customer.md",
        "02-production.md",
        "03-inventory.md",
        "04-finance.md",
        "05-hr-payroll.md"
    )
    "10-calculations" = @(
        "01-recovery-formula.md",
        "02-cogs-formula.md",
        "03-pricing-formula.md",
        "04-profit-formulas.md",
        "05-batch-costing.md",
        "06-cash-flow.md",
        "07-expense-allocation.md",
        "08-yield-analysis.md",
        "09-salary-formulas.md"
    )
    "11-security" = @(
        "01-security-policies.md",
        "02-authentication-flow.md",
        "03-authorization-flow.md",
        "04-audit-logging.md",
        "05-data-protection.md",
        "06-activity-monitoring.md",
        "07-error-handling.md"
    )
    "12-testing" = @(
        "01-test-cases.md",
        "02-integration-tests.md",
        "03-api-testing.md",
        "04-uat.md",
        "05-performance-tests.md",
        "06-error-scenarios.md"
    )
    "13-deployment" = @(
        "01-local-installation.md",
        "03-environment-variables.md",
        "04-backup-strategy.md",
        "05-restore-strategy.md",
        "06-log-monitoring.md",
        "07-maintenance-schedule.md",
        "08-update-process.md"
    )
    "14-user-manuals" = @(
        "01-admin-guide.md",
        "02-accountant-guide.md",
        "03-sales-manager-guide.md",
        "04-operator-guide.md",
        "05-warehouse-manager-guide.md",
        "06-driver-guide.md",
        "07-labour-guide.md",
        "08-faq-troubleshooting.md"
    )
    "15-business-legal" = @(
        "01-project-proposal.md",
        "02-costing-budget.md",
        "03-timeframe-milestones.md",
        "04-maintenance-contract.md",
        "05-sla.md",
        "06-data-privacy.md",
        "07-warranty-plans.md"
    )
}

$baseDir = "d:/my_projects/rice-mill-management/docs"

foreach ($folder in $docs.Keys) {
    foreach ($file in $docs[$folder]) {
        $filePath = Join-Path $baseDir "$folder/$file"
        $title = ($file -replace '\.md$', '' -replace '-', ' ' -replace '^\d+\s+', '').ToUpper()
        
        $content = @"
# $title
## Rice Mill Management System

> **Status:** Template - To be completed
> **Last Updated:** $(Get-Date -Format 'yyyy-MM-dd')

---

## Overview

[Provide overview of this topic]

---

## Details

[Add detailed content here]

---

## Examples

[Add examples if applicable]

---

## References

- [Related Documentation]
- [External Resources]

---

**Note:** This is a template document. Please update with actual content.
"@
        
        if (-not (Test-Path $filePath)) {
            New-Item -ItemType File -Path $filePath -Force | Out-Null
            Set-Content -Path $filePath -Value $content
            Write-Host "Created: $filePath" -ForegroundColor Green
        } else {
            Write-Host "Exists: $filePath" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nDocumentation template generation complete!" -ForegroundColor Cyan
Write-Host "Total files created: $($docs.Values | ForEach-Object { $_.Count } | Measure-Object -Sum | Select-Object -ExpandProperty Sum)" -ForegroundColor Cyan
