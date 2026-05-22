# Replace <app-header [title]="X" [modal]="true">...</app-header> with a
# brutal-styled header bar that closes the host modal via closeModal().

$files = @(
  'src\app\components\modals\setting-add\setting-add.component.html',
  'src\app\components\modals\setting-edit\setting-edit.component.html',
  'src\app\components\worksheet-preview-modal\worksheet-preview-modal.component.html',
  'src\app\pages\create-work-sheet\work-item-modal\work-item-modal.component.html'
)

$replacement = @'
<div class="flex items-center justify-between gap-3 px-4 py-3 bg-brand border-b-[3px] border-ink">
  <h1 class="text-h1 m-0 truncate">{{TITLE}}</h1>
  <button type="button" (click)="closeModal()" class="btn-ghost">ปิด ✕</button>
</div>
'@

foreach ($f in $files) {
  $path = Join-Path (Get-Location) $f
  if (-not (Test-Path $path)) { continue }
  $txt = [IO.File]::ReadAllText($path)

  # Two patterns: title as a binding, or as a literal.
  # 1) [title]="EXPR" [modal]="true"
  $txt = [regex]::Replace($txt, '<app-header\s+\[title\]="([^"]+)"\s+\[modal\]="true"\s*>\s*</app-header>', {
    param($m)
    return $replacement.Replace('{{TITLE}}', '{{ ' + $m.Groups[1].Value + ' }}')
  })
  # 2) title="literal" [modal]="true"
  $txt = [regex]::Replace($txt, '<app-header\s+title="([^"]+)"\s+\[modal\]="true"\s*>\s*</app-header>', {
    param($m)
    return $replacement.Replace('{{TITLE}}', $m.Groups[1].Value)
  })

  [IO.File]::WriteAllText($path, $txt)
}

Write-Host "Done - replaced <app-header> in modals"
