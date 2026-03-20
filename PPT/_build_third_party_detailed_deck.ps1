function Set-ShapeText(
  $shape,
  [string]$text,
  [double]$fontSize = 18,
  [int]$bold = 0,
  [int]$rgb = -1,
  [int]$align = -1,
  [string]$fontName = 'Microsoft YaHei UI'
) {
  try {
    if (-not $shape.HasTextFrame) { return }
    $shape.TextFrame.TextRange.Text = $text
    $tr = $shape.TextFrame.TextRange
    $tr.Font.NameFarEast = $fontName
    $tr.Font.Name = $fontName
    $tr.Font.Size = $fontSize
    $tr.Font.Bold = $bold
    if ($rgb -ge 0) { $tr.Font.Color.RGB = $rgb }
    if ($align -ge 0) { $tr.ParagraphFormat.Alignment = $align }
  } catch {}
}

function Get-GroupItem($slide, [string]$groupName, [int]$index) {
  return $slide.Shapes.Item($groupName).GroupItems.Item($index)
}

function Set-GroupItemText(
  $slide,
  [string]$groupName,
  [int]$index,
  [string]$text,
  [double]$fontSize = 18,
  [int]$bold = 0,
  [int]$rgb = -1,
  [int]$align = -1
) {
  $shape = Get-GroupItem $slide $groupName $index
  Set-ShapeText $shape $text $fontSize $bold $rgb $align
}

$sourceFile = 'PPT/深圳智信方略工程咨询有限公司-V2026v2.1（带水印）.pptx'
$outFile = 'PPT/深圳智信方略工程咨询有限公司-第三方检测服务详细介绍-初稿.pptx'
$reviewDir = 'PPT/_tmp_detailed_review'

Copy-Item $sourceFile $outFile -Force

$ppt = $null
$pres = $null

