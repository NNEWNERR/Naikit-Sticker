$files = Get-ChildItem -Recurse -Path 'src\app' -Filter '*.html'

$count = 0
foreach ($f in $files) {
  $txt = [IO.File]::ReadAllText($f.FullName)
  $orig = $txt

  # Container tags -> div (preserve attributes/content)
  $txt = $txt -replace '<ion-app([\s>])', '<div class="nk-app-root"$1'
  $txt = $txt -replace '</ion-app>', '</div>'

  $txt = $txt -replace '<ion-content([\s>])', '<div class="nk-content"$1'
  $txt = $txt -replace '</ion-content>', '</div>'

  $txt = $txt -replace '<ion-router-outlet([\s>])', '<router-outlet$1'
  $txt = $txt -replace '</ion-router-outlet>', '</router-outlet>'

  $txt = $txt -replace '<ion-footer([\s>])', '<div class="nk-footer"$1'
  $txt = $txt -replace '</ion-footer>', '</div>'

  $txt = $txt -replace '<ion-toolbar([\s>])', '<div class="nk-toolbar"$1'
  $txt = $txt -replace '</ion-toolbar>', '</div>'

  $txt = $txt -replace '<ion-buttons([\s>])', '<div class="nk-buttons"$1'
  $txt = $txt -replace '</ion-buttons>', '</div>'

  $txt = $txt -replace '<ion-text([\s>])', '<span$1'
  $txt = $txt -replace '</ion-text>', '</span>'

  $txt = $txt -replace '<ion-img([\s>])', '<img$1'
  $txt = $txt -replace '</ion-img>', ''

  $txt = $txt -replace '<ion-label([\s>])', '<span$1'
  $txt = $txt -replace '</ion-label>', '</span>'

  $txt = $txt -replace '<ion-list([\s>])', '<div class="nk-list"$1'
  $txt = $txt -replace '</ion-list>', '</div>'

  $txt = $txt -replace '<ion-item([\s>])', '<div class="nk-item"$1'
  $txt = $txt -replace '</ion-item>', '</div>'

  # ion-button -> button (close tag too)
  $txt = $txt -replace '<ion-button([\s>])', '<button$1'
  $txt = $txt -replace '</ion-button>', '</button>'

  # ion-icon -> drop entirely (use emoji in redesign)
  $txt = $txt -replace '<ion-icon[^>]*></ion-icon>', ''
  $txt = $txt -replace '<ion-icon[^/]*/>', ''
  $txt = $txt -replace '<ion-icon[^>]*>', ''

  if ($txt -ne $orig) {
    [IO.File]::WriteAllText($f.FullName, $txt)
    $count++
  }
}

Write-Host "Done - replaced ion-* tags in $count files"
