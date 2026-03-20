$outFile = '_bmad-output/slide1-shape-map-2026-03-20.txt'
if (Test-Path $outFile) { Remove-Item $outFile -Force }
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open((Resolve-Path 'PPT/深圳智信方略工程咨询有限公司-V2026v2.1（带水印）.pptx').Path, $true, $true, $false)
$slide = $pres.Slides.Item(1)
for ($j=1; $j -le $slide.Shapes.Count; $j++) {
  $shape = $slide.Shapes.Item($j)
  $text=''
  try { if ($shape.HasTextFrame -and $shape.TextFrame.HasText) { $text=$shape.TextFrame.TextRange.Text.Replace("`r",' ').Replace("`n",' ') } } catch {}
  Add-Content $outFile -Value ("[$j] Name=" + $shape.Name + " | Type=" + $shape.Type + " | Text=" + $text)
}
try { $pres.Close() } catch {}
$ppt.Quit()
Get-Content $outFile
