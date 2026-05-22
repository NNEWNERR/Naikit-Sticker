$files = Get-ChildItem -Recurse -Path 'src\app' -Filter '*.ts' |
  Where-Object { -not $_.Name.EndsWith('.spec.ts') } |
  Where-Object { Select-String -Path $_.FullName -Pattern '@ionic/angular' -Quiet }

$count = 0
foreach ($f in $files) {
  $txt = [IO.File]::ReadAllText($f.FullName)

  # Pattern: import { ... } from '@ionic/angular';
  $pattern = "import\s*\{([^}]+)\}\s*from\s*'@ionic/angular';"
  $regex = [regex]::new($pattern)

  $txt = $regex.Replace($txt, {
    param($m)
    $inner = $m.Groups[1].Value
    $names = ($inner -split ',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }

    $modal = @($names | Where-Object { $_ -eq 'ModalController' })
    $serviceShims = @($names | Where-Object { $_ -eq 'ToastController' -or $_ -eq 'AlertController' })

    $lines = @()
    if ($modal.Count -gt 0) {
      $lines += "import { " + ($modal -join ', ') + " } from 'src/app/services/modal.service';"
    }
    if ($serviceShims.Count -gt 0) {
      $lines += "import { " + ($serviceShims -join ', ') + " } from 'src/app/services/service.service';"
    }
    # IonicModule / IonicRouteStrategy / LoadingController etc — drop entirely.

    return [string]::Join("`r`n", $lines)
  })

  [IO.File]::WriteAllText($f.FullName, $txt)
  $count++
}

Write-Host "Done - replaced ionic imports in $count files"
