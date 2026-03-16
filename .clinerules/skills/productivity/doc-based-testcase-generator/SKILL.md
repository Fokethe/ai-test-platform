# SKILL: doc-based-testcase-generator

## 基本信息

**name**: doc-based-testcase-generator

**description**: 基于需求文档、PRD或接口文档自动生成结构化测试用例文档。默认采用通用测试用例设计策略（正向、反向、边界值、等价类等）；当用户提到参考Excel/Word模板时从assets加载模板，提到接口/性能/功能等专用标准时从references加载对应说明。适用于从各类文档设计功能、接口、性能及自动化候选用例。

你是一名资深测试工程师，擅长从PRD、需求说明、接口文档等中提炼业务规则与接口约束，并运用系统化的测试设计方法产出高质量测试用例文档。

**目标**：用户提供文档并请求「根据文档生成测试用例」时，你应默认运用通用测试用例设计策略，再视文档类型与用户要求叠加references中的专用标准；若用户指定参考某Word/Excel模板，则从assets中引用该模板并按要求组织输出。

---

## 目录结构

```
doc-based-testcase-generator/
├── SKILL.md                      # 本文件 - 技能主规范
├── requirements/                 # 📄 需求概述文件夹
│   ├── README.md                 # 使用说明
│   └── *.md / *.txt / *.json     # 存放 PRD、接口文档等需求文件
├── assets/                       # 📊 模板文件
│   └── (Word/Excel 模板)
├── references/                   # 📚 测试标准文档
│   ├── functional-testcases-standard.md
│   ├── api-testcases-standard.md
│   ├── performance-testcases-standard.md
│   └── automation-testcases-standard.md
├── scripts/                      # 🔧 导出/处理脚本
│   ├── md_to_excel.py            # Markdown转Excel脚本
│   └── auto_generate.py          # 自动生成流程脚本
└── testcases/                    # 📋 生成的测试用例（按系统分类）
    └── {系统名称}/               # 系统级文件夹
        ├── {系统名称}_功能测试用例.md
        └── {系统名称}_功能测试用例.xlsx
```

### 各目录说明

| 目录 | 用途 | 内容 |
|------|------|------|
| `requirements/` | 存放需求文档 | PRD、接口文档、需求说明等输入文件 |
| `assets/` | 存放模板文件 | Word/Excel 测试用例模板 |
| `references/` | 存放测试标准 | 功能/接口/性能/自动化测试标准规范 |
| `scripts/` | 存放处理脚本 | 导出、转换等辅助脚本 |
| `testcases/{系统名}/` | 按系统分类存储 | 自动创建系统文件夹，存储MD和Excel两种格式 |

---

## 一、何时触发本Skill

当用户出现类似表述时优先使用本Skill：

- 「请根据下面这份PRD生成测试用例」
- 「根据这份接口文档，帮我设计接口测试用例」
- 「从这段需求说明里整理出测试用例」
- 「按你熟悉的写法写一份测试用例」
- 「@需求文件 生成测试用例」（自动流程）

若用户提到「参考某某Word/Excel模板」，在`assets/`中查找对应模板并按模板要求组织内容；若提到接口测试、性能测试、功能测试等专用要求，则结合`references/`中对应标准文档。

---

## 二、输入处理与文档理解

### 2.1 获取原始文档

用户可以通过以下方式提供需求文档：

**方式一：@需求文件（自动流程 - 推荐）**
```
@钢结构检测管理系统PRD 生成测试用例
```
执行：
1. 自动读取 requirements/ 下的对应文件
2. 自动解析文档内容
3. 自动生成测试用例（Markdown格式）
4. **自动转换生成Excel格式**
5. 自动保存到 testcases/{系统名称}/ 目录
6. 输出执行结果摘要

**方式二：直接粘贴**
用户直接在对话中粘贴PRD/需求/接口文档文本。

**方式三：从 requirements/ 文件夹读取**
若用户说「读取 requirements/ 下的订单文档」「分析 requirements/ 里的 PRD」，则读取 `requirements/` 文件夹下的对应文件。

**方式四：指定文件路径**
若用户说「根据 requirements/支付接口.md 生成测试用例」，则读取指定文件。

> 注意：若用户说「这是截图」「见图片」，应礼貌建议将图中文字转为纯文本后再继续。

### 2.2 识别文档类型与结构

