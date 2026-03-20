function Rgb([int]$r,[int]$g,[int]$b) { return $r + ($g * 256) + ($b * 65536) }
function Set-TextStyle($shape, $fontName, [double]$fontSize, [int]$rgb, [int]$bold) {
  if ($shape.HasTextFrame -and $shape.TextFrame.HasText) {
    $tr = $shape.TextFrame.TextRange
    $tr.Font.NameFarEast = $fontName
    $tr.Font.Name = $fontName
    $tr.Font.Size = $fontSize
    $tr.Font.Bold = $bold
    $tr.Font.Color.RGB = $rgb
  }
}
function Add-Textbox($slide, [double]$left, [double]$top, [double]$width, [double]$height, [string]$text, [double]$fontSize, [int]$rgb, [int]$bold, [string]$fontName = 'Microsoft YaHei UI') {
  $tb = $slide.Shapes.AddTextbox(1, $left, $top, $width, $height)
  $tb.TextFrame.WordWrap = -1
  $tb.TextFrame.AutoSize = 0
  $tb.TextFrame.MarginLeft = 2
  $tb.TextFrame.MarginRight = 2
  $tb.TextFrame.MarginTop = 1
  $tb.TextFrame.MarginBottom = 1
  $tb.TextFrame.TextRange.Text = $text
  Set-TextStyle $tb $fontName $fontSize $rgb $bold
  return $tb
}
function Add-RoundRect($slide, [double]$left, [double]$top, [double]$width, [double]$height, [int]$fillRgb, [int]$lineRgb, [double]$lineWeight = 1.0, [double]$transparency = 0) {
  $shape = $slide.Shapes.AddShape(5, $left, $top, $width, $height)
  $shape.Fill.ForeColor.RGB = $fillRgb
  $shape.Fill.Transparency = $transparency
  $shape.Line.ForeColor.RGB = $lineRgb
  $shape.Line.Weight = $lineWeight
  return $shape
}
function Add-Rect($slide, [double]$left, [double]$top, [double]$width, [double]$height, [int]$fillRgb, [int]$lineRgb, [double]$lineWeight = 1.0, [double]$transparency = 0) {
  $shape = $slide.Shapes.AddShape(1, $left, $top, $width, $height)
  $shape.Fill.ForeColor.RGB = $fillRgb
  $shape.Fill.Transparency = $transparency
  $shape.Line.ForeColor.RGB = $lineRgb
  $shape.Line.Weight = $lineWeight
  return $shape
}
function Add-TitleTab($slide, [double]$left, [double]$top, [double]$width, [double]$height, [string]$text, [int]$fillRgb, [int]$textRgb) {
  $tab = Add-Rect $slide $left $top $width $height $fillRgb $fillRgb 1 0
  $tab.Line.Visible = 0
  $tb = Add-Textbox $slide $left ($top + 4) $width $height $text 16 $textRgb -1
  $tb.TextFrame.TextRange.ParagraphFormat.Alignment = 2
  return $tab
}
function Add-OutlineBox($slide, [double]$left, [double]$top, [double]$width, [double]$height, [string]$text, [double]$fontSize = 11.5) {
  $box = Add-Rect $slide $left $top $width $height (Rgb 255 255 255) (Rgb 71 121 195) 1.6 0.18
  $tb = Add-Textbox $slide ($left + 8) ($top + 8) ($width - 16) ($height - 16) $text $fontSize (Rgb 16 63 120) 0
  return $box
}
function Add-FillBox($slide, [double]$left, [double]$top, [double]$width, [double]$height, [string]$title, [string]$body, [int]$fillRgb) {
  $box = Add-RoundRect $slide $left $top $width $height (Rgb 255 255 255) (Rgb 71 121 195) 1.2 0.12
  $titleBar = Add-Rect $slide ($left + 8) ($top + 8) ($width - 16) 26 $fillRgb $fillRgb 1 0
  $titleBar.Line.Visible = 0
  $titleText = Add-Textbox $slide ($left + 10) ($top + 10) ($width - 20) 22 $title 15 (Rgb 255 255 255) -1
  $titleText.TextFrame.TextRange.ParagraphFormat.Alignment = 2
  $bodyText = Add-Textbox $slide ($left + 10) ($top + 42) ($width - 20) ($height - 50) $body 11.5 (Rgb 16 63 120) 0
  return $box
}

