#!/usr/bin/env pwsh
# Script to verify which modules have DetailModal implemented

$modulesPath = "d:\new-hope-erp\client\src\pages"
$modules = @(
    "Events\EventsList.jsx",
    "Conferences\ConferencesList.jsx",
    "Scholars\ScholarsList.jsx",
    "MouUpdates\MouUpdatesList.jsx",
    "ImmersionPrograms\ImmersionProgramsList.jsx",
    "StudentExchange\StudentExchangeList.jsx",
    "Memberships\MembershipsList.jsx",
    "DigitalMedia\DigitalMediaList.jsx",
    "MouSigningCeremonies\MouSigningCeremoniesList.jsx",
    "MastersAbroad\MastersAbroadList.jsx"
)

Write-Host "Checking DetailModal implementation status:" -ForegroundColor Cyan

foreach ($module in $modules) {
    $filePath = Join-Path $modulesPath $module
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        $hasImport = $content -match "import.*DetailModal"
        $hasState = $content -match "detailModal.*useState"
        $hasEyeIcon = $content -match "<Eye"
        $hasModalComponent = $content -match "<DetailModal"
        
        $status = if ($hasImport -and $hasState -and $hasEyeIcon -and $hasModalComponent) {
            "✓ COMPLETE"
        } else {
            "✗ MISSING: Import:$hasImport State:$hasState Eye:$hasEyeIcon Modal:$hasModalComponent"
        }
        
        Write-Host "$($module.PadRight(50)) $status"
    } else {
        Write-Host "$($module.PadRight(50)) FILE NOT FOUND" -ForegroundColor Red
    }
}