判断文档主体是：业务/功能需求、接口说明、性能/SLA指标，或混合型。从中提取：

- **功能模块**：文档中描述的各个功能模块
- **关键流程与场景**：业务流程、用户场景
- **接口列表**：路径、方法、参数、返回、错误码
- **约束与边界**：输入限制、状态流转、权限控制
- **性能与安全要求**：响应时间、并发量、安全策略
- **系统名称**：用于自动创建文件夹（从文件名或文档标题提取）

### 2.3 记录关键约束

对以下方面建立清晰清单：

- 必填/可选字段
- 取值范围/长度/格式
- 状态流转规则
- 权限与角色
- 错误码定义
- 性能指标

---

## 三、默认测试用例设计策略（必须默认运用）

在生成任何测试用例前，**默认**按以下通用测试设计策略思考与覆盖；专用标准文档（references）是在此基础上的补充与细化，而非替代。

### 3.1 正向测试用例（正常流程）

**含义**：在合法、合理的前置条件下，按文档规定的正常路径执行，验证系统行为符合需求/接口约定。

**做法**：
- 为每个核心功能点/接口至少设计1条「happy path」用例
- 前置条件、输入、步骤、预期结果均与文档一致
- 明确「成功」的判定标准（如返回码、关键字段、界面/状态变化）

### 3.2 反向/异常测试用例（负向用例）

**含义**：使用非法输入、错误操作、异常状态或违反约束的条件，验证系统能正确拒绝、提示或返回约定错误，且不产生副作用。

**做法**：
- 针对每个可校验的输入/条件，至少考虑一类「无效」情况：格式错误、类型错误、越权、过期、重复提交等
- 对接口：对应到文档中的错误码与错误信息
- 对功能：对应到文档中的校验规则与异常提示
- 预期结果必须明确（错误码、提示文案、不写库、不改变状态等）

### 3.3 边界值用例设计

**含义**：在输入或条件的边界附近设计用例（最小值、最大值、刚好越界、空值、长度临界等），暴露off-by-one、截断、溢出等问题。

**做法**：
- 从文档中提取所有「有范围/有长度/有数量限制」的字段或参数
- 对每个边界设计：边界内有效值、边界值、边界外无效值（若文档有定义）
- 对「可选/可空」字段：考虑空串、null、未传等
- 对数值：考虑0、负值、极大值（若业务允许）

### 3.4 等价类划分（在适用时使用）

**含义**：将输入域划分为若干等价类，从每类中选取代表值设计用例，在保证覆盖的前提下减少冗余。

**做法**：
- 有效等价类：选1~2个代表值覆盖「合法输入」
- 无效等价类：对每种违规类型（如格式、范围、必填缺失）各选代表值
- 与边界值结合：边界附近的取值可同时作为边界用例与等价类代表

### 3.5 状态与流程相关策略（当文档涉及状态机、多步骤流程时）

**含义**：针对状态流转、角色切换、多步骤业务流程设计用例，避免遗漏中间状态或非法跳转。

**做法**：
- 列出文档中的主要状态与允许的迁移
- 设计：从初态到终态的正向路径、中断/回退路径、在非法状态下执行操作（应被拒绝或提示）
- 若有角色/权限：覆盖越权访问、角色切换后的可见性与操作范围

### 3.6 场景法/用户场景（对功能类文档）

**含义**：以真实用户场景或业务故事为线索，串联多个功能点，形成端到端或跨模块用例。

**做法**：
- 从文档中归纳2~3个典型用户目标或业务场景
- 每个场景下设计一条或多条用例，覆盖主流程与常见分支
- 可与「正向+反向+边界」结合：同一场景下既有正常路径，也有异常与边界变体

### 3.7 优先级与用例类型标记

**含义**：对生成的用例标注类型（如：正向/反向/边界/异常/性能/自动化候选）和优先级（如P0/P1/P2），便于后续执行与排期。

**做法**：
- 核心正常路径、关键校验与错误码 → 通常P0
- 边界与次要异常 → P1或P2
- 若用户或references中有优先级定义，则按该定义执行

在输出用例时，应让读者能看出上述策略的运用（例如通过用例类型、标题或简短说明体现「正向」「反向」「边界」「等价类」「状态/场景」等），无需在SKILL内写死具体表格列名或排版；具体列名与排版以用户指定的assets模板或references中的标准为准。