$outFile = 'PPT/深圳智信方略工程咨询有限公司-V2026v2.1-第三方检测服务两页专题-v3.pptx'
Copy-Item 'PPT/深圳智信方略工程咨询有限公司-V2026v2.1（带水印）.pptx' $outFile -Force

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = -1
$pres = $ppt.Presentations.Open((Resolve-Path $outFile).Path, $false, $false, $false)
$null = $pres.Slides.Item(18).Duplicate()
$slide1 = $pres.Slides.Item(18)
$slide2 = $pres.Slides.Item(19)

# Keep title + certificate images on slide1.
for ($i = $slide1.Shapes.Count; $i -ge 1; $i--) {
  $shape = $slide1.Shapes.Item($i)
  if ($shape.Name -notin @('Title 1','Picture 47','Picture 53')) { $shape.Delete() }
}
# Keep only title on slide2.
for ($i = $slide2.Shapes.Count; $i -ge 1; $i--) {
  $shape = $slide2.Shapes.Item($i)
  if ($shape.Name -ne 'Title 1') { $shape.Delete() }
}

$darkBlue = Rgb 71 121 195
$cyan = Rgb 91 201 214
$white = Rgb 255 255 255
$deepText = Rgb 16 63 120
$lineBlue = Rgb 71 121 195
$softBlue = Rgb 208 229 248
$titleShape1 = $slide1.Shapes.Item('Title 1')
$titleShape2 = $slide2.Shapes.Item('Title 1')
$titleShape1.TextFrame.TextRange.Text = '第三方检测服务'
$titleShape2.TextFrame.TextRange.Text = '第三方检测服务'
Set-TextStyle $titleShape1 'Microsoft YaHei UI' 28 0 -1
Set-TextStyle $titleShape2 'Microsoft YaHei UI' 28 0 -1

# Slide 1: family-style capability page
$band1 = Add-RoundRect $slide1 34 98 899 70.9 $darkBlue $darkBlue 1
$band1.Line.Visible = 0
$band1.Shadow.Visible = -1
$bandTitle1 = Add-Textbox $slide1 160 112 650 40 '资质支撑   人员保障   标准执行   设备能力' 30 $white -1
$bandTitle1.TextFrame.TextRange.ParagraphFormat.Alignment = 2

# Qualification block using existing certificate pictures.
Add-TitleTab $slide1 52 188 185 34 '资质认证' $darkBlue $white | Out-Null
$qualBox = Add-Rect $slide1 40 226 246 226 $white $lineBlue 1.8 0.16
$qualText = Add-Textbox $slide1 52 234 220 40 '具备 CMA 资质，检测结果可作为项目验收与审计留痕的重要证明。' 12 $deepText 0
$qualText.TextFrame.TextRange.ParagraphFormat.Alignment = 1
$picA = $slide1.Shapes.Item('Picture 53')
$picB = $slide1.Shapes.Item('Picture 47')
$picA.Left = 56; $picA.Top = 285; $picA.Width = 102; $picA.Height = 145
$picB.Left = 168; $picB.Top = 285; $picB.Width = 102; $picB.Height = 145

# Four capability boxes in same-family structure.
Add-FillBox $slide1 320 188 280 110 '人员保障' '由工程师与技术专家协同实施，覆盖需求沟通、过程检测与结果复核。' $darkBlue | Out-Null
Add-FillBox $slide1 620 188 280 110 '标准执行' '按项目测评文件及国家、行业、地方现行技术规范实施检测，过程留痕可追溯。' $darkBlue | Out-Null
Add-FillBox $slide1 320 316 280 110 '测试类型' '聚焦功能、性能、安全、兼容及环境类检测，按项目需求灵活组合配置。' $cyan | Out-Null
Add-FillBox $slide1 620 316 280 110 '设备能力' '配备检测工具与仪器，保障数据准确、结果可靠、交付及时。' $cyan | Out-Null

$bottomBand1 = Add-RoundRect $slide1 34.5 471 899 37.7 $cyan $cyan 1
$bottomBand1.Line.Visible = 0
$bottomText1 = Add-Textbox $slide1 70 477 830 22 '服务原则：专业、规范、公正、独立' 20 (Rgb 24 74 118) -1
$bottomText1.TextFrame.TextRange.ParagraphFormat.Alignment = 2

# Slide 2: process and outputs page in monitoring-page family.
$band2 = Add-RoundRect $slide2 34 98 899 70.9 $darkBlue $darkBlue 1
$band2.Line.Visible = 0
$band2.Shadow.Visible = -1
$bandTitle2 = Add-Textbox $slide2 190 112 600 40 '测试流程   结果交付   场景支撑' 30 $white -1
$bandTitle2.TextFrame.TextRange.ParagraphFormat.Alignment = 2

