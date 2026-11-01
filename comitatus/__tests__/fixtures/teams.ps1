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
function Connect-MgGraph {
  param($TenantId, $Scopes, [switch]$UseDeviceAuthentication, $ContextScope, [switch]$NoWelcome)
  $script:connection = @{ tenantId = $TenantId; scopes = $Scopes; device = $UseDeviceAuthentication.IsPresent; contextScope = $ContextScope }
  $script:context = @{ ContextScope = $ContextScope }
}
function Get-MgContext { $script:context }
function Disconnect-MgGraph { $script:context = $null; $script:disconnected++ }

function Invoke-MgGraphRequest {
  param($Method, $Uri, $Body, $ContentType, $ErrorAction)
  $calls.Add(@{ method = $Method; uri = $Uri; body = $Body; contentType = $ContentType })
  if ($inputData.failMethod -eq $Method) { throw 'Graph test failure: 403' }
  if ($Method -eq 'POST') { return @{ id = 'sent-id' } }
  return @{
    value = @(@{ id = 'received-id'; body = @{ content = 'hello' } })
    '@odata.nextLink' = 'https://graph.microsoft.com/v1.0/next-page'
  }
}

$errorText = $null
try {
  . ([scriptblock]::Create($inputData.examples.Connect)) | Out-Null
  foreach ($action in $inputData.actions) {
    . ([scriptblock]::Create($inputData.examples[$action])) | Out-Null
  }
} catch {
  $errorText = $_.Exception.Message
} finally {
  . ([scriptblock]::Create($inputData.examples.Disconnect)) | Out-Null
}
@{ imported = $imported; connection = $connection; context = $context; disconnected = $disconnected; calls = @($calls.ToArray()); page = $page; sent = $sent; error = $errorText } | ConvertTo-Json -Depth 20 -Compress