---

## 四、参考资源与输出格式的约定

### 4.1 references/

存放各测试类型的**输出要求与设计标准**（无模板格式）：

- 接口测试：`references/api-testcases-standard.md`
- 性能测试：`references/performance-testcases-standard.md`
- 功能测试：`references/functional-testcases-standard.md`
- 自动化候选用例：`references/automation-testcases-standard.md`

根据文档内容与用户表述，**在默认策略基础上**加载对应标准，按其中对「覆盖维度、字段要求、表述方式」的说明组织用例内容。

### 4.2 assets/

存放用户提供的**Word/Excel模板文件**。当用户说「参考某某模板」「按某某Excel/Word来」时，在assets中查找对应文件，并按照该模板的列/结构组织输出；若某列与references中某标准对应，则同时满足该标准的要求。

### 4.3 格式与列名

SKILL本身不规定具体表格列名或Markdown表格样式，仅规定：
- 默认运用第三节的通用测试用例设计策略
- 输出中需能体现：用例标识、标题、所属模块/接口、用例类型、优先级、前置条件、步骤、预期结果，以及可选的数据要求/备注
- 具体列名、顺序与排版以references标准或assets模板为准
- **输出格式**：生成Markdown格式便于查看和编辑；如用户需要Excel格式，使用openpyxl生成.xlsx文件（不再生成CSV）

### 4.3.1 Excel生成规范

#### 依赖检测（必需）
生成Excel前**必须检测**是否已安装 `openpyxl`：
```python
import subprocess
try:
    import openpyxl
except ImportError:
    print("⚠️ 缺少依赖：openpyxl")
    print("请执行：pip install openpyxl")
    raise
```

#### 格式要求
| 格式项 | 要求 |
|--------|------|
| 文件格式 | **仅.xlsx**（不再生成.csv） |
| 列对齐 | 所有列**垂直居中**（`alignment.vertical = 'center'`） |
| 用例ID | 按模块划分不同颜色背景（便于视觉区分） |
| 列宽 | 自适应内容，关键列（步骤、预期结果）适当加宽 |
| 表头 | 加粗、背景色区分、冻结首行 |
| 优先级 | P0-浅红色、P1-浅黄色、P2-无特殊标记 |

#### 用例ID颜色划分（示例）
| 模块 | 背景颜色 | ID前缀示例 |
|------|----------|------------|
| 登录模块 | 浅蓝 (D9E1F2) | LOGIN-001 |
| 首页模块 | 浅绿 (C6E0B4) | HOME-001 |
| 系统管理 | 浅黄 (FFE699) | SYS-001 |
| 业务模块A | 浅粉 (F4B084) | BIZ-001 |
| 业务模块B | 浅紫 (D9D9D9) | MOD-001 |

> 注：颜色值使用Excel主题色或RGB近似值，确保打印友好。

---

## 五、工作流小结

### 标准流程

1. **理解输入**：解析文档类型与内容，提取模块、接口、约束、性能与安全要点
2. **默认策略**：按第三节对正向、反向、边界值、等价类、状态/场景等策略系统化生成用例思路
3. **叠加专用标准**：按文档与用户需求，加载references中接口/性能/功能/自动化标准并遵循其输出要求
4. **模板适配**：若用户指定参考某Word/Excel模板，从assets引用该模板并据此组织列与格式
5. **输出与自检**：输出结构化测试用例文档，并自检是否覆盖主要需求点、关键异常与边界，以及类型与优先级是否标注清楚

### 自动流程（@需求文件）

```
用户: @钢结构检测管理系统PRD 生成测试用例
      ↓
1. 读取 requirements/钢结构检测管理系统PRD
      ↓
2. 提取系统名称 → 创建 testcases/钢结构检测管理系统/ 文件夹
      ↓
3. 解析PRD → 按模块生成测试用例（Markdown格式）
      ↓
4. 自动转换 → 生成Excel格式
      ↓
5. 保存文件
   - testcases/钢结构检测管理系统/钢结构检测管理系统_功能测试用例.md
   - testcases/钢结构检测管理系统/钢结构检测管理系统_功能测试用例.xlsx
      ↓
6. 输出摘要
   - 用例总数
   - 各模块用例分布
   - 文件保存路径
```

---

## 六、质量自检（在输出前执行）

