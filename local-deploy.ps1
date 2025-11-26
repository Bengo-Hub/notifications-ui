<# 
  Local deployment helper for Notifications Service (Windows PowerShell)
  Mirrors the auth-service script semantics: ensure .env, ensure Redis, build+run container.
#>

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($PSScriptRoot) {
  $ROOT_DIR = $PSScriptRoot
} else {
  $ROOT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
}

function Invoke-DatabaseMigrations {
  if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Log "Go not installed; skipping migrations."
    return
  }

  if (-not (Test-Path -LiteralPath $MIGRATE_CMD)) {
    Write-Log "Migration command not found; skipping."
    return
  }

  Write-Log "Running database migrations"
  & go run "$MIGRATE_CMD"
}

function Invoke-DataSeed {
  if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Log "Go not installed; skipping seed."
    return
  }

  if (-not (Test-Path -LiteralPath $SEED_CMD)) {
    Write-Log "Seed command not found; skipping."
    return
  }

  Write-Log "Seeding initial data"
  & go run "$SEED_CMD"
}
Set-Location $ROOT_DIR

$APP_PORT = 4002
$REDIS_CONTAINER_NAME = "redis"
$SERVICE_IMAGE = "notifications-app:local"
$SERVICE_CONTAINER_NAME = "notifications-app-local"
$DOCKER_PUSH_TARGET = $env:NOTIFICATIONS_DOCKER_PUSH_TARGET
$ENV_FILE = Join-Path $ROOT_DIR ".env"
$EXAMPLE_ENV = Join-Path $ROOT_DIR "config\app.env.example"
$TEMPLATES_DIR = Join-Path $ROOT_DIR "templates"
$CERTS_DIR = Join-Path $ROOT_DIR "config\certs"
 $MIGRATE_CMD = Join-Path $ROOT_DIR "cmd\migrate"
 $SEED_CMD = Join-Path $ROOT_DIR "cmd\seed"

function Write-Log([string] $Message) {
  Write-Host "[local-deploy] $Message"
}

function Test-CommandAvailable([string] $Cmd) {
  if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Cmd"
  }
}

function Initialize-EnvFile {
  if (-not (Test-Path -LiteralPath $ENV_FILE)) {
    Write-Log "Creating .env from config/app.env.example"
    Copy-Item -LiteralPath $EXAMPLE_ENV -Destination $ENV_FILE -Force
  }

  $content = Get-Content -LiteralPath $ENV_FILE -Raw

  if ($content -match "(?m)^NOTIFICATIONS_REDIS_ADDR=") {
    $content = [regex]::Replace($content, "(?m)^NOTIFICATIONS_REDIS_ADDR=.*", "NOTIFICATIONS_REDIS_ADDR=127.0.0.1:6379")
  } else {
    $content = $content.TrimEnd() + "`r`nNOTIFICATIONS_REDIS_ADDR=127.0.0.1:6379`r`n"
  }

  if ($content -match "(?m)^NOTIFICATIONS_HTTP_PORT=") {
    $portLine = ([regex]::Match($content, "(?m)^NOTIFICATIONS_HTTP_PORT=(.+)$")).Groups[1].Value
    if ($portLine -match '^\d+$') { $script:APP_PORT = [int]$portLine }
  }

  Set-Content -LiteralPath $ENV_FILE -Value $content -Encoding UTF8
}

function Test-ContainerExists([string] $Name) {
  $inspect = docker ps -a --filter "name=^${Name}$" --format '{{.ID}}'
  return -not [string]::IsNullOrWhiteSpace($inspect)
}

function Test-ContainerRunning([string] $Name) {
  $inspect = docker ps --filter "name=^${Name}$" --format '{{.ID}}'
  return -not [string]::IsNullOrWhiteSpace($inspect)
}

function Start-RedisDependency {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Log "Docker not found; skipping Redis container. Ensure Redis is reachable at 127.0.0.1:6379."
    return
  }

  $exists = Test-ContainerExists $REDIS_CONTAINER_NAME
  $running = Test-ContainerRunning $REDIS_CONTAINER_NAME

  if (-not $exists) {
    Write-Log "Starting Redis container"
    try {
      docker run -d --name $REDIS_CONTAINER_NAME -p 6379:6379 redis:7 | Out-Null
    } catch {
      Write-Log "Redis start failed (likely port in use); continuing: $($_.Exception.Message)"
    }
  } elseif (-not $running) {
    Write-Log "Starting existing Redis container"
    try {
      docker start $REDIS_CONTAINER_NAME | Out-Null
    } catch {
      Write-Log "Redis start failed (likely port in use); continuing: $($_.Exception.Message)"
    }
  } else {
    Write-Log "Redis container already running"
  }
}

