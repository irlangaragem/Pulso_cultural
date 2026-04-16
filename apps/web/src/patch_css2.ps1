$f = Get-Content "visitor.css" -Raw

$f = $f -replace '(\.v-wordmark-sub \{[^}]*?)color: #FFFFFF;([^}]*?\})', '$1color: #A8969A;$2'
$f = $f -replace '(\.v-wordmark-sub \{[^}]*?)color: #F5ECE4;([^}]*?\})', '$1color: #A8969A;$2'

$f = $f -replace '(\.v-chip \{[^}]*?)color: #FFFFFF;([^}]*?\})', '$1color: #A8969A;$2'

Set-Content "visitor.css" $f -NoNewline
Write-Host "Done."