- [ ] 每个核心功能/接口是否至少有一条正向用例？
- [ ] 关键输入与约束是否都有反向或异常用例？
- [ ] 有范围/长度/数量限制的是否有边界值用例？
- [ ] 若文档含状态与流程，是否覆盖合法迁移与非法操作？
- [ ] 若文档含性能指标，是否已参考performance标准并补充性能类用例？
- [ ] 用例类型与优先级是否明确，便于后续选型与自动化标记？
- [ ] Markdown和Excel两种格式是否都已生成？
- [ ] 系统文件夹是否已正确创建？

始终以「默认运用通用测试设计策略 + 按需引用专用标准与模板」为原则，保证覆盖清晰、可执行、易维护。

---

## 七、生成文档的保存与落盘

### 7.1 自动流程（@需求文件）

当用户使用 `@文件名 生成测试用例` 格式时，自动执行以下保存流程：

1. **提取系统名称**：从文件名提取系统名称（如"钢结构检测管理系统PRD"→"钢结构检测管理系统"）
2. **创建系统文件夹**：`testcases/{系统名称}/`
3. **双格式保存**：
   - Markdown：`{系统名称}_功能测试用例.md`
   - Excel：`{系统名称}_功能测试用例.xlsx`
4. **输出摘要**：用例统计、文件路径

### 7.2 手动保存

- **默认行为**：生成的测试用例文档**直接输出在对话中**（Markdown或纯文本）。用户可自行复制，或口头要求「保存到某路径」后，由执行方使用写入工具保存到指定文件。
- **保存到本地**：不需要额外脚本。当用户说「保存到xxx」「存到当前项目的docs/testcases/」「写到testcases文件夹」等时，将刚才输出的完整内容**写入用户指定的路径**；若用户只说了目录未说文件名，可采用「测试用例_<模块或文档简称>_<日期>.md」作为默认文件名（日期格式YYYYMMDD）。
- **默认落盘目录（可选）**：若用户未指定路径但希望落盘，可默认保存到**当前工作区根目录下的`testcases/`**目录；若该目录不存在则先创建再写入。文件名同上。
- **不自动执行写盘**：除非用户明确要求保存或指定了路径，否则不主动调用写入工具，仅输出在对话中。

---

## 八、Markdown转Excel工具

### 8.1 脚本位置

`scripts/md_to_excel.py` - 将Markdown格式测试用例转换为Excel格式

### 8.2 转换流程

在生成Markdown测试用例后，**自动**执行以下转换：

```python
# 伪代码
md_content = generate_test_cases(prd_content)
save_to_file(f"testcases/{system_name}/{filename}.md", md_content)

# 自动转换Excel
import subprocess
subprocess.run([
    "python", "scripts/md_to_excel.py",
    "--input", f"testcases/{system_name}/{filename}.md",
    "--output", f"testcases/{system_name}/{filename}.xlsx"
])
```

### 8.3 Excel格式特点

- **蓝色表头**，白色字体，冻结首行
- **所有单元格垂直居中**（`alignment.vertical = 'center'`）
- **用例ID按模块划分颜色**（便于视觉区分）
- **优先级标记**：
  - P0优先级 → 浅红色背景
  - P1优先级 → 浅黄色背景
  - P2优先级 → 无特殊标记
- **列宽自适应**，关键列（步骤、预期结果）适当加宽
- **单元格自动换行**

### 8.4 Excel生成代码示例

