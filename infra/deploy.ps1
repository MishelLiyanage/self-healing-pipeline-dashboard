# Builds the React app and publishes it to an S3 static website - the same low-cost
# approach used for target-app's LoadBalancer setup, just for this repo's own dashboard.
# Safe to re-run any time src/ changes; only ever adds/updates files in the bucket (no
# --delete on the sync) so it never wipes out episodes.json, which the self-healing-pipeline
# repo's trust_experiment.py publishes into this same bucket independently.

$ErrorActionPreference = "Stop"

# Not secret - same account/region used throughout this FYP's AWS setup.
$AccountId = "905962607421"
$Region    = "ap-south-1"
$Bucket    = "fyp-dashboard-$AccountId"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$DistDir  = Join-Path $RepoRoot "dist"

# PowerShell turns ANY stderr line from a native exe (aws.exe included) into a
# terminating NativeCommandError while $ErrorActionPreference = "Stop" is in effect -
# even when that line is just aws's normal "bucket doesn't exist yet" message and the
# call is only being used to check $LASTEXITCODE. Run aws calls with EAP temporarily
# relaxed so only a genuinely non-zero exit code is treated as failure.
function Invoke-Aws {
    param([Parameter(ValueFromRemainingArguments = $true)] [string[]] $Args)
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & aws @Args 2>&1
    $ErrorActionPreference = $prevEAP
    return @{ Output = $output; ExitCode = $LASTEXITCODE }
}

function Invoke-AwsOrThrow {
    param([Parameter(ValueFromRemainingArguments = $true)] [string[]] $Args)
    $result = Invoke-Aws @Args
    if ($result.ExitCode -ne 0) {
        throw "aws $($Args -join ' ') failed (exit $($result.ExitCode)):`n$($result.Output -join "`n")"
    }
    return $result.Output
}

Write-Host "Building..." -ForegroundColor Cyan
Push-Location $RepoRoot
try {
    npm install
    npm run build
} finally {
    Pop-Location
}

if (-not (Test-Path $DistDir)) {
    throw "Build did not produce a dist/ folder - check the npm run build output above."
}

Write-Host "Ensuring bucket $Bucket exists..." -ForegroundColor Cyan
$head = Invoke-Aws s3api head-bucket --bucket $Bucket --region $Region
if ($head.ExitCode -ne 0) {
    Write-Host "  bucket not found - creating it" -ForegroundColor DarkGray
    if ($Region -eq "us-east-1") {
        Invoke-AwsOrThrow s3api create-bucket --bucket $Bucket --region $Region | Out-Null
    } else {
        Invoke-AwsOrThrow s3api create-bucket --bucket $Bucket --region $Region `
            --create-bucket-configuration LocationConstraint=$Region | Out-Null
    }
} else {
    Write-Host "  bucket already exists" -ForegroundColor DarkGray
}

Write-Host "Configuring public static website hosting..." -ForegroundColor Cyan
Invoke-AwsOrThrow s3api put-public-access-block --bucket $Bucket --region $Region `
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" | Out-Null

$policy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$Bucket/*"
    }
  ]
}
"@
$policyFile = Join-Path $env:TEMP "dashboard-bucket-policy.json"
# Set-Content -Encoding utf8 writes a UTF-8 BOM on Windows PowerShell, and aws s3api
# rejects that ("first byte must be '{'") - write plain UTF-8 without a BOM instead.
[System.IO.File]::WriteAllText($policyFile, $policy, (New-Object System.Text.UTF8Encoding $false))
Invoke-AwsOrThrow s3api put-bucket-policy --bucket $Bucket --region $Region --policy "file://$policyFile" | Out-Null
Remove-Item $policyFile

# error-document = index.html too: this is a client-side-routed SPA (react-router), so a
# direct hit on /explanations must still serve index.html for the router to take over.
# Passed via a temp file, not inline - PowerShell mangles the embedded double quotes
# when a multi-line string with quotes is passed straight to a native exe's argv (same
# reason the bucket policy above goes through a file rather than inline JSON).
$websiteConfig = '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'
$websiteConfigFile = Join-Path $env:TEMP "dashboard-website-config.json"
[System.IO.File]::WriteAllText($websiteConfigFile, $websiteConfig, (New-Object System.Text.UTF8Encoding $false))
Invoke-AwsOrThrow s3api put-bucket-website --bucket $Bucket --region $Region --website-configuration "file://$websiteConfigFile" | Out-Null
Remove-Item $websiteConfigFile

Write-Host "Syncing dist/ to s3://$Bucket ..." -ForegroundColor Cyan
Invoke-AwsOrThrow s3 sync $DistDir "s3://$Bucket" --region $Region | Write-Host

$siteUrl = "http://$Bucket.s3-website.$Region.amazonaws.com"
Write-Host ""
Write-Host "Deployed: $siteUrl" -ForegroundColor Green
Write-Host "Set this as the 'Dashboard data URL' AND as the origin target-app's CorsFilter allow-list needs." -ForegroundColor Yellow
