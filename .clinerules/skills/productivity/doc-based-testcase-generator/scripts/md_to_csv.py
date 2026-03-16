#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将Markdown格式的测试用例转换为CSV文件（可用Excel打开）
"""

import re
import csv
import os

def parse_test_cases(md_content):
    """解析Markdown内容，提取测试用例"""
    test_cases = []
    
    lines = md_content.split('\n')
    
    for line in lines:
        # 解析表格行（用例ID以TC-开头）
        if line.startswith('| TC-'):
            cells = [cell.strip() for cell in line.split('|')[1:-1]]
            if len(cells) >= 8:
                test_case = {
                    '用例ID': cells[0],
                    '需求模块/功能点': cells[1],
                    '用例标题': cells[2],
                    '用例类型': cells[3],
                    '优先级': cells[4],
                    '前置条件': cells[5].replace('<br>', '\n'),
                    '测试步骤': cells[6].replace('<br>', '\n'),
                    '预期结果': cells[7].replace('<br>', '\n')
                }
                test_cases.append(test_case)
    
    return test_cases

def create_csv(test_cases, output_file):
    """创建CSV文件"""
    headers = ['用例ID', '需求模块/功能点', '用例标题', '用例类型', '优先级', 
               '前置条件', '测试步骤', '预期结果']
    
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(test_cases)
    
    print(f"CSV文件已生成: {output_file}")
    print(f"共 {len(test_cases)} 条测试用例")
    print("提示：可直接用Excel打开此CSV文件，然后另存为.xlsx格式")

def main():
    md_file = r"f:\test\skills\productivity\doc-based-testcase-generator\testcases\钢结构检测管理系统\钢结构检测管理系统_功能测试用例.md"
    output_file = r"f:\test\skills\productivity\doc-based-testcase-generator\testcases\钢结构检测管理系统\钢结构检测管理系统_功能测试用例.csv"
    
    if not os.path.exists(md_file):
        print(f"错误: 找不到文件 {md_file}")
        return
    
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    test_cases = parse_test_cases(md_content)
    
    if not test_cases:
        print("未找到测试用例数据")
        return
    
    create_csv(test_cases, output_file)

if __name__ == "__main__":
    main()