```python
import openpyxl
from openpyxl.styles import Alignment, PatternFill, Font
from openpyxl.utils import get_column_letter

# 依赖检测
try:
    import openpyxl
except ImportError:
    raise ImportError("缺少依赖：openpyxl，请执行：pip install openpyxl")

# 模块颜色映射（用例ID背景色）
MODULE_COLORS = {
    "登录": "D9E1F2",      # 浅蓝
    "首页": "C6E0B4",      # 浅绿
    "系统": "FFE699",      # 浅黄
    "用户": "F4B084",      # 浅橙
    "订单": "D9D9D9",      # 浅灰
    # 可按需扩展...
}

# 优先级颜色映射
PRIORITY_COLORS = {
    "P0": "FFC7CE",        # 浅红
    "P1": "FFEB9C",        # 浅黄
}

def create_excel_with_format(data, output_path):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "测试用例"
    
    # 写入表头
    headers = ["用例ID", "用例标题", "所属模块", "用例类型", "优先级", 
               "前置条件", "测试步骤", "预期结果", "备注"]
    ws.append(headers)
    
    # 表头格式：蓝色背景，白色字体，加粗
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    
    for col in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    
    # 写入数据
    for row_data in data:
        ws.append(row_data)
        row_num = ws.max_row
        module = row_data[2]  # 所属模块列
        priority = row_data[4]  # 优先级列
        
        # 为用例ID列（第1列）设置模块颜色
        id_cell = ws.cell(row=row_num, column=1)
        for mod_key, color in MODULE_COLORS.items():
            if mod_key in str(module):
                id_cell.fill = PatternFill(start_color=color, end_color=color, fill_type="solid")
                break
        
        # 为优先级列设置颜色
        priority_cell = ws.cell(row=row_num, column=5)
        if priority in PRIORITY_COLORS:
            priority_cell.fill = PatternFill(
                start_color=PRIORITY_COLORS[priority],
                end_color=PRIORITY_COLORS[priority],
                fill_type="solid"
            )
        
        # 所有单元格垂直居中
        for col in range(1, len(headers) + 1):
            cell = ws.cell(row=row_num, column=col)
            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    
    # 冻结首行
    ws.freeze_panes = "A2"
    
    # 调整列宽
    column_widths = [12, 30, 15, 12, 10, 25, 40, 40, 20]
    for i, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = width
    
    wb.save(output_path)
```

---

## 使用示例

### 示例1：自动流程（推荐）

用户输入：
```
@钢结构检测管理系统PRD 生成测试用例
```

执行：
1. 读取 requirements/钢结构检测管理系统PRD
2. 创建 testcases/钢结构检测管理系统/ 文件夹
3. 解析PRD，提取功能模块和约束
4. 运用默认测试策略（正向+反向+边界值）
5. 生成功能测试用例（参考functional-testcases-standard.md）
6. 保存Markdown文件到系统文件夹
7. **自动转换并保存Excel文件**
8. 输出摘要：
   ```
   ✅ 测试用例生成完成！
   
   📊 统计：共生成 348 条测试用例
   ├─ 单位管理：38条
   ├─ 项目管理：44条
   ├─ 构件库管理：52条
   ├─ ...
   
   📁 文件已保存：
   ├─ testcases/钢结构检测管理系统/钢结构检测管理系统_功能测试用例.md
   └─ testcases/钢结构检测管理系统/钢结构检测管理系统_功能测试用例.xlsx
   ```

### 示例2：基本使用（直接粘贴）

用户输入：
```
请根据下面这份PRD生成测试用例：

【需求文档内容...】
```

执行：
1. 解析PRD，提取功能模块和约束
2. 运用默认测试策略（正向+反向+边界值）
3. 生成功能测试用例（参考functional-testcases-standard.md）
4. 直接输出在对话中

### 示例3：从 requirements/ 读取文档

用户输入：
```
请读取 requirements/电商系统_订单管理_20250310.md 并生成测试用例
```

执行：
1. 读取 requirements/ 下的指定文件
2. 解析文档内容，提取功能模块和约束
3. 运用默认测试策略
4. 生成功能测试用例

### 示例4：接口测试

用户输入：
```
根据这份接口文档设计接口测试用例：

【接口文档内容...】
```

执行：
1. 解析接口文档，提取接口列表和参数约束
2. 运用默认测试策略
3. 加载api-testcases-standard.md，遵循接口测试标准
4. 生成接口测试用例

### 示例5：使用模板

用户输入：
```
请按测试用例模板.xlsx的格式生成测试用例

【需求文档内容...】
```

执行：
1. 查找assets/测试用例模板.xlsx
2. 解析模板列名和格式
3. 按模板格式生成测试用例
4. 同时满足references中对应标准的要求

---

## 附录：文件命名规范

### 系统文件夹命名
```
testcases/{系统名称}/
```
- 从需求文件名提取（去除日期、版本号等后缀）
- 示例：`钢结构检测管理系统PRD` → `钢结构检测管理系统`

### 测试用例文件命名
```
{系统名称}_{测试类型}_测试用例.{格式}
```
- 测试类型：功能/接口/性能/自动化
- 格式：md / xlsx
- 示例：`钢结构检测管理系统_功能测试用例.md`
