$outFile = '_bmad-output/slide20-table-map-2026-03-20.txt'
if (Test-Path $outFile) { Remove-Item $outFile -Force }
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open((Resolve-Path 'PPT/深圳智信方略工程咨询有限公司-V2026v2.1（带水印）.pptx').Path, $true, $true, $false)
$table = $pres.Slides.Item(20).Shapes.Item('Table 2').Table
Add-Content $outFile ("Rows=" + $table.Rows.Count + ", Cols=" + $table.Columns.Count)
for ($r=1; $r -le [Math]::Min($table.Rows.Count,6); $r++) {
  $vals = @()
  for ($c=1; $c -le $table.Columns.Count; $c++) {
    $text=''
    try { $text = $table.Cell($r,$c).Shape.TextFrame.TextRange.Text.Replace("`r",' ').Replace("`n",' ') } catch {}
    $vals += "[$c] $text"
  }
  Add-Content $outFile (("Row " + $r + ': ') + ($vals -join ' | '))
}
try { $pres.Close() } catch {}
$ppt.Quit()
Get-Content $outFile
