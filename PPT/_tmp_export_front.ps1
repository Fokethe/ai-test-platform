$out='PPT/_tmp_front_slides'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path $out | Out-Null
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open((Resolve-Path 'PPT/深圳智信方略工程咨询有限公司-V2026v2.1（带水印）.pptx').Path, $true, $true, $false)
foreach ($i in 1,2,3,4,5) {
  $pres.Slides.Item($i).Export((Join-Path (Resolve-Path $out) ("slide-$i.png")), 'PNG', 1600, 900)
}
try { $pres.Close() } catch {}
$ppt.Quit()
Get-ChildItem $out | Select-Object Name,Length
