$outFile = '_bmad-output/slide-shape-map-2026-03-20.txt'
if (Test-Path $outFile) { Remove-Item $outFile -Force }
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open((Resolve-Path 'PPT/深圳智信方略工程咨询有限公司-V2026v2.1（带水印）.pptx').Path, $true, $true, $false)
foreach ($i in 2,3,14,15,16,17,18,20) {
  Add-Content -Path $outFile -Value "--- Slide $i ---"
  $slide = $pres.Slides.Item($i)
  for ($j=1; $j -le $slide.Shapes.Count; $j++) {
    $shape = $slide.Shapes.Item($j)
    $name = '' ; $type=''; $left=''; $top=''; $width=''; $height=''; $text=''
    try { $name = [string]$shape.Name } catch {}
    try { $type = [string]$shape.Type } catch {}
    try { $left = ('{0:N1}' -f [double]$shape.Left) } catch {}
    try { $top = ('{0:N1}' -f [double]$shape.Top) } catch {}
    try { $width = ('{0:N1}' -f [double]$shape.Width) } catch {}
    try { $height = ('{0:N1}' -f [double]$shape.Height) } catch {}
    try { if ($shape.HasTextFrame -and $shape.TextFrame.HasText) { $text = $shape.TextFrame.TextRange.Text.Replace("`r",' ').Replace("`n",' ') } } catch {}
    Add-Content -Path $outFile -Value ("[$j] Name=$name | Type=$type | L=$left | T=$top | W=$width | H=$height | Text=$text")
  }
}
try { $pres.Close() } catch {}
$ppt.Quit()
Get-Content $outFile -TotalCount 300
