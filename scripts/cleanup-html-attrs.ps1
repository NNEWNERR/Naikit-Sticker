# Post-pass cleanup after the ion-tag replacement:
#   1. Merge duplicate class="..." attributes left behind by the previous script
#      (e.g. <div class="nk-content" class="bg-surface-2"> -> class="nk-content bg-surface-2")
#   2. Remove Ionic-only CSS classes (ion-padding, ion-no-border, etc.) from
#      class lists.
#   3. Remove orphan ion-* attributes (expand="block", mode="md", fill="solid",
#      color="primary"/"danger"/...) that mean nothing without Ionic.

$files = Get-ChildItem -Recurse -Path 'src\app' -Filter '*.html'

$count = 0
foreach ($f in $files) {
  $txt = [IO.File]::ReadAllText($f.FullName)
  $orig = $txt

  # Merge duplicate class attributes within a single tag:
  # <tag class="A" ... class="B"> -> <tag class="A B" ...>
  $txt = [regex]::Replace($txt, '<([a-zA-Z][\w-]*)([^>]*?)\sclass="([^"]*)"([^>]*?)\sclass="([^"]*)"([^>]*?)>', '<$1$2 class="$3 $5"$4$6>')

  # Remove Ionic-only utility classes from class lists.
  $ionClasses = @('ion-padding', 'ion-padding-top', 'ion-padding-bottom',
                  'ion-padding-start', 'ion-padding-end', 'ion-padding-vertical',
                  'ion-padding-horizontal', 'ion-no-padding', 'ion-no-border',
                  'ion-margin', 'ion-margin-top', 'ion-margin-bottom',
                  'ion-text-center', 'ion-text-left', 'ion-text-right',
                  'ion-justify-content-center', 'ion-align-items-center',
                  'ion-activatable', 'ion-focusable')
  foreach ($cls in $ionClasses) {
    $txt = $txt -replace ('\b' + [regex]::Escape($cls) + '\b'), ''
  }

  # Collapse any double-spaces / leftover empty class=""
  $txt = $txt -replace '\sclass="\s*"', ''
  $txt = [regex]::Replace($txt, 'class="([^"]*?)"', {
    param($m)
    $cleaned = ($m.Groups[1].Value -replace '\s+', ' ').Trim()
    if ($cleaned -eq '') { return '' }
    return 'class="' + $cleaned + '"'
  })

  # Drop ion-only attributes that mean nothing without Ionic.
  # expand="block", fill="solid"/"outline"/"clear", mode="md"/"ios",
  # color="primary"/etc., slot="start"/"end", show-clear-button="focus"
  $txt = $txt -replace '\sexpand="[^"]*"', ''
  $txt = $txt -replace '\sfill="[^"]*"', ''
  $txt = $txt -replace '\smode="(md|ios)"', ''
  $txt = $txt -replace '\scolor="(primary|secondary|tertiary|success|warning|danger|light|medium|dark)"', ''
  $txt = $txt -replace '\sslot="[^"]*"', ''
  $txt = $txt -replace '\sshow-clear-button="[^"]*"', ''
  $txt = $txt -replace '\sshape="[^"]*"', ''
  # ion-segment / ion-segment-button related
  $txt = $txt -replace '\(ionInput\)=', '(input)='
  $txt = $txt -replace '\(ionChange\)=', '(change)='
  $txt = $txt -replace '\(ionBlur\)=', '(blur)='
  $txt = $txt -replace '\(ionFocus\)=', '(focus)='

  if ($txt -ne $orig) {
    [IO.File]::WriteAllText($f.FullName, $txt)
    $count++
  }
}

Write-Host "Done - cleaned attrs/classes in $count files"
