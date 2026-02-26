'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ListSkeleton } from '@/components/ui/skeleton-list'
import { toast } from 'sonner'
import { AlertTriangle, Check, ChevronLeft, Edit2, Download, Save, Trash2, X } from 'lucide-react'

interface TestCase {
  id: string
  title: string
  precondition: string
  steps: string[]
  expectedResult: string
  priority: '高' | '中' | '低'
  module: string
}

export default function TestCasesPreviewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const requirementId = searchParams.get('requirementId')
  const testPointId = searchParams.get('testPointId')

  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  // 加载测试用例
  const loadTestCases = useCallback(async () => {
    if (!requirementId || !testPointId) {
      setError('缺少必要参数')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/requirements/${requirementId}/generate-testcases`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testPointIds: [testPointId] }),
        }
      )

      const result = await response.json()

      if (result.code !== 0) {
        setError(result.message || '生成用例失败')
        return
      }

      setTestCases(result.data || [])
    } catch (err) {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }, [requirementId, testPointId])

  useEffect(() => {
    loadTestCases()
  }, [loadTestCases])

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(testCases.map(tc => tc.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  // 选择单个
  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  // 打开编辑对话框
  const handleEdit = (testCase: TestCase) => {
    setEditingCase({ ...testCase })
    setIsEditDialogOpen(true)
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingCase) return

    setTestCases(prev =>
      prev.map(tc => (tc.id === editingCase.id ? editingCase : tc))
    )
    setIsEditDialogOpen(false)
    setEditingCase(null)
    toast.success('修改已保存')
  }

  // 打开删除对话框
  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setIsDeleteDialogOpen(true)
  }

  // 确认删除
  const handleConfirmDelete = () => {
    if (!deletingId) return

    setTestCases(prev => prev.filter(tc => tc.id !== deletingId))
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(deletingId)
      return newSet
    })
    setIsDeleteDialogOpen(false)
    setDeletingId(null)
    toast.success('测试用例已删除')
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return
    setTestCases(prev => prev.filter(tc => !selectedIds.has(tc.id)))
    setSelectedIds(new Set())
    toast.success(`已删除 ${selectedIds.size} 个测试用例`)
  }

  // 保存所有用例
  const handleSaveAll = async () => {
    if (testCases.length === 0) {
      toast.error('没有可保存的测试用例')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/testcases/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          testCases: testCases.map(tc => ({
            ...tc,
            steps: JSON.stringify(tc.steps),
          })),
        }),
      })

      const result = await response.json()

      if (result.code !== 0) {
        toast.error(result.message || '保存失败')
        return
      }

      toast.success(`保存成功！共保存 ${result.data?.saved || testCases.length} 个测试用例`)
      router.push('/tests')
    } catch (err) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 导出 Excel
  const handleExportExcel = async () => {
    const casesToExport = selectedIds.size > 0
      ? testCases.filter(tc => selectedIds.has(tc.id))
      : testCases

    if (casesToExport.length === 0) {
      toast.error('没有可导出的测试用例')
      return
    }

    try {
      setExporting(true)
      const response = await fetch('/api/testcases/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCases: casesToExport,
          moduleName: casesToExport[0]?.module || '测试用例',
        }),
      })

      const result = await response.json()

      if (result.code !== 0) {
        toast.error(result.message || '导出失败')
        return
      }

      // 将 base64 转换为 Blob 并下载
      const byteCharacters = atob(result.data.data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`导出成功！共导出 ${casesToExport.length} 个测试用例`)
    } catch (err) {
      toast.error('导出失败')
    } finally {
      setExporting(false)
    }
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高':
        return 'bg-red-100 text-red-800 border-red-200'
      case '中':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case '低':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // 缺少参数提示
  if (!requirementId || !testPointId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <p>缺少必要参数：requirementId 和 testPointId</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 页面标题 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4 -ml-4"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <h1 className="text-3xl font-bold">测试用例预览</h1>
        <p className="text-muted-foreground mt-1">
          查看并编辑生成的测试用例，确认后保存到测试库
        </p>
      </div>

      {/* 加载状态 */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <ListSkeleton count={3} />
          </CardContent>
        </Card>
      )}

      {/* 错误提示 */}
      {error && !loading && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={loadTestCases}
            >
              重试
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 测试用例列表 */}
      {!loading && !error && (
        <>
          {/* 工具栏 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={
                    testCases.length > 0 && selectedIds.size === testCases.length
                  }
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm cursor-pointer">
                  全选 ({selectedIds.size}/{testCases.length})
                </Label>
              </div>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  批量删除 ({selectedIds.size})
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={exporting || testCases.length === 0}
              >
                {exporting ? (
                  <>
                    <div className="animate-spin mr-1 h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    导出 Excel
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                共 {testCases.length} 个测试用例
              </span>
            </div>
          </div>

          {/* 用例卡片列表 */}
          <div className="space-y-4">
            {testCases.map((testCase, index) => (
              <Card key={testCase.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(testCase.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(testCase.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold mb-2">
                            {index + 1}. {testCase.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={getPriorityColor(testCase.priority)}>
                              {testCase.priority}优先级
                            </Badge>
                            <Badge variant="outline">{testCase.module}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(testCase)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteClick(testCase.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 text-sm">
                    {/* 前置条件 */}
                    <div>
                      <span className="font-medium text-muted-foreground">前置条件：</span>
                      <span>{testCase.precondition}</span>
                    </div>
                    {/* 测试步骤 */}
                    <div>
                      <span className="font-medium text-muted-foreground">测试步骤：</span>
                      <ol className="list-decimal list-inside mt-1 space-y-1 ml-4">
                        {testCase.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                    {/* 预期结果 */}
                    <div>
                      <span className="font-medium text-muted-foreground">预期结果：</span>
                      <span className="text-green-700">{testCase.expectedResult}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 底部操作栏 */}
          {testCases.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
              <div className="container mx-auto flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  已选择 {selectedIds.size} 个用例，共 {testCases.length} 个
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    <X className="h-4 w-4 mr-1" />
                    取消
                  </Button>
                  <Button
                    onClick={handleSaveAll}
                    disabled={saving || testCases.length === 0}
                    className="min-w-[120px]"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        确认保存
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑测试用例</DialogTitle>
          </DialogHeader>
          {editingCase && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">用例标题</Label>
                <Input
                  id="title"
                  value={editingCase.title}
                  onChange={(e) =>
                    setEditingCase({ ...editingCase, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="module">所属模块</Label>
                <Input
                  id="module"
                  value={editingCase.module}
                  onChange={(e) =>
                    setEditingCase({ ...editingCase, module: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">优先级</Label>
                <Select
                  value={editingCase.priority}
                  onValueChange={(value: '高' | '中' | '低') =>
                    setEditingCase({ ...editingCase, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="高">高</SelectItem>
                    <SelectItem value="中">中</SelectItem>
                    <SelectItem value="低">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="precondition">前置条件</Label>
                <Textarea
                  id="precondition"
                  value={editingCase.precondition}
                  onChange={(e) =>
                    setEditingCase({
                      ...editingCase,
                      precondition: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="steps">测试步骤（每行一个步骤）</Label>
                <Textarea
                  id="steps"
                  value={editingCase.steps.join('\n')}
                  onChange={(e) =>
                    setEditingCase({
                      ...editingCase,
                      steps: e.target.value.split('\n').filter(Boolean),
                    })
                  }
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedResult">预期结果</Label>
                <Textarea
                  id="expectedResult"
                  value={editingCase.expectedResult}
                  onChange={(e) =>
                    setEditingCase({
                      ...editingCase,
                      expectedResult: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>
              <Check className="h-4 w-4 mr-1" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="py-4">确定要删除这个测试用例吗？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