function Invoke-ServiceImageBuild {
  Test-CommandAvailable "docker"
  Write-Log "Building image $SERVICE_IMAGE"
  # Build from workspace root to include shared/auth-client
  $workspaceRoot = Split-Path -Parent $ROOT_DIR
  Set-Location $workspaceRoot
  docker build -f "$ROOT_DIR\Dockerfile" -t $SERVICE_IMAGE . --progress=plain | Out-Null
  Set-Location $ROOT_DIR
}

function Publish-ServiceImage {
  if ([string]::IsNullOrWhiteSpace($DOCKER_PUSH_TARGET)) {
    Write-Log "NOTIFICATIONS_DOCKER_PUSH_TARGET not set; skipping docker push"
    return
  }
  $targetImage = $DOCKER_PUSH_TARGET
  Write-Log "Pushing image to $targetImage"
  docker tag $SERVICE_IMAGE $targetImage | Out-Null
  docker push $targetImage | Out-Null
}

function New-OverrideEnvVars {
  $overrideArgs = @()
  if (Test-Path -LiteralPath $ENV_FILE) {
    $match = Select-String -Path $ENV_FILE -Pattern '^(?i)NOTIFICATIONS_POSTGRES_URL=' -SimpleMatch:$false
    if ($match) {
      $line = if ($match -is [System.Array]) { $match[0].Line } else { $match.Line }
      $dbUrl = ($line -replace '^(?i)NOTIFICATIONS_POSTGRES_URL=','')
      if ($dbUrl -match 'localhost|127\.0\.0\.1') {
        $dbUrl = $dbUrl -replace 'localhost','host.docker.internal'
        $dbUrl = $dbUrl -replace '127\.0\.0\.1','host.docker.internal'
        $overrideArgs += @('-e',"NOTIFICATIONS_POSTGRES_URL=$dbUrl")
      }
    }
    # Override JWKS URL to use host.docker.internal for auth service (always override for Docker)
    # Note: SecurityConfig is nested, so env vars are NOTIFICATIONS_SECURITY_JWKS_URL
    $jwksMatch = Select-String -Path $ENV_FILE -Pattern '^(?i)NOTIFICATIONS_(SECURITY_)?JWKS_URL=' -SimpleMatch:$false
    if ($jwksMatch) {
      $jwksLine = if ($jwksMatch -is [System.Array]) { $jwksMatch[0].Line } else { $jwksMatch.Line }
      $jwksUrl = ($jwksLine -replace '^(?i)NOTIFICATIONS_JWKS_URL=','')
      # Keep auth.codevertex.local since we'll map it via --add-host
      # Just ensure port :4101 is present
      if ($jwksUrl -notmatch ':4101') {
        $jwksUrl = $jwksUrl -replace '(auth\.codevertex\.local)(/|$)','$1:4101$2'
      }
      # Replace localhost/127.0.0.1 with auth.codevertex.local (mapped via --add-host)
      $jwksUrl = $jwksUrl -replace 'localhost:4101','auth.codevertex.local:4101'
      $jwksUrl = $jwksUrl -replace '127\.0\.0\.1:4101','auth.codevertex.local:4101'
      $jwksUrl = $jwksUrl -replace 'localhost','auth.codevertex.local'
      $jwksUrl = $jwksUrl -replace '127\.0\.0\.1','auth.codevertex.local'
      # Keep https for auth service (it runs HTTPS only)
      # SecurityConfig is nested, so use NOTIFICATIONS_SECURITY_JWKS_URL
      $overrideArgs += @('-e',"NOTIFICATIONS_SECURITY_JWKS_URL=$jwksUrl")
      # Also override issuer to match
      $issuerUrl = $jwksUrl -replace '/api/v1/\.well-known/jwks\.json$',''
      $overrideArgs += @('-e',"NOTIFICATIONS_SECURITY_JWT_ISSUER=$issuerUrl")
    } else {
      # Default JWKS URL override if not set in .env (SecurityConfig is nested)
      # Use auth.codevertex.local (mapped via --add-host) with HTTPS
      $overrideArgs += @('-e','NOTIFICATIONS_SECURITY_JWKS_URL=https://auth.codevertex.local:4101/api/v1/.well-known/jwks.json')
      $overrideArgs += @('-e','NOTIFICATIONS_SECURITY_JWT_ISSUER=https://auth.codevertex.local:4101')
    }
  } else {
    # Default JWKS URL override if .env doesn't exist (SecurityConfig is nested)
    # Use auth.codevertex.local (mapped via --add-host) with HTTPS
    $overrideArgs += @('-e','NOTIFICATIONS_SECURITY_JWKS_URL=https://auth.codevertex.local:4101/api/v1/.well-known/jwks.json')
    $overrideArgs += @('-e','NOTIFICATIONS_SECURITY_JWT_ISSUER=https://auth.codevertex.local:4101')
  }
  $overrideArgs += @('-e','NOTIFICATIONS_REDIS_ADDR=host.docker.internal:6379')
  return ,$overrideArgs
}

