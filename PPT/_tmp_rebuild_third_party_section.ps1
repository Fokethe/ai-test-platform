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
  $tb.TextFrame.MarginLeft = 0
  $tb.TextFrame.MarginRight = 0
  $tb.TextFrame.MarginTop = 0
  $tb.TextFrame.MarginBottom = 0
  $tb.TextFrame.TextRange.Text = $text
  Set-TextStyle $tb $fontName $fontSize $rgb $bold
  return $tb
}

function Add-RoundRect($slide, [double]$left, [double]$top, [double]$width, [double]$height, [int]$fillRgb, [int]$lineRgb, [double]$lineWeight = 1.0) {
  $shape = $slide.Shapes.AddShape(5, $left, $top, $width, $height)
  $shape.Fill.ForeColor.RGB = $fillRgb
  $shape.Line.ForeColor.RGB = $lineRgb
  $shape.Line.Weight = $lineWeight
  return $shape
}

function Add-Rect($slide, [double]$left, [double]$top, [double]$width, [double]$height, [int]$fillRgb, [int]$lineRgb, [double]$lineWeight = 1.0) {
  $shape = $slide.Shapes.AddShape(1, $left, $top, $width, $height)
  $shape.Fill.ForeColor.RGB = $fillRgb
  $shape.Line.ForeColor.RGB = $lineRgb
  $shape.Line.Weight = $lineWeight
  return $shape
}

function Add-Card($slide, [double]$left, [double]$top, [double]$width, [double]$height, [string]$title, [string]$body, [int]$accentRgb) {
  $card = Add-RoundRect $slide $left $top $width $height (Rgb 255 255 255) (Rgb 210 225 244) 1.2
  $card.Fill.Transparency = 0
  $bar = Add-Rect $slide ($left + 14) ($top + 12) 52 4 $accentRgb $accentRgb 0.5
  $bar.Line.Visible = 0
  $titleBox = Add-Textbox $slide ($left + 14) ($top + 22) ($width - 28) 22 $title 15 (Rgb 28 52 84) -1
  $bodyBox = Add-Textbox $slide ($left + 14) ($top + 44) ($width - 28) ($height - 54) $body 10.5 (Rgb 66 84 108) 0
  $bodyBox.TextFrame.MarginTop = 2
}

function Add-BulletList($slide, [double]$left, [double]$top, [double]$width, [double]$height, [string[]]$items, [double]$fontSize, [int]$rgb, [string]$fontName = 'Microsoft YaHei UI') {
  $tb = $slide.Shapes.AddTextbox(1, $left, $top, $width, $height)
  $tf = $tb.TextFrame
  $tf.WordWrap = -1
  $tf.AutoSize = 0
  $tf.MarginLeft = 0
  $tf.MarginRight = 0
  $tf.MarginTop = 0
  $tf.MarginBottom = 0
  $first = $true
  foreach ($item in $items) {
    if ($first) {
      $p = $tf.TextRange.Paragraphs(1)
      $p.Text = [char]0x2022 + ' ' + $item
      $first = $false
    } else {
      $p = $tf.TextRange.Paragraphs().Add()
      $p.Text = [char]0x2022 + ' ' + $item
    }
    $p.Font.NameFarEast = $fontName
    $p.Font.Name = $fontName
    $p.Font.Size = $fontSize
    $p.Font.Bold = 0
    $p.Font.Color.RGB = $rgb
    $p.ParagraphFormat.SpaceAfter = 2
    $p.ParagraphFormat.SpaceBefore = 0
    $p.ParagraphFormat.Bullet.Visible = 0
  }
  return $tb
}

$outFile = 'PPT/深圳智信方略工程咨询有限公司-V2026v2.1-第三方检测服务两页专题.pptx'
Copy-Item 'PPT/深圳智信方略工程咨询有限公司-V2026v2.1（带水印）.pptx' $outFile -Force

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = -1
$pres = $ppt.Presentations.Open((Resolve-Path $outFile).Path, $false, $false, $false)

# Duplicate slide 18 to create a second page in the section.
$null = $pres.Slides.Item(18).Duplicate()
$slide1 = $pres.Slides.Item(18)
$slide2 = $pres.Slides.Item(19)

# Keep only title and bottom proof imagery on slide 1.
for ($i = $slide1.Shapes.Count; $i -ge 1; $i--) {
  $shape = $slide1.Shapes.Item($i)
  if ($shape.Name -notin @('Title 1','Group 54','Picture 47','Picture 53')) {
    $shape.Delete()
  }
}

