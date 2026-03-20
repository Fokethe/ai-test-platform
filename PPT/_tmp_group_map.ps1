$outFile = '_bmad-output/slide-group-map-2026-03-20.txt'
if (Test-Path $outFile) { Remove-Item $outFile -Force }
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open((Resolve-Path 'PPT/深圳智信方略工程咨询有限公司-V2026v2.1（带水印）.pptx').Path, $true, $true, $false)
$targets = @(
  @{Slide=14; Group='Group 50'},
  @{Slide=15; Group='Group 2'},
  @{Slide=16; Group='Group 24'},
  @{Slide=17; Group='Group 53'},
  @{Slide=18; Group='Group 54'}
)
foreach ($t in $targets) {
  Add-Content -Path $outFile -Value "--- Slide $($t.Slide) / $($t.Group) ---"
  $group = $pres.Slides.Item($t.Slide).Shapes.Item($t.Group)
  for ($j=1; $j -le $group.GroupItems.Count; $j++) {
    $shape = $group.GroupItems.Item($j)
    $name = '' ; $type=''; $left=''; $top=''; $width=''; $height=''; $text=''
    try { $name = [string]$shape.Name } catch {}
    try { $type = [string]$shape.Type } catch {}
    try { $left = ('{0:N1}' -f [double]$shape.Left) } catch {}
    try { $top = ('{0:N1}' -f [double]$shape.Top) } catch {}
    try { $width = ('{0:N1}' -f [double]$shape.Width) } catch {}
    try { $height = ('{0:N1}' -f [double]$shape.Height) } catch {}
    try { if ($shape.HasTextFrame -and $shape.TextFrame.HasText) { $text = $shape.TextFrame.TextRange.Text.Replace("`r",' ').Replace("`n",' ') } } catch {}
    Add-Content -Path $outFile -Value ("[$j] Name=$name | Type=$type | L=$left | T=$top | W=$width | H=$height | Text=$text")
    if ($shape.Type -eq 6) {
      for ($k=1; $k -le $shape.GroupItems.Count; $k++) {
        $sub = $shape.GroupItems.Item($k)
        $sname='';$stype='';$stext=''
        try { $sname=[string]$sub.Name } catch {}
        try { $stype=[string]$sub.Type } catch {}
        try { if ($sub.HasTextFrame -and $sub.TextFrame.HasText) { $stext=$sub.TextFrame.TextRange.Text.Replace("`r",' ').Replace("`n",' ') } } catch {}
        Add-Content -Path $outFile -Value ("    - [$k] Name=$sname | Type=$stype | Text=$stext")
      }
    }
  }
}
try { $pres.Close() } catch {}
$ppt.Quit()
Get-Content $outFile -TotalCount 500