function Start-ServiceContainerInstance {
  param(
    [switch] $Recreate
  )

  Test-CommandAvailable "docker"

  if ($Recreate -and (Test-ContainerExists $SERVICE_CONTAINER_NAME)) {
    Write-Log "Removing existing container $SERVICE_CONTAINER_NAME"
    docker rm -f $SERVICE_CONTAINER_NAME | Out-Null
  }

  $overrideArgs = New-OverrideEnvVars
  $templatesHostPath = (Resolve-Path -LiteralPath $TEMPLATES_DIR).Path

  $tempEnvFile = $ENV_FILE
  if (Test-Path -LiteralPath $ENV_FILE) {
    $tempEnvFile = Join-Path $ROOT_DIR ".env.docker"
    $envContent = Get-Content -LiteralPath $ENV_FILE | Where-Object {
      ($_ -notmatch '^(?i)NOTIFICATIONS_(SECURITY_)?JWKS_URL=') -and
      ($_ -notmatch '^(?i)NOTIFICATIONS_(SECURITY_)?JWT_ISSUER=')
    }
    Set-Content -LiteralPath $tempEnvFile -Value $envContent -Encoding UTF8
  }

  $dockerArgs = @(
    'run',
    '-d',
    '--name', $SERVICE_CONTAINER_NAME,
    '-p', "${APP_PORT}:${APP_PORT}",
    '--env-file', $tempEnvFile,
    '--add-host', 'auth.codevertex.local:host-gateway'
  ) + $overrideArgs + @(
    '-v', "${templatesHostPath}:/app/templates"
  )
  
  # Mount TLS certificates if directory exists and contains cert files
  if (Test-Path -LiteralPath $CERTS_DIR -PathType Container) {
    $certFiles = Get-ChildItem -Path $CERTS_DIR -Filter "*.pem" -ErrorAction SilentlyContinue
    if ($certFiles.Count -gt 0) {
      $certsHostPath = (Resolve-Path -LiteralPath $CERTS_DIR).Path
      $dockerArgs += @('-v', "${certsHostPath}:/app/config/certs")
      Write-Log "Mounting TLS certificates from $certsHostPath"
    }
  }
  
  $dockerArgs += $SERVICE_IMAGE
  Write-Log "Running container $SERVICE_CONTAINER_NAME on :$APP_PORT"
  try {
    & docker @dockerArgs | Out-Null
  } finally {
    if ($tempEnvFile -and (Test-Path -LiteralPath $tempEnvFile) -and ($tempEnvFile -like '*.env.docker')) {
      Remove-Item -LiteralPath $tempEnvFile -ErrorAction SilentlyContinue
    }
  }
}

function Confirm-ServiceContainer {
  Test-CommandAvailable "docker"
  $exists = Test-ContainerExists $SERVICE_CONTAINER_NAME
  $running = Test-ContainerRunning $SERVICE_CONTAINER_NAME

  if (-not $exists) {
    Write-Log "Notifications container not found; building image and running new container"
    Invoke-ServiceImageBuild
    Publish-ServiceImage
    Start-ServiceContainerInstance -Recreate
    return
  }

  if (-not $running) {
    Write-Log "Starting existing notifications container"
    docker start $SERVICE_CONTAINER_NAME | Out-Null
  } else {
    Write-Log "Notifications container already running"
  }
}

function Show-Usage {
  @"
Usage: .\local-deploy.ps1 [command]

Commands:
  init         Ensure .env exists (from config\app.env.example)
  redis        Ensure Redis (Docker) is running
  build        Build the Docker image
  up           Init, Redis, then ensure container is running
  run          Rebuild image and recreate container
  help         Show this help

Examples:
  .\local-deploy.ps1 up
  .\local-deploy.ps1 run
"@ | Write-Host
}

$Command = if ($args.Count -ge 1) { $args[0].ToLowerInvariant() } else { "up" }

switch ($Command) {
  "init" {
    Initialize-EnvFile
  }
  "redis" {
    Start-RedisDependency
  }
  "build" {
    Initialize-EnvFile
    Invoke-ServiceImageBuild
  }
  "run" {
    Initialize-EnvFile
    Start-RedisDependency
    Invoke-DatabaseMigrations
    Invoke-DataSeed
    Invoke-ServiceImageBuild
    Publish-ServiceImage
    Start-ServiceContainerInstance -Recreate
  }
  "up" {
    Initialize-EnvFile
    Start-RedisDependency
    Invoke-DatabaseMigrations
    Invoke-DataSeed
    Invoke-ServiceImageBuild
    Confirm-ServiceContainer
  }
  "help" { Show-Usage }
  default {
    Show-Usage
    exit 1
  }
}


