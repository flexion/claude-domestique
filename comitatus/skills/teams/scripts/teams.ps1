# Dot-source this file in the agent's private PowerShell process after importing
# Microsoft.Graph.Authentication. Authentication stays with the Graph SDK.

function Assert-ComitatusTeamsContext {
  $context = Get-MgContext -ErrorAction Stop
  if ($null -eq $context -or $context.ContextScope -ne 'Process') {
    throw 'Teams messaging requires process-scoped authentication. Use Connect-MgGraph -ContextScope Process in a private PowerShell process first.'
  }
}

function Get-ComitatusTeamsMessage {
  [CmdletBinding(DefaultParameterSetName = 'List')]
  param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$ChatId,

    [Parameter(ParameterSetName = 'List')]
    [ValidateRange(1, 50)]
    [int]$Top = 10,

    [Parameter(Mandatory, ParameterSetName = 'Message')]
    [ValidateNotNullOrEmpty()]
    [string]$MessageId
  )

  Assert-ComitatusTeamsContext
  $uri = 'https://graph.microsoft.com/v1.0/chats/' + [uri]::EscapeDataString($ChatId) + '/messages'
  if ($PSCmdlet.ParameterSetName -eq 'Message') {
    $uri += '/' + [uri]::EscapeDataString($MessageId)
  } else {
    $uri += '?$top=' + $Top
  }
  Invoke-MgGraphRequest -Method GET -Uri $uri -ErrorAction Stop
}

function Send-ComitatusTeamsMessage {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$ChatId,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$Text
  )

  Assert-ComitatusTeamsContext
  $uri = 'https://graph.microsoft.com/v1.0/chats/' + [uri]::EscapeDataString($ChatId) + '/messages'
  $body = @{ body = @{ contentType = 'text'; content = $Text } } | ConvertTo-Json -Depth 4 -Compress
  Invoke-MgGraphRequest -Method POST -Uri $uri -Body $body -ContentType 'application/json' -ErrorAction Stop
}
