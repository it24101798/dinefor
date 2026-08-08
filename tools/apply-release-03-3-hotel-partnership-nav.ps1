$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $projectRoot "client\src\pages\HotelDashboard.jsx"

if (!(Test-Path $target)) {
    throw "HotelDashboard.jsx was not found at: $target"
}

$content = Get-Content $target -Raw

# 1) Add Partnership & Compliance to Hotel Portal navigation.
$navNeedle = '  { key: "profile", label: "Hotel Profile", icon: "business", path: "/hotel/profile" },'
$navInsert = @'
  { key: "profile", label: "Hotel Profile", icon: "business", path: "/hotel/profile" },
  { key: "partnership", label: "Partnership & Compliance", icon: "verified_user", path: "/hotel-partnership" },
'@

if ($content -notmatch [regex]::Escape('path: "/hotel-partnership"')) {
    if ($content.Contains($navNeedle)) {
        $content = $content.Replace($navNeedle, $navInsert.TrimEnd())
    } else {
        throw "Navigation insertion point was not found. No changes were written."
    }
}

# 2) Add a dashboard quick-action entry so mobile users can also reach Partnership & Compliance.
$quickNeedle = @'
              <button onClick={() => navigate("/hotel/profile")} className="btn-outline flex items-center justify-center gap-2 p-4">
                <span className="material-symbols-outlined text-[20px]">settings</span>
                Profile
              </button>
'@

$quickInsert = @'
              <button onClick={() => navigate("/hotel/profile")} className="btn-outline flex items-center justify-center gap-2 p-4">
                <span className="material-symbols-outlined text-[20px]">settings</span>
                Profile
              </button>
              <button onClick={() => navigate("/hotel-partnership")} className="btn-outline flex items-center justify-center gap-2 p-4 col-span-2">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
                Partnership & Compliance
              </button>
'@

if ($content -notmatch 'navigate\("/hotel-partnership"\)') {
    if ($content.Contains($quickNeedle.TrimStart("`r","`n"))) {
        $content = $content.Replace($quickNeedle.TrimStart("`r","`n"), $quickInsert.TrimStart("`r","`n"))
    } else {
        # Navigation was added above, so this is only a secondary enhancement.
        Write-Warning "Quick Actions insertion point was not found. Sidebar navigation was still added."
    }
}

# 3) Add a compact partnership status indicator in the Hotel Portal sidebar header.
$statusNeedle = @'
            <div className="mt-2 flex items-center gap-2">
              <span className="badge-gold">{summary.activeBuffets} active buffets</span>
            </div>
'@

$statusInsert = @'
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="badge-gold">{summary.activeBuffets} active buffets</span>
              <button
                type="button"
                onClick={() => navigate("/hotel-partnership")}
                className="text-xs font-semibold px-2.5 py-1 rounded-full border border-secondary/20 bg-secondary-container/10 text-secondary hover:bg-secondary-container/20 transition-colors"
                title="Open Partnership & Compliance"
              >
                Partnership: {(hotel?.partnershipStatus || (hotel?.isApproved ? "active_legacy" : hotel?.status || "application_draft")).replace(/_/g, " ")}
              </button>
            </div>
'@

if ($content -notmatch 'Partnership:\s*\{\(hotel\?\.partnershipStatus') {
    if ($content.Contains($statusNeedle.TrimStart("`r","`n"))) {
        $content = $content.Replace($statusNeedle.TrimStart("`r","`n"), $statusInsert.TrimStart("`r","`n"))
    } else {
        Write-Warning "Sidebar partnership status insertion point was not found."
    }
}

# Write UTF-8 without BOM.
[System.IO.File]::WriteAllText($target, $content, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "Release 3.3 Hotel Partnership navigation hotfix applied successfully." -ForegroundColor Green
Write-Host "Updated: client/src/pages/HotelDashboard.jsx"
Write-Host ""
Write-Host "Next:"
Write-Host "  cd client"
Write-Host "  npm run build"
Write-Host "  npm run dev"