# Keep only the title on slide 2.
for ($i = $slide2.Shapes.Count; $i -ge 1; $i--) {
  $shape = $slide2.Shapes.Item($i)
  if ($shape.Name -ne 'Title 1') {
    $shape.Delete()
  }
}

$titleShape1 = $slide1.Shapes.Item('Title 1')
$titleShape1.TextFrame.TextRange.Text = '第三方检测服务'
Set-TextStyle $titleShape1 'Microsoft YaHei UI' 28 (Rgb 0 0 0) -1

$titleShape2 = $slide2.Shapes.Item('Title 1')
$titleShape2.TextFrame.TextRange.Text = '第三方检测服务'
Set-TextStyle $titleShape2 'Microsoft YaHei UI' 28 (Rgb 0 0 0) -1

$navy = Rgb 24 54 94
$blue = Rgb 78 165 243
$cyan = Rgb 63 205 224
$light = Rgb 240 247 255
$lighter = Rgb 248 251 255
$line = Rgb 208 223 242
$textDark = Rgb 28 52 84
$textBody = Rgb 77 94 116
$white = Rgb 255 255 255

# Slide 1 subtitle
$sub1 = Add-RoundRect $slide1 48 82 326 28 $light $line 1
$sub1.Adjustments.Item(1) = 0.12
$subText1 = Add-Textbox $slide1 62 88 300 16 '检测定位：独立第三方 · 规范实施 · 结果可追溯' 11 $textDark 0

# Slide 1 hero panel
$accentBar = Add-Rect $slide1 48 126 6 150 $cyan $cyan 0.5
$accentBar.Line.Visible = 0
$hero = Add-RoundRect $slide1 56 126 412 150 $navy $navy 1
$hero.Adjustments.Item(1) = 0.08
$heroLabel = Add-Textbox $slide1 82 144 120 16 '检测能力总览' 10 $cyan -1
$heroTitle = Add-Textbox $slide1 82 168 350 28 '构建可信、规范的第三方检测服务' 21 $white -1
$heroBody = Add-Textbox $slide1 82 206 350 52 '依托公司检验检测资质、专业测试团队与标准化实施方法，围绕信息化项目验收、安全、性能与质量保障需求，提供独立、公正、可复核的检测与测评支持。' 11.5 $white 0
$heroBody.TextFrame.MarginTop = 2

# Slide 1 cards
Add-Card $slide1 488 126 208 70 'CMA资质保障' '检测结论具备法律效力，支撑项目验收与审计留痕。' $blue
Add-Card $slide1 704 126 208 70 '专家团队协同' '测试工程师与技术专家联合实施，提升问题识别深度。' $cyan
Add-Card $slide1 488 206 208 70 '标准方法实施' '按规范开展功能、性能、安全等测试，过程留痕可追溯。' $cyan
Add-Card $slide1 704 206 208 70 '全流程交付' '覆盖方案制定、检测执行、结果分析与报告输出。' $blue

# Divider line
$line1 = $slide1.Shapes.AddLine(48, 294.5, 912, 294.5)
$line1.Line.ForeColor.RGB = $line
$line1.Line.Weight = 1.0

# Slide 1 image labels over preserved proof images.
$imgTag1 = Add-RoundRect $slide1 28 306 88 22 $navy $navy 0.5
$imgTag1.Fill.Transparency = 0.12
$imgTag1.Line.Visible = 0
Add-Textbox $slide1 42 311 60 12 '现场实施' 9.5 $white -1 | Out-Null

$imgTag2 = Add-RoundRect $slide1 247 306 92 22 $navy $navy 0.5
$imgTag2.Fill.Transparency = 0.12
$imgTag2.Line.Visible = 0
Add-Textbox $slide1 261 311 64 12 '技术支撑' 9.5 $white -1 | Out-Null

$imgTag3 = Add-RoundRect $slide1 502 306 88 22 $navy $navy 0.5
$imgTag3.Fill.Transparency = 0.12
$imgTag3.Line.Visible = 0
Add-Textbox $slide1 516 311 60 12 '资质证明' 9.5 $white -1 | Out-Null

# Slide 2 subtitle
$sub2 = Add-RoundRect $slide2 48 82 286 28 $light $line 1
$sub2.Adjustments.Item(1) = 0.12
$subText2 = Add-Textbox $slide2 62 88 260 16 '服务范围与交付机制' 11 $textDark 0

# Slide 2 left panel
$leftPanel = Add-RoundRect $slide2 48 126 500 320 $light $line 1.2
$leftPanel.Adjustments.Item(1) = 0.08
Add-Textbox $slide2 68 144 180 22 '核心服务范围' 18 $textDark -1 | Out-Null
Add-Textbox $slide2 402 148 118 14 '按项目需求组合配置' 9.5 $blue 0 | Out-Null

