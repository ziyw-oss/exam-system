
# 📘 项目开发进度文档（Exam Practice System）

> 更新时间：2025-04-20  
> 阶段：学生考试模块开发（阶段 1 完成）

---

## ✅ 已完成功能

### 🧪 学生考试流程（阶段 1：考试入口与设置）

#### 📍 支持两种考试模式：
- **试卷模式**：选择历年试卷（exam）
- **知识点模式**：选择模块 → 章节 → 知识点

#### 🔧 功能详情：
- 学生在 `/student/exam/start` 页面选择考试类型
- 进入 `/student/exam/setup?mode=exam` 或 `mode=keypoint` 页面配置考试设置
  - 选择试卷 或 知识点
  - 设定考试时长（分钟）
- 点击开始考试按钮后：
  - 后端创建 `exam_sessions` 记录
  - 系统生成题目列表
  - 自动跳转到 `/student/exam/doing?examId=xxx`

#### ⏱️ 新增功能点：
- 🧭 自定义考试时间（分钟）
- ♻️ 考试中断续考（自动检测未完成记录）
- 📌 显示剩余题目数量
- ✅ 自动跳转进行页 `/student/exam/doing?examId=xxx`

---

## 🗂️ 数据库更新记录

### ✅ 新增表 `exam_sessions`
- 字段包含：
  - `user_id`, `exam_id`, `keypoint_ids`, `duration_min`, `time_left`
  - `status`, `started_at`, `updated_at`, `mode`

### ✅ 插入缺失知识点
- Characteristics of relational databases
- Database normalization forms and their roles
- Definitions and use cases of data structures
- LIFO characteristics and operations (push/pop)

---

## 🌐 已实现页面路径

| 页面名称     | 路径示例 | 描述 |
|--------------|----------|------|
| 考试类型选择页 | `/student/exam/start` | 选择按试卷 or 按知识点考试 |
| 考试设置页     | `/student/exam/setup?mode=exam`<br>`/student/exam/setup?mode=keypoint` | 设置考试时间、选择题源 |
| 考试进行页     | `/student/exam/doing?examId=1` | （准备开发）作答界面 |

---

## 📌 下一阶段计划开发

### 🧪 考试进行页 `/student/exam/doing`
- 显示题目、剩余时间、题号导航
- 支持：单题答题 / 自动保存 / 暂停 / 提交

### 📊 考试分析页
- 考试结束跳转，展示：
  - 得分情况、知识点得分率
  - 错误率分析、建议复习点

---
