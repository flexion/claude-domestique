$ErrorActionPreference = 'Stop'
$inputData = $env:COMITATUS_TEAMS_TEST_INPUT | ConvertFrom-Json -AsHashtable
$calls = [System.Collections.Generic.List[object]]::new()

# Only the Graph SDK boundary is replaced; PowerShell binding, URI encoding,
# serialization and the shipped helpers execute normally. No login or HTTP.
function Get-MgContext {
  if ($inputData.context -eq 'none') { return $null }
  $scope = if ($inputData.context) { $inputData.context } else { 'Process' }
  [pscustomobject]@{ ContextScope = $scope }
}

function Invoke-MgGraphRequest {
  param($Method, $Uri, $Body, $ContentType, $ErrorAction)
  $calls.Add(@{ method = $Method; uri = $Uri; body = $Body; contentType = $ContentType })
  if ($inputData.fail) { throw 'Graph test failure: 403' }
  if ($Method -eq 'POST') { return @{ id = 'sent-id' } }
  return @{
    value = @(@{ id = 'received-id'; body = @{ content = 'hello' } })
    '@odata.nextLink' = 'https://graph.microsoft.com/v1.0/next-page'
  }
}

# A missing script is a setup failure, not a successful error-path test.
. $env:COMITATUS_TEAMS_TEST_SCRIPT
$result = $null
$errorText = $null
try {
  $params = @{ ChatId = $inputData.chatId }
  if ($inputData.action -eq 'send') {
    $result = Send-ComitatusTeamsMessage @params -Text $inputData.text
  } else {
    if ($inputData.ContainsKey('top')) { $params.Top = $inputData.top }
    if ($inputData.ContainsKey('messageId')) { $params.MessageId = $inputData.messageId }
    $result = Get-ComitatusTeamsMessage @params
  }
} catch {
  $errorText = $_.Exception.Message
}
@{ result = $result; error = $errorText; calls = @($calls.ToArray()) } | ConvertTo-Json -Depth 20 -Compress