try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $ppt.Visible = -1
  $pres = $ppt.Presentations.Open((Resolve-Path $outFile).Path, $false, $false, $false)

  $originalCount = $pres.Slides.Count

  foreach ($src in 3, 18, 15, 14, 16, 17, 15) {
    $dupRange = $pres.Slides.Item($src).Duplicate()
    $dupSlide = $dupRange.Item(1)
    $dupSlide.MoveTo($pres.Slides.Count)
  }

  for ($i = $originalCount; $i -ge 3; $i--) {
    $pres.Slides.Item($i).Delete()
  }

  $slide = $pres.Slides.Item(1)
  Set-ShapeText $slide.Shapes.Item('Title 4') '深圳智信方略工程咨询有限公司' 34 -1 -1 1
  Set-ShapeText $slide.Shapes.Item('Subtitle 8') '第三方检测服务专题汇报' 22 0 -1 1

  $slide = $pres.Slides.Item(2)
  Set-ShapeText $slide.Shapes.Item('Title 4') '第三方检测服务' 30 -1 -1 2
  Set-ShapeText $slide.Shapes.Item('Text Placeholder 24') '资质、标准、能力、流程与场景' 18 0 -1 2

  $slide = $pres.Slides.Item(3)
  Set-ShapeText $slide.Shapes.Item('Title 1') '服务定位' 28 -1 -1 1
  $positioningText = @(
    '智信方略依托工程咨询与信息化项目服务经验，面向客户与领导决策场景，提供独立、公正、可追溯的第三方检测与测评服务。'
    '围绕软件系统、机房环境、弱电智能化及专项验收需求，聚焦功能核验、性能验证、安全检查、标准符合性审查和成果留痕。'
    '通过“依据明确、过程规范、结论可信、交付完整”的服务闭环，支撑项目建设、阶段复核、竣工验收和后续审计。'
  ) -join "`r`n"
  Set-ShapeText $slide.Shapes.Item('TextBox 5') $positioningText 20 0 -1 1
  Set-ShapeText $slide.Shapes.Item('TextBox 3') '专业检测  客观公正  结果可信' 26 -1 -1 2

  $slide = $pres.Slides.Item(4)
  Set-ShapeText $slide.Shapes.Item('Title 1') '资质与核心能力' 28 -1 -1 1
  Set-ShapeText $slide.Shapes.Item('AutoShape 4') '服务理念：科学 · 规范 · 公正 · 独立' 19 -1 -1 1
  Set-ShapeText $slide.Shapes.Item('AutoShape 7') '权威资质认证' 18 -1 -1 1
  Set-ShapeText $slide.Shapes.Item('AutoShape 8') '具备 CMA 资质，检测结果可作为项目验收、成果复核与审计留痕的重要依据。' 15 0 -1 1
  Set-ShapeText $slide.Shapes.Item('AutoShape 11') '专业实施团队' 18 -1 -1 1
  Set-ShapeText $slide.Shapes.Item('AutoShape 12') '由工程师与技术人员协同实施，覆盖资料确认、测试执行、结果分析与报告复核。' 15 0 -1 1
  Set-ShapeText $slide.Shapes.Item('AutoShape 15') '标准规范执行' 18 -1 -1 1
  Set-ShapeText $slide.Shapes.Item('AutoShape 16') '依据项目测评文件及国家、行业、地方现行规范开展检测，过程可追溯。' 15 0 -1 1
  Set-ShapeText $slide.Shapes.Item('AutoShape 19') '全流程成果交付' 18 -1 -1 1
  Set-ShapeText $slide.Shapes.Item('AutoShape 20') '形成原始记录、问题清单、检测结论及正式报告，满足项目交付与管理需要。' 15 0 -1 1
  Set-GroupItemText $slide 'Group 54' 1 '适用范围' 20 -1 -1 1
  Set-GroupItemText $slide 'Group 54' 3 '软件系统：功能、性能、安全、兼容性等。' 16 0 -1 1
  Set-GroupItemText $slide 'Group 54' 5 '机房与场地：净高、温湿度、噪声、接地电阻、照明等。' 16 0 -1 1
  Set-GroupItemText $slide 'Group 54' 7 '弱电智能化：子系统功能核验、联动校验、专项验收支撑。' 16 0 -1 1

  $slide = $pres.Slides.Item(5)
  Set-ShapeText $slide.Shapes.Item('Title 1') '标准依据与评价维度' 28 -1 -1 1
  Set-GroupItemText $slide 'Group 2' 4 "软件测试规范`r`nGB/T 15532-2008" 17 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 7 "软件质量要求`r`nGB/T 25000.51-2016" 17 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 10 "代码审计规范`r`nGB/T 39412-2020" 17 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 13 "场地/数据中心规范`r`nGB/T 2887-2011`r`nGB 50174-2017" 15 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 16 "实验室能力要求`r`nGB/T 27025-2019" 17 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 19 '检测维度' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 20 '环境' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 21 '交付' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 22 '功能' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 24 '性能' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 25 '安全' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 26 '统一依据' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 27 '统一方法' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 28 '统一交付' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 29 '统一记录' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 30 '结果可信' 15 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 31 '质量可量化' 15 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 32 '交付可采信' 15 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 33 '依据可追溯' 15 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 34 '风险可识别' 15 -1 -1 2

  $slide = $pres.Slides.Item(6)
  Set-ShapeText $slide.Shapes.Item('Title 1') '检测服务矩阵' 28 -1 -1 1
  Set-ShapeText $slide.Shapes.Item('Title') '第三方检测服务矩阵' 27 -1 -1 2
  Set-GroupItemText $slide 'Group 50' 8 '性能' 20 -1 -1 2
  Set-GroupItemText $slide 'Group 50' 9 '功能' 20 -1 -1 2
  Set-GroupItemText $slide 'Group 50' 10 '安全' 20 -1 -1 2
  Set-GroupItemText $slide 'Group 50' 11 '验收' 20 -1 -1 2
  Set-GroupItemText $slide 'Group 50' 12 '代码' 20 -1 -1 2
  Set-GroupItemText $slide 'Group 50' 13 '环境' 20 -1 -1 2
  Set-GroupItemText $slide 'Group 50' 19 "范围确认`r`n资料核验`r`n成果对照" 15 0 -1 1
  Set-GroupItemText $slide 'Group 50' 20 "业务流程`r`n界面交互`r`n异常处理" 15 0 -1 1
  Set-GroupItemText $slide 'Group 50' 21 "并发承载`r`n响应时间`r`n资源占用" 15 0 -1 1
  Set-GroupItemText $slide 'Group 50' 22 "漏洞扫描`r`n配置核查`r`n风险识别" 15 0 -1 1
  Set-GroupItemText $slide 'Group 50' 23 "高危缺陷`r`n安全编码`r`n后门排查" 15 0 -1 1
  Set-GroupItemText $slide 'Group 50' 24 "温湿度`r`n噪声照明`r`n接地净高" 15 0 -1 1

  $slide = $pres.Slides.Item(7)
  Set-ShapeText $slide.Shapes.Item('Title 1') '测试流程与交付' 28 -1 -1 1
  Set-ShapeText $slide.Shapes.Item('Rounded Rectangle 2') '四阶段   三交付   一闭环' 28 -1 -1 2
  Set-ShapeText $slide.Shapes.Item('Rounded Rectangle 13') '全过程检测交付闭环' 20 -1 -1 2
  Set-ShapeText $slide.Shapes.Item('Rectangle 23') '成 果 交 付' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 1 '执行依据：项目文件、国家标准、行业规范、合同与验收要求' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 2 '需求确认' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 3 '方法确认' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 4 '执行控制' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 5 '问题闭环' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 6 '记录留痕' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 7 '报告审核' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 8 '结果交付' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 9 '准备阶段' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 10 '实施阶段' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 11 '复核交付' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 13 '资料接收' 14 0 -1 2
  Set-GroupItemText $slide 'Group 24' 14 '依据确认' 14 0 -1 2
  Set-GroupItemText $slide 'Group 24' 15 '计划安排' 14 0 -1 2
  Set-GroupItemText $slide 'Group 24' 16 '功能 / 性能测试' 15 0 -1 2
  Set-GroupItemText $slide 'Group 24' 17 '安全专项检测' 15 0 -1 2
  Set-GroupItemText $slide 'Group 24' 18 '环境与场地检测' 15 0 -1 2
  Set-GroupItemText $slide 'Group 24' 19 '结果分析复核' 15 0 -1 2
  Set-GroupItemText $slide 'Group 24' 20 '报告编制' 14 0 -1 2
  Set-GroupItemText $slide 'Group 24' 21 '整改复测' 14 0 -1 2
  Set-GroupItemText $slide 'Group 24' 22 '测试方案' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 23 '原始记录' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 24 '问题清单' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 24' 25 '检测报告' 16 -1 -1 2

  $slide = $pres.Slides.Item(8)
  Set-ShapeText $slide.Shapes.Item('Title 1') '人员与质量保障' 28 -1 -1 1
  Set-ShapeText $slide.Shapes.Item('AutoShape 4') '专业团队支撑与质量保障' 20 -1 -1 2
  Set-GroupItemText $slide 'Group 53' 3 '人员保障' 18 -1 -1 1
  Set-GroupItemText $slide 'Group 53' 4 '由工程师与测试人员协同实施，保障沟通、执行与复核衔接顺畅。' 15 0 -1 1
  Set-GroupItemText $slide 'Group 53' 7 '设备工具' 18 -1 -1 1
  Set-GroupItemText $slide 'Group 53' 8 '可配置性能测试、漏洞扫描、代码审计及环境检测工具体系。' 15 0 -1 1
  Set-GroupItemText $slide 'Group 53' 11 '标准先行' 18 -1 -1 1
  Set-GroupItemText $slide 'Group 53' 12 '检测前明确依据文件、测试范围、判定口径与交付要求。' 15 0 -1 1
  Set-GroupItemText $slide 'Group 53' 15 '过程留痕' 18 -1 -1 1
  Set-GroupItemText $slide 'Group 53' 16 '全过程记录测试过程、问题项、复核意见与结论依据。' 15 0 -1 1
  Set-GroupItemText $slide 'Group 53' 19 '复核机制' 18 -1 -1 1
  Set-GroupItemText $slide 'Group 53' 20 '检测结果经内部复核后形成正式输出，提升报告可信度。' 15 0 -1 1
  Set-GroupItemText $slide 'Group 53' 23 '响应效率' 18 -1 -1 1
  Set-GroupItemText $slide 'Group 53' 24 '围绕项目节点安排实施与交付，支持验收、汇报与整改复测。' 15 0 -1 1
  Set-ShapeText $slide.Shapes.Item('AutoShape 31') '突出人员、设备、标准、流程与结果控制，支撑项目验收与管理决策。' 16 -1 -1 1

  $slide = $pres.Slides.Item(9)
  Set-ShapeText $slide.Shapes.Item('Title 1') '适用阶段与服务价值' 28 -1 -1 1
  Set-GroupItemText $slide 'Group 2' 4 "立项阶段`r`n范围识别" 20 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 7 "建设阶段`r`n过程抽检" 20 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 10 "验收阶段`r`n结果核验" 20 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 13 "整改阶段`r`n问题复测" 20 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 16 "运维阶段`r`n质量评估" 20 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 19 '服务价值' 18 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 20 '合规支撑' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 21 '决策依据' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 22 '风险识别' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 24 '质量把关' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 25 '结果留痕' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 26 '统一依据' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 27 '统一方法' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 28 '统一交付' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 29 '统一记录' 16 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 30 '项目准备' 15 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 31 '建设实施' 15 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 32 '持续优化' 15 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 33 '审计复核' 15 -1 -1 2
  Set-GroupItemText $slide 'Group 2' 34 '成果验收' 15 -1 -1 2

  $pres.Save()
} finally {
  try { if ($pres) { $pres.Close() } } catch {}
  try { if ($ppt) { $ppt.Quit() } } catch {}
}

if (Test-Path $reviewDir) { Remove-Item $reviewDir -Recurse -Force }
New-Item -ItemType Directory -Path $reviewDir | Out-Null

$pptReview = $null
$presReview = $null

try {
  $pptReview = New-Object -ComObject PowerPoint.Application
  $presReview = $pptReview.Presentations.Open((Resolve-Path $outFile).Path, $true, $true, $false)
  foreach ($i in 1..9) {
    $presReview.Slides.Item($i).Export((Join-Path (Resolve-Path $reviewDir) ("slide-$i.png")), 'PNG', 1600, 900)
  }
} finally {
  try { if ($presReview) { $presReview.Close() } } catch {}
  try { if ($pptReview) { $pptReview.Quit() } } catch {}
}

Get-Item $outFile | Select-Object FullName, Length, LastWriteTime
Get-ChildItem $reviewDir | Select-Object Name, Length
