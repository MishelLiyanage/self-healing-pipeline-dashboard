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
$bucketExists = aws s3api head-bucket --bucket $Bucket 2>$null
if ($LASTEXITCODE -ne 0) {
    if ($Region -eq "us-east-1") {
        aws s3api create-bucket --bucket $Bucket --region $Region | Out-Null
    } else {
        aws s3api create-bucket --bucket $Bucket --region $Region `
            --create-bucket-configuration LocationConstraint=$Region | Out-Null
    }
}

Write-Host "Configuring public static website hosting..." -ForegroundColor Cyan
aws s3api put-public-access-block --bucket $Bucket --public-access-block-configuration `
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" | Out-Null

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
Set-Content -Path $policyFile -Value $policy -Encoding utf8
aws s3api put-bucket-policy --bucket $Bucket --policy "file://$policyFile" | Out-Null
Remove-Item $policyFile

# error-document = index.html too: this is a client-side-routed SPA (react-router), so a
# direct hit on /explanations must still serve index.html for the router to take over.
aws s3api put-bucket-website --bucket $Bucket --website-configuration '{
  "IndexDocument": {"Suffix": "index.html"},
  "ErrorDocument": {"Key": "index.html"}
}' | Out-Null

Write-Host "Syncing dist/ to s3://$Bucket ..." -ForegroundColor Cyan
aws s3 sync $DistDir "s3://$Bucket" --region $Region

$siteUrl = "http://$Bucket.s3-website.$Region.amazonaws.com"
Write-Host ""
Write-Host "Deployed: $siteUrl" -ForegroundColor Green
Write-Host "Set this as the 'Dashboard data URL' AND as the origin target-app's CorsFilter allow-list needs." -ForegroundColor Yellow
