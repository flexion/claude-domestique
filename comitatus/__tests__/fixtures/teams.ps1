$ErrorActionPreference = 'Stop'
$inputData = $env:COMITATUS_TEAMS_TEST_INPUT | ConvertFrom-Json -AsHashtable
$calls = [System.Collections.Generic.List[object]]::new()
$env:COMITATUS_TEAMS_TENANT_ID = $inputData.tenantId
$env:COMITATUS_TEAMS_CHAT_ID = $inputData.chatId
$text = $inputData.text
$messageId = $inputData.messageId
$context = $null
$disconnected = 0

# Only installed SDK commands are replaced. The actual Markdown examples execute
# normally, without a plugin runtime helper, login or HTTP.
function Import-Module { param($Name) $script:imported = $Name }
function Get-Module {
  param([switch]$ListAvailable, $Name)
  if ($inputData.moduleMissing) { return $null }
  [pscustomobject]@{ Name = $Name; Version = '2.0.0' }
}
function Install-Module { $script:installAttempted = $true }
function Start-Sleep { }
function Connect-MgGraph {
  param($TenantId, $Scopes, [switch]$UseDeviceAuthentication, $ContextScope, [switch]$NoWelcome)
  $script:connection = @{ tenantId = $TenantId; scopes = $Scopes; device = $UseDeviceAuthentication.IsPresent; contextScope = $ContextScope }
  $script:context = @{ ContextScope = $ContextScope; Scopes = $inputData.grantedScopes ?? $Scopes }
}
function Get-MgContext { $script:context }
function Disconnect-MgGraph {
  $closed = $script:context
  $script:context = $null
  $script:disconnected++
  [pscustomobject]@{ ClientId = 'example-client'; TenantId = 'example-tenant'; Scopes = $closed.Scopes }
}

function Invoke-MgGraphRequest {
  param($Method, $Uri, $Body, $ContentType, $ErrorAction)
  $calls.Add(@{ method = $Method; uri = $Uri; body = $Body; contentType = $ContentType })
  if ($inputData.failMethod -eq $Method) { throw 'Graph test failure: 403' }
  if ($Method -eq 'POST') { return @{ id = 'sent-id' } }
  return @{
    value = @(
      @{ id = 'received-id'; messageType = 'message'; createdDateTime = '2026-01-01T00:00:00Z'; from = @{ user = @{ displayName = 'Peer' } }; body = @{ contentType = 'text'; content = "hello`r`nsecond line" } },
      @{ id = 'event-id'; messageType = 'unknownFutureValue'; createdDateTime = '2026-01-01T00:00:00Z'; from = $null; body = @{ contentType = 'html'; content = '<systemEventMessage/>' } }
    )
    '@odata.nextLink' = 'https://graph.microsoft.com/v1.0/next-page'
  }
}

# Output each example writes is captured as text so tests can see what an agent
# would see (one scope line on connect, nothing on disconnect). Dot-sourced at
# script scope so variables the examples set, such as $messagesUri, persist.
$errorText = $null
$connectOutput = @()
$disconnectOutput = @()
$actionOutput = @()
$conversationOutput = @()
try {
  if ($inputData.header) { . ([scriptblock]::Create($inputData.header)) | Out-Null }
  if ($inputData.examples.Prerequisites) { . ([scriptblock]::Create($inputData.examples.Prerequisites)) | Out-Null }
  $connectOutput = @(. ([scriptblock]::Create($inputData.examples.Connect)) | ForEach-Object { "$_" })
  if ($inputData.conversation) {
    $conversationOutput = @(. ([scriptblock]::Create($inputData.conversation)) | ForEach-Object { "$_" })
  }
  foreach ($action in $inputData.actions) {
    $actionOutput += @(. ([scriptblock]::Create($inputData.examples[$action])) | ForEach-Object { "$_" })
  }
} catch {
  $errorText = $_.Exception.Message
} finally {
  if ($connection) { $disconnectOutput = @(. ([scriptblock]::Create($inputData.examples.Disconnect)) | ForEach-Object { "$_" }) }
}
@{
  imported = $imported; connection = $connection; context = $context; disconnected = $disconnected
  calls = @($calls.ToArray()); page = $page; sent = $sent; error = $errorText
  connectOutput = @($connectOutput); disconnectOutput = @($disconnectOutput); actionOutput = @($actionOutput); conversationOutput = @($conversationOutput)
  installAttempted = [bool]$installAttempted; text = $text
  env = @{ tenantId = $env:COMITATUS_TEAMS_TENANT_ID; chatId = $env:COMITATUS_TEAMS_CHAT_ID }
} | ConvertTo-Json -Depth 20 -Compress