# Left: test types
Add-TitleTab $slide2 42 184 136 34 '测试类型' $darkBlue $white | Out-Null
Add-Rect $slide2 40 224 140 74 $darkBlue $darkBlue 1 0 | Out-Null
$t1 = Add-Textbox $slide2 44 242 132 34 '功能检测' 18 $white -1; $t1.TextFrame.TextRange.ParagraphFormat.Alignment = 2
Add-Rect $slide2 40 310 140 74 $darkBlue $darkBlue 1 0 | Out-Null
$t2 = Add-Textbox $slide2 44 328 132 34 '性能检测' 18 $white -1; $t2.TextFrame.TextRange.ParagraphFormat.Alignment = 2
Add-Rect $slide2 40 396 140 74 $darkBlue $darkBlue 1 0 | Out-Null
$t3 = Add-Textbox $slide2 44 414 132 34 '安全检测' 18 $white -1; $t3.TextFrame.TextRange.ParagraphFormat.Alignment = 2

# Center: process support bar and four stage tabs.
$supportBar = Add-RoundRect $slide2 194 176 566 32 $cyan $cyan 1
$supportBar.Line.Visible = 0
$supportText = Add-Textbox $slide2 212 181 530 22 '执行依据：项目测评文件、国家 / 行业 / 地方现行规范' 15 (Rgb 16 63 120) -1
$supportText.TextFrame.TextRange.ParagraphFormat.Alignment = 2

$tabY = 220
$boxY = 254
$tabW = 124
$boxW = 124
$gap = 14
$startX = 194
$stages = @(
  @{Name='需求确认'; Body='明确检测对象、范围、约束条件与关键要求。'},
  @{Name='方案准备'; Body='确认检测依据、实施方法、计划安排与资源配置。'},
  @{Name='检测实施'; Body='开展测试执行、记录留痕、问题识别与结果复核。'},
  @{Name='报告交付'; Body='输出原始记录、问题清单及检测 / 测评报告。'}
)
for ($idx = 0; $idx -lt $stages.Count; $idx++) {
  $x = $startX + ($idx * ($tabW + $gap))
  Add-TitleTab $slide2 $x $tabY $tabW 28 $stages[$idx].Name $darkBlue $white | Out-Null
  Add-OutlineBox $slide2 $x $boxY $boxW 132 $stages[$idx].Body 11 | Out-Null
}

# Right: outputs
Add-TitleTab $slide2 782 184 136 34 '成果输出' $darkBlue $white | Out-Null
Add-Rect $slide2 780 224 140 74 $darkBlue $darkBlue 1 0 | Out-Null
$o1 = Add-Textbox $slide2 784 240 132 40 '原始记录' 18 $white -1; $o1.TextFrame.TextRange.ParagraphFormat.Alignment = 2
Add-Rect $slide2 780 310 140 74 $darkBlue $darkBlue 1 0 | Out-Null
$o2 = Add-Textbox $slide2 784 326 132 40 '问题清单' 18 $white -1; $o2.TextFrame.TextRange.ParagraphFormat.Alignment = 2
Add-Rect $slide2 780 396 140 74 $darkBlue $darkBlue 1 0 | Out-Null
$o3 = Add-Textbox $slide2 784 412 132 40 '检测报告' 18 $white -1; $o3.TextFrame.TextRange.ParagraphFormat.Alignment = 2

$bottomBand2 = Add-RoundRect $slide2 34.5 471 899 37.7 $cyan $cyan 1
$bottomBand2.Line.Visible = 0
$bottomText2 = Add-Textbox $slide2 72 477 824 22 '适用于软件系统、机房环境、弱电智能化及专项验收等场景' 19 (Rgb 24 74 118) -1
$bottomText2.TextFrame.TextRange.ParagraphFormat.Alignment = 2

$pres.Save()
$pres.Close()
$ppt.Quit()

# Export final slides for review
$out='PPT/_tmp_v3_review'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path $out | Out-Null
$ppt2 = New-Object -ComObject PowerPoint.Application
$pres2 = $ppt2.Presentations.Open((Resolve-Path $outFile).Path, $true, $true, $false)
foreach ($i in 18,19) { $pres2.Slides.Item($i).Export((Join-Path (Resolve-Path $out) ("slide-$i.png")), 'PNG', 1600, 900) }
try { $pres2.Close() } catch {}
$ppt2.Quit()
Get-Item $outFile | Select-Object FullName,Length,LastWriteTime
Get-ChildItem $out | Select-Object Name,Length