function Add-ServiceModule($slide, [double]$left, [double]$top, [double]$width, [double]$height, [string]$title, [string]$body, [int]$accentRgb) {
  $box = Add-RoundRect $slide $left $top $width $height $white $line 1
  $box.Adjustments.Item(1) = 0.06
  $side = Add-Rect $slide ($left + 12) ($top + 16) 4 ($height - 32) $accentRgb $accentRgb 0.5
  $side.Line.Visible = 0
  Add-Textbox $slide ($left + 24) ($top + 16) ($width - 36) 20 $title 14 $textDark -1 | Out-Null
  Add-Textbox $slide ($left + 24) ($top + 40) ($width - 36) ($height - 48) $body 10.5 $textBody 0 | Out-Null
}

Add-ServiceModule $slide2 68 176 223 102 '验收检测支撑' '信息化项目验收检测、系统符合性验证、备案与专项验收配合。' $blue
Add-ServiceModule $slide2 305 176 223 102 '安全专项检测' '漏洞扫描、风险识别、配置核查及安全类专项检测支撑。' $cyan
Add-ServiceModule $slide2 68 292 223 102 '功能性能验证' '围绕功能、性能、稳定性与兼容性开展检测与质量验证。' $cyan
Add-ServiceModule $slide2 305 292 223 102 '专项评估服务' '结合项目需求提供质量评估、问题复核与整改建议输出。' $blue

# Slide 2 right top flow panel
$flowPanel = Add-RoundRect $slide2 566 126 346 150 $navy $navy 1
$flowPanel.Adjustments.Item(1) = 0.08
Add-Textbox $slide2 588 144 150 20 '标准交付流程' 17 $white -1 | Out-Null

$steps = @(
  @('01','需求梳理'),
  @('02','方案制定'),
  @('03','检测实施'),
  @('04','复核交付')
)
$y = 176
foreach ($s in $steps) {
  $circle = $slide2.Shapes.AddShape(9, 588, $y, 28, 28)
  $circle.Fill.ForeColor.RGB = $cyan
  $circle.Line.Visible = 0
  $circle.TextFrame.TextRange.Text = $s[0]
  Set-TextStyle $circle 'Arial' 9 $navy -1
  $circle.TextFrame.TextRange.ParagraphFormat.Alignment = 2
  Add-Textbox $slide2 626 ($y + 5) 220 18 $s[1] 12 $white -1 | Out-Null
  $y += 30
}

# Slide 2 right bottom panel
$infoPanel = Add-RoundRect $slide2 566 294 346 152 $lighter $line 1.2
$infoPanel.Adjustments.Item(1) = 0.08
Add-Textbox $slide2 586 312 120 18 '典型场景' 13 $textDark -1 | Out-Null
Add-Textbox $slide2 744 312 120 18 '交付成果' 13 $textDark -1 | Out-Null
Add-BulletList $slide2 586 336 138 86 @('政务信息化项目','智慧园区/城市平台','安防与智能化系统','升级改造专项核验') 10.5 $textBody | Out-Null
Add-BulletList $slide2 744 336 138 86 @('检测方案','原始记录','问题清单','检测/测评报告') 10.5 $textBody | Out-Null
$miniLine = $slide2.Shapes.AddLine(732, 326, 732, 422)
$miniLine.Line.ForeColor.RGB = $line
$miniLine.Line.Weight = 1
Add-Textbox $slide2 586 424 286 16 '支持按项目规模定制检测范围、报告深度与沟通节奏。' 9.5 $blue 0 | Out-Null

$pres.Save()
$pres.Close()
$ppt.Quit()

# Verification: output slide texts for slides 18 and 19.
$ppt2 = New-Object -ComObject PowerPoint.Application
$pres2 = $ppt2.Presentations.Open((Resolve-Path $outFile).Path, $true, $true, $false)
Write-Output ('saved=' + (Resolve-Path $outFile).Path)
foreach ($idx in 18,19) {
  Write-Output ('SLIDE ' + $idx)
  foreach ($shape in $pres2.Slides.Item($idx).Shapes) {
    if ($shape.HasTextFrame -and $shape.TextFrame.HasText) {
      $txt = ($shape.TextFrame.TextRange.Text -replace "`r|`n", ' ').Trim()
      if ($txt) { Write-Output ('  ' + $txt) }
    }
  }
}
$pres2.Close()
$ppt2.Quit()
